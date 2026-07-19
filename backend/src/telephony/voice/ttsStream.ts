/**
 * Sarvam streaming TTS over WebSocket — the low-latency replacement for the REST
 * TTS framer.
 *
 *   wss://api.sarvam.ai/text-to-speech/ws?model=bulbul:v2&send_completion_event=true
 *   header: api-subscription-key
 *
 * Client → server:
 *   { type: "config", data: { speaker, target_language_code, pace,
 *                             output_audio_codec: "pcm", speech_sample_rate: 8000,
 *                             min_buffer_size, max_chunk_length } }
 *   { type: "text",  data: { text } }
 *   { type: "flush" }            force synthesis of whatever is buffered
 *   { type: "ping"  }            keep-alive (server closes after ~60s idle)
 * Server → client:
 *   { type: "audio", data: { audio: <base64> } }
 *   { type: "events", data: { event_type: "final" } }   (completion signal)
 *
 * WHY THIS EXISTS: the REST endpoint synthesizes the whole sentence before
 * returning a single byte, so every turn paid full synthesis time as dead air.
 * Here the first ~20ms frame goes out to the caller as soon as it is generated.
 *
 * Barge-in: Sarvam has no in-band cancel message. The caller (engine) abandons
 * the iterator on a turn change, which closes the socket and discards in-flight
 * audio — matching Sarvam's documented barge-in recipe.
 */

import { WebSocket, type RawData } from 'ws';
import type { PcmChunk } from '../types.js';
import { stripWavHeader } from './tts.js';

const SARVAM_TTS_WSS = 'wss://api.sarvam.ai/text-to-speech/ws';

/** 20 ms of 8 kHz / 16-bit / mono = 160 samples = 320 bytes. */
const FRAME_BYTES = 320;

/** Give up on a silent socket rather than hanging a turn forever. */
const FIRST_AUDIO_TIMEOUT_MS = 8000;
const IDLE_TIMEOUT_MS = 3000;

const LANG_MAP: Record<string, string> = {
  mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN', gu: 'gu-IN', pa: 'pa-IN',
  ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN',
};

export interface TtsStreamOptions {
  apiKey?: string;
  model?: string;
  speaker?: string;
  /** 0.3–3.0 on bulbul:v2. Slightly under 1 reads more naturally on a phone. */
  pace?: number;
  /**
   * Characters buffered before synthesis starts. Small = lower time-to-first-
   * audio, which is the whole point on a live call.
   */
  minBufferSize?: number;
}

export class SarvamTtsStream {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly speaker: string;
  private readonly pace: number;
  private readonly minBufferSize: number;

  constructor(private readonly language = 'mr', opts: TtsStreamOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.SARVAM_API_KEY ?? '';
    this.model = opts.model ?? process.env.SARVAM_TTS_MODEL ?? 'bulbul:v2';
    this.speaker = opts.speaker ?? process.env.SARVAM_TTS_SPEAKER ?? 'anushka';
    this.pace = opts.pace ?? Number(process.env.SARVAM_TTS_PACE ?? 0.95);
    this.minBufferSize = opts.minBufferSize ?? 20;
  }

  /**
   * Synthesize `text`, yielding 20 ms PCM frames as they arrive. One socket per
   * utterance: abandoning the iterator (barge-in) closes it and stops billing
   * for audio nobody will hear.
   */
  async *stream(text: string): AsyncIterable<PcmChunk> {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!this.apiKey) throw new Error('[sarvam-tts] SARVAM_API_KEY not set');

    const langCode = LANG_MAP[this.language] ?? 'mr-IN';
    const url =
      `${SARVAM_TTS_WSS}?model=${encodeURIComponent(this.model)}&send_completion_event=true`;
    const ws = new WebSocket(url, { headers: { 'api-subscription-key': this.apiKey } });

    // Bridge event-driven socket → async iterator.
    const queue: Buffer[] = [];
    let done = false;
    let failure: Error | null = null;
    let wake: (() => void) | null = null;
    const signal = () => {
      const w = wake;
      wake = null;
      w?.();
    };
    const nextEvent = () =>
      new Promise<void>((resolve) => {
        wake = resolve;
      });

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'config',
          data: {
            speaker: this.speaker,
            target_language_code: langCode,
            pace: this.pace,
            // Raw LINEAR16 at telephony rate — exactly what Plivo expects, so
            // there is no decode/resample step between Sarvam and the caller.
            output_audio_codec: 'pcm',
            speech_sample_rate: 8000,
            min_buffer_size: this.minBufferSize,
            max_chunk_length: 200,
            enable_preprocessing: true,
          },
        }),
      );
      ws.send(JSON.stringify({ type: 'text', data: { text: trimmed } }));
      // We already have the full sentence, so flush immediately instead of
      // waiting for min_buffer_size to fill.
      ws.send(JSON.stringify({ type: 'flush' }));
    });

    ws.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          data?: Record<string, unknown>;
        };
        if (msg.type === 'audio') {
          const b64 = String(msg.data?.audio ?? '');
          if (b64) queue.push(Buffer.from(b64, 'base64'));
        } else if (msg.type === 'events') {
          if (String(msg.data?.event_type ?? '') === 'final') done = true;
        } else if (msg.type === 'error') {
          failure = new Error(
            `[sarvam-tts] ${String(msg.data?.error ?? msg.data?.message ?? raw.toString())}`,
          );
          done = true;
        }
      } catch {
        /* non-JSON keep-alive — ignore */
      }
      signal();
    });

    ws.on('error', (err: Error) => {
      failure = err;
      done = true;
      signal();
    });
    ws.on('close', () => {
      done = true;
      signal();
    });

    // Leftover bytes between messages so we always emit exact 20 ms frames.
    // Annotated as plain `Buffer`: Buffer.alloc() would pin this to
    // Buffer<ArrayBuffer>, which then rejects the Buffer<ArrayBufferLike> that
    // concat/subarray return.
    let carry: Buffer = Buffer.alloc(0);
    let sawAudio = false;

    try {
      for (;;) {
        if (queue.length === 0) {
          if (done) break;
          const timeoutMs = sawAudio ? IDLE_TIMEOUT_MS : FIRST_AUDIO_TIMEOUT_MS;
          let timer: NodeJS.Timeout | undefined;
          const timeout = new Promise<void>((resolve) => {
            timer = setTimeout(resolve, timeoutMs);
          });
          await Promise.race([nextEvent(), timeout]);
          if (timer) clearTimeout(timer);
          if (queue.length === 0 && !done) break; // stalled — don't hang the call
          continue;
        }

        const chunk = queue.shift()!;
        sawAudio = true;
        // 'pcm' should be headerless, but tolerate a WAV wrapper defensively.
        const pcm = stripWavHeader(chunk);
        carry = carry.length ? Buffer.concat([carry, pcm]) : pcm;
        while (carry.length >= FRAME_BYTES) {
          yield carry.subarray(0, FRAME_BYTES);
          carry = carry.subarray(FRAME_BYTES);
        }
      }

      if (failure) throw failure;
      // Flush a trailing partial frame so the last syllable isn't clipped.
      if (carry.length) yield carry;
    } finally {
      // Runs on normal completion AND when the engine abandons us for barge-in.
      try {
        ws.close(1000, 'tts_done');
      } catch {
        /* already closed */
      }
    }
  }
}
