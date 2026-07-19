/**
 * AgroDesk voice engine — orchestrates Sarvam STT → Gemini → Sarvam TTS for one
 * call and implements the provider-agnostic VoiceEngine the bridge drives.
 *
 * Barge-in: Sarvam VAD START_SPEECH (or a fresh transcript) aborts the in-flight
 * reply — bump a turn token, stop emitting TTS frames, fire onBargeIn so the
 * telephony adapter flushes provider-side playback.
 */

import type { AudioFormat, PcmChunk } from '../types.js';
import type { VoiceEngine } from '../bridge.js';
import { SarvamSttSession } from './stt.js';
import { SarvamTtsFramer } from './tts.js';
import { GeminiVoiceResponder, buildVoiceSystemPrompt, type Responder } from './responder.js';

const LANG_NAMES: Record<string, string> = {
  mr: 'Marathi', hi: 'Hindi', en: 'English', gu: 'Gujarati', pa: 'Punjabi',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali',
};

export interface EngineOptions {
  callId: string;
  metadata: Record<string, string>;
  /** BCP-47-ish short code for Sarvam TTS ('mr') and STT ('mr-IN' derived). */
  language?: string;
  /**
   * Opening line the agent speaks the moment the call connects (outbound calls).
   * Without it the agent stays silent until the callee speaks first, which feels
   * broken on an outbound cold call. Leave empty for inbound calls.
   */
  greeting?: string;
  responder?: Responder;
  logger?: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

const SENTENCE_END = /[।.!?]\s|[।.!?]$/;

/**
 * Strip anything that shouldn't be spoken aloud: bracketed stage directions and
 * placeholders like [रुका], [pause], [Customer Name], [Your Name], and collapse
 * whitespace/newlines. Without this the TTS literally reads "रुका" etc.
 */
function sanitizeForSpeech(text: string): string {
  return text
    .replace(/[[（(]\s*(रुका|रुकें|pause|थांबा|अगर.*?|if.*?|customer name|your name)\s*[\])）]/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ') // any remaining [ ... ] directions/placeholders
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([।.,!?])/g, '$1')
    .trim();
}

/** Split text into sentence-sized chunks so the first chunk can play immediately. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Localized opening line spoken on pickup when no greeting was passed in metadata. */
function defaultGreeting(shortLang: string): string {
  const lang = shortLang.split('-')[0];
  const greetings: Record<string, string> = {
    mr: 'नमस्कार! ॲग्रोडेस्क कडून बोलतोय. तुम्हाला ट्रॅक्टरबद्दल माहिती हवी आहे का?',
    hi: 'नमस्ते! मैं ॲग्रोडेस्क से बोल रहा हूँ। क्या आपको ट्रैक्टर के बारे में जानकारी चाहिए?',
    en: 'Hello! This is AgroDesk calling. Would you like information about our tractors?',
  };
  return greetings[lang] ?? greetings.mr;
}

export class AgroDeskVoiceEngine implements VoiceEngine {
  private readonly stt: SarvamSttSession;
  private readonly tts: SarvamTtsFramer;
  private readonly responder: Responder;
  private readonly log: NonNullable<EngineOptions['logger']>;
  private readonly greeting: string;
  private readonly shortLang: string;

  private replyAudioCb: (pcm: PcmChunk) => void = () => {};
  private bargeInCb: () => void = () => {};
  private turnToken = 0;
  private speaking = false;

  constructor(opts: EngineOptions) {
    const shortLang = opts.language ?? 'mr';
    const sttLang = shortLang.includes('-') ? shortLang : `${shortLang}-IN`;
    this.shortLang = shortLang;
    this.log = opts.logger ?? console;
    this.greeting = opts.greeting ?? '';
    this.tts = new SarvamTtsFramer(shortLang);
    // Build a personalized, conversational brain from the call metadata so the
    // agent reacts to the caller instead of reciting. The opener/script is passed
    // as the call goal so replies stay on-message but natural.
    const md = opts.metadata ?? {};
    const system = buildVoiceSystemPrompt({
      langName: LANG_NAMES[shortLang.split('-')[0]] ?? 'Marathi',
      dealerName: md.dealerName,
      dealerCity: md.dealerCity,
      contactName: md.contactName,
      goal: md.greeting || this.greeting,
    });
    this.responder = opts.responder ?? new GeminiVoiceResponder(system);
    this.stt = new SarvamSttSession(
      { language: sttLang },
      {
        onTranscript: (text) => void this.onUserUtterance(text),
        onSpeechStart: () => {
          this.log.info('[voice-engine] caller speech started');
          this.onBargeInDetected();
        },
        // CRITICAL: when the caller stops talking Sarvam holds the utterance open
        // until it is flushed. Without this the transcript never arrives, so the
        // agent finishes its opener and then stays silent forever.
        onSpeechEnd: () => {
          this.log.info('[voice-engine] caller speech ended — flushing for transcript');
          this.stt.flush();
        },
        onError: (err) => this.log.error('[voice-engine] stt', err),
      },
    );
  }

