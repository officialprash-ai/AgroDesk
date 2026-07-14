/**
 * Telephony abstraction — canonical types.
 *
 * Everything internal speaks raw PCM `Buffer` (16-bit LE, 8 kHz, mono). Each
 * adapter owns base64 + provider WebSocket framing. Plivo, Exotel, and Sarvam
 * all agree on L16/8k/mono, so there is no transcoding anywhere.
 */

export type PcmChunk = Buffer;

export interface AudioFormat {
  encoding: 'pcm_s16le';
  sampleRate: 8000;
  channels: 1;
}

export const CANONICAL_FORMAT: AudioFormat = {
  encoding: 'pcm_s16le',
  sampleRate: 8000,
  channels: 1,
};

export type TelephonyProviderName = 'plivo' | 'exotel';

export interface InitiateCallParams {
  to: string; // E.164, e.g. +9198XXXXXXXX
  from: string; // provider caller ID
  answerStreamUrl: string; // wss bridge endpoint
  metadata?: Record<string, string>; // dealerId, contactId, etc.
}

export interface CallHandle {
  callId: string;
  provider: TelephonyProviderName;
}

export type TelephonyEvent =
  | {
      type: 'call.started';
      callId: string;
      streamId: string;
      format: AudioFormat;
      metadata: Record<string, string>;
    }
  | { type: 'audio.received'; callId: string; chunk: PcmChunk; sequence?: number }
  | { type: 'dtmf'; callId: string; digit: string }
  | { type: 'call.stopped'; callId: string; reason?: string }
  | { type: 'error'; callId?: string; error: Error };

export type TelephonyEventHandler = (event: TelephonyEvent) => void;

export interface CallSession {
  readonly callId: string;
  readonly provider: TelephonyProviderName;
  on(handler: TelephonyEventHandler): void;
  sendAudioChunk(chunk: PcmChunk): void;
  clearAudio(): void;
  close(reason?: string): Promise<void>;
}

export interface TelephonyProvider {
  readonly name: TelephonyProviderName;
  initiateCall(params: InitiateCallParams): Promise<CallHandle>;
  buildAnswerResponse(streamWssUrl: string, params?: Record<string, string>): string;
  handleStream(ws: TelephonyWebSocket, ctx?: { callId?: string }): CallSession;
  hangupCall(callId: string): Promise<void>;
}

/** Structural WS type — matches the `ws` package without importing it here. */
export interface TelephonyWebSocket {
  on(event: 'message', cb: (data: unknown) => void): void;
  on(event: 'close', cb: (code?: number, reason?: unknown) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}
