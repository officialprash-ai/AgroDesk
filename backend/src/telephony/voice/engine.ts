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
import { GeminiVoiceResponder, type Responder } from './responder.js';

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
    this.responder = opts.responder ?? new GeminiVoiceResponder();
    this.stt = new SarvamSttSession(
      { language: sttLang },
      {
        onTranscript: (text) => void this.onUserUtterance(text),
        onSpeechStart: () => this.onBargeInDetected(),
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
    // 1. Greet FIRST so the caller always hears the agent on pickup — even before
    //    STT is up and even if STT is unavailable. Falls back to a default line
    //    when no greeting arrived via call metadata.
    const greeting = this.greeting.trim() || defaultGreeting(this.shortLang);
    const myTurn = ++this.turnToken;
    this.speaking = true;
    try {
      await this.speak(greeting, myTurn);
    } catch (err) {
      this.log.error('[voice-engine] greeting failed', err);
    } finally {
      if (myTurn === this.turnToken) this.speaking = false;
    }

    // 2. STT is best-effort. A Sarvam error (e.g. 403) must NOT crash the process
    //    or drop the call — log it and keep the line open with the greeting.
    try {
      await this.stt.start();
    } catch (err) {
      this.log.error('[voice-engine] STT unavailable — continuing without live transcription', err);
    }
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
    for await (const pcm of this.tts.stream(sentence)) {
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
