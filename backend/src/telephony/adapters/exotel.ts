/**
 * ExotelAdapter — FALLBACK provider (STREAMING STUB).
 *
 * Note: your existing lib/exotel.ts handles the current one-way flow (TTS →
 * <Play> audio URL → hangup). THIS adapter is the future bidirectional-streaming
 * path (Voicebot Applet + Voice Streaming), interface-complete but not yet
 * production-hardened. Activate only if Plivo shows coverage/quality gaps.
 *
 * Exotel media frames are base64 L16/8k/mono — same wire audio as Plivo — so no
 * transcoding here. Verify stream_sid / media frame shapes on activation.
 */

import type {
  CallHandle,
  CallSession,
  InitiateCallParams,
  PcmChunk,
  TelephonyEvent,
  TelephonyEventHandler,
  TelephonyProvider,
  TelephonyWebSocket,
} from '../types.js';
import { CANONICAL_FORMAT } from '../types.js';

const WS_OPEN = 1;

export interface ExotelConfig {
  sid?: string;
  apiKey?: string;
  apiToken?: string;
  subdomain?: string;
  fromNumber?: string;
}

export class ExotelAdapter implements TelephonyProvider {
  readonly name = 'exotel' as const;
  constructor(private readonly cfg: ExotelConfig) {}

  async initiateCall(_params: InitiateCallParams): Promise<CallHandle> {
    throw new Error(
      '[exotel] streaming initiateCall not implemented — this adapter is a fallback stub. ' +
        'Use TELEPHONY_PROVIDER=plivo, or the existing lib/exotel.ts one-way flow.',
    );
  }

  buildAnswerResponse(streamWssUrl: string): string {
    // Exotel Voicebot applet is configured in the dashboard, not returned as XML.
    return JSON.stringify({ voicebot: { url: streamWssUrl, format: CANONICAL_FORMAT } });
  }

  handleStream(ws: TelephonyWebSocket, ctx?: { callId?: string }): CallSession {
    return new ExotelCallSession(ws, ctx?.callId ?? '');
  }

  async hangupCall(_callId: string): Promise<void> {
    return; // stub
  }
}

class ExotelCallSession implements CallSession {
  readonly provider = 'exotel' as const;
  private handlers: TelephonyEventHandler[] = [];
  private streamSid = '';

  constructor(private readonly ws: TelephonyWebSocket, public callId: string) {
    ws.on('message', (data) => this.onMessage(data));
    ws.on('close', () => this.emit({ type: 'call.stopped', callId: this.callId, reason: 'ws_close' }));
    ws.on('error', (err) => this.emit({ type: 'error', callId: this.callId, error: err }));
  }

  on(handler: TelephonyEventHandler): void {
    this.handlers.push(handler);
  }

  sendAudioChunk(chunk: PcmChunk): void {
    if (this.ws.readyState !== WS_OPEN) return;
    this.ws.send(
      JSON.stringify({ event: 'media', stream_sid: this.streamSid, media: { payload: chunk.toString('base64') } }),
    );
  }

  clearAudio(): void {
    if (this.ws.readyState !== WS_OPEN) return;
    this.ws.send(JSON.stringify({ event: 'clear', stream_sid: this.streamSid }));
  }

  async close(): Promise<void> {
    try {
      this.ws.close(1000, 'session_closed');
    } catch {
      /* noop */
    }
  }

  private emit(event: TelephonyEvent): void {
    for (const h of this.handlers) h(event);
  }

  private onMessage(data: unknown): void {
    let msg: Record<string, unknown>;
    try {
      const raw =
        typeof data === 'string'
          ? data
          : data instanceof Buffer
            ? data.toString('utf8')
            : String(data);
      msg = JSON.parse(raw);
    } catch (err) {
      this.emit({ type: 'error', callId: this.callId, error: err as Error });
      return;
    }
    switch (msg.event) {
      case 'connected':
        break;
      case 'start': {
        const start = (msg.start ?? {}) as Record<string, unknown>;
        this.streamSid = String(msg.stream_sid ?? start.stream_sid ?? '');
        this.callId = String(start.call_sid ?? start.callSid ?? this.callId);
        this.emit({
          type: 'call.started',
          callId: this.callId,
          streamId: this.streamSid,
          format: CANONICAL_FORMAT,
          metadata: {},
        });
        break;
      }
      case 'media': {
        const media = (msg.media ?? {}) as Record<string, unknown>;
        const payload = String(media.payload ?? '');
        if (payload) this.emit({ type: 'audio.received', callId: this.callId, chunk: Buffer.from(payload, 'base64') });
        break;
      }
      case 'stop':
        this.emit({ type: 'call.stopped', callId: this.callId, reason: 'provider_stop' });
        break;
      default:
        break;
    }
  }
}
