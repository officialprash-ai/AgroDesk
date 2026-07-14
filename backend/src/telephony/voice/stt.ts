/**
 * Sarvam streaming STT over WebSocket (the new real-time piece).
 *
 *   wss://api.sarvam.ai/speech-to-text/ws
 *     ?language-code=mr-IN&model=saaras:v3&mode=transcribe
 *     &sample_rate=8000            <-- 8k ONLY via connection param
 *     &input_audio_codec=pcm_s16le <-- we stream raw L16, not wav
 *     &vad_signals=true            <-- START_SPEECH / END_SPEECH for barge-in
 *   header: Api-Subscription-Key
 *
 * Client → server audio frame: { audio: { data: <base64 pcm> } }
 * Client → server flush:        { type: "flush" }
 * Server → client:
 *   { type: "data",   data: { transcript, ... } }
 *   { type: "events", data: { signal_type: "START_SPEECH" | "END_SPEECH" } }
 *   { type: "error",  data: { error, code } }
 */

import { WebSocket, type RawData } from 'ws';
import type { PcmChunk } from '../types.js';

const SARVAM_STT_WSS = 'wss://api.sarvam.ai/speech-to-text/ws';
const WS_OPEN = 1;

export interface SttOptions {
  apiKey?: string;
  language?: string; // BCP-47, e.g. mr-IN
  model?: string; // saaras:v3 | saarika:v2.5
}

export interface SttCallbacks {
  onTranscript: (text: string, meta: { languageCode?: string }) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (err: Error) => void;
}

export class SarvamSttSession {
  private ws: WebSocket | null = null;
  private ready = false;
  private queue: string[] = [];
  private closed = false;
  private readonly apiKey: string;
  private readonly language: string;
  private readonly model: string;

  constructor(opts: SttOptions, private readonly cb: SttCallbacks) {
    this.apiKey = opts.apiKey ?? process.env.SARVAM_API_KEY ?? '';
    this.language = opts.language ?? 'mr-IN';
    this.model = opts.model ?? 'saaras:v3';
  }

  start(): Promise<void> {
    if (!this.apiKey) return Promise.reject(new Error('[sarvam-stt] SARVAM_API_KEY not set'));
    const params = new URLSearchParams({
      'language-code': this.language,
      model: this.model,
      mode: 'transcribe',
      sample_rate: '8000',
      input_audio_codec: 'pcm_s16le',
      vad_signals: 'true',
    });
    const url = `${SARVAM_STT_WSS}?${params.toString()}`;
    this.ws = new WebSocket(url, { headers: { 'Api-Subscription-Key': this.apiKey } });

    return new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      ws.on('open', () => {
        this.ready = true;
        for (const frame of this.queue) ws.send(frame);
        this.queue = [];
        resolve();
      });
      ws.on('message', (raw: RawData) => this.onMessage(raw));
      ws.on('error', (err: Error) => {
        this.cb.onError?.(err);
        if (!this.ready) reject(err);
      });
      ws.on('close', () => {
        this.ready = false;
      });
    });
  }

  pushAudio(chunk: PcmChunk): void {
    if (this.closed) return;
    const frame = JSON.stringify({ audio: { data: chunk.toString('base64') } });
    if (this.ready && this.ws) this.ws.send(frame);
    else this.queue.push(frame);
  }

  flush(): void {
    if (this.ready && this.ws && this.ws.readyState === WS_OPEN) {
      this.ws.send(JSON.stringify({ type: 'flush' }));
    }
  }

  async stop(): Promise<void> {
    this.closed = true;
    try {
      this.flush();
      this.ws?.close(1000, 'stt_stop');
    } catch {
      /* noop */
    }
  }

  private onMessage(raw: RawData): void {
    let msg: { type?: string; data?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      this.cb.onError?.(err as Error);
      return;
    }
    switch (msg.type) {
      case 'data': {
        const transcript = String(msg.data?.transcript ?? '').trim();
        if (transcript) {
          this.cb.onTranscript(transcript, {
            languageCode: msg.data?.language_code as string | undefined,
          });
        }
        break;
      }
      case 'events': {
        const signal = String(msg.data?.signal_type ?? '');
        if (signal === 'START_SPEECH') this.cb.onSpeechStart?.();
        else if (signal === 'END_SPEECH') this.cb.onSpeechEnd?.();
        break;
      }
      case 'error':
        this.cb.onError?.(new Error(`[sarvam-stt] ${String(msg.data?.error ?? 'error')}`));
        break;
      default:
        break;
    }
  }
}