  onReplyAudio(cb: (pcm: PcmChunk) => void): void {
    this.replyAudioCb = cb;
  }
  onBargeIn(cb: () => void): void {
    this.bargeInCb = cb;
  }

  async start(_format: AudioFormat): Promise<void> {
    // 0. Bring STT up IN PARALLEL with the greeting. It used to start only after
    //    the opener finished, so anything the caller said during or right after
    //    the greeting was dropped and the agent appeared deaf. Best-effort: a
    //    Sarvam failure must not drop the call, so it is logged, never thrown.
    const sttReady = this.stt
      .start()
      .then(() => this.log.info('[voice-engine] STT connected'))
      .catch((err) =>
        this.log.error('[voice-engine] STT unavailable — continuing without live transcription', err),
      );

    // 1. Greet so the caller always hears the agent on pickup. Falls back to a
    //    default line when no greeting arrived via call metadata.
    const fullGreeting = this.greeting.trim() || defaultGreeting(this.shortLang);
    // Speak only a SHORT opener (first 1-2 sentences) so the call starts as a
    // conversation, not a monologue. The rest of the script is context the brain
    // uses to steer replies naturally.
    const openerSentences = splitSentences(sanitizeForSpeech(fullGreeting)).slice(0, 2);
    const opener = openerSentences.join(' ');
    const myTurn = ++this.turnToken;
    this.speaking = true;
    try {
      // Speak sentence-by-sentence so the first words play in ~1s.
      for (const sentence of openerSentences) {
        if (myTurn !== this.turnToken) break;
        if (!(await this.speak(sentence, myTurn))) break;
      }
      // Let the brain know what it just said, for coherent follow-ups.
      this.responder.seedAssistant?.(opener);
    } catch (err) {
      this.log.error('[voice-engine] greeting failed', err);
    } finally {
      if (myTurn === this.turnToken) this.speaking = false;
    }

    // 2. Opener done — make sure the STT handshake settled before we sit waiting
    //    on the caller. Already non-fatal via the .catch() above.
    await sttReady;
    this.log.info('[voice-engine] listening for caller');
  }

  handleCallerAudio(chunk: PcmChunk): void {
    this.stt.pushAudio(chunk);
  }

  async stop(): Promise<void> {
    this.turnToken++;
    this.speaking = false;
    await this.stt.stop();
  }

  private onBargeInDetected(): void {
    if (!this.speaking) return;
    this.turnToken++;
    this.speaking = false;
    this.bargeInCb();
  }

  private async onUserUtterance(text: string): Promise<void> {
    if (this.speaking) this.onBargeInDetected();
    const myTurn = ++this.turnToken;
    this.speaking = true;
    this.log.info('[voice-engine] user:', text);

    try {
      let buffer = '';
      for await (const delta of this.responder.respond(text)) {
        if (myTurn !== this.turnToken) return;
        buffer += delta;
        let match: RegExpMatchArray | null;
        while ((match = buffer.match(SENTENCE_END))) {
          const idx = (match.index ?? 0) + match[0].length;
          const sentence = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx);
          if (sentence && !(await this.speak(sentence, myTurn))) return;
        }
      }
      if (buffer.trim() && myTurn === this.turnToken) await this.speak(buffer.trim(), myTurn);
    } catch (err) {
      this.log.error('[voice-engine] turn failed', err);
    } finally {
      if (myTurn === this.turnToken) this.speaking = false;
    }
  }

  private async speak(sentence: string, myTurn: number): Promise<boolean> {
    const clean = sanitizeForSpeech(sentence);
    if (!clean) return true; // nothing speakable (e.g. was only a [direction])
    for await (const pcm of this.tts.stream(clean)) {
      if (myTurn !== this.turnToken) return false;
      this.replyAudioCb(pcm);
    }
    return true;
  }
}

export function createAgroDeskEngine(
  ctx: { callId: string; metadata: Record<string, string> },
  overrides: Partial<EngineOptions> = {},
): VoiceEngine {
  return new AgroDeskVoiceEngine({ ...ctx, ...overrides });
}
