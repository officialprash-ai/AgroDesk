/**
 * PlivoAdapter — PRIMARY telephony provider.
 * Plivo Voice API + Audio Streaming (bidirectional WSS, audio/x-l16;rate=8000).
 *
 *   inbound  start : { event:'start',  start:{ streamId, callId, ... } }
 *   inbound  media : { event:'media',  media:{ payload:<base64 L16> } }
 *   inbound  stop  : { event:'stop' }
 *   outbound play  : { event:'playAudio', media:{ contentType, sampleRate, payload } }
 *   outbound clear : { event:'clearAudio' }
 *
 * Key names are parsed defensively; verify against Plivo Audio Streaming docs
 * for your account region before production.
 */

import Plivo from 'plivo';
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

const PlivoClient = Plivo.Client;
const WS_OPEN = 1;

export interface PlivoConfig {
  authId: string;
  authToken: string;
  fromNumber: string;
  keepCallAlive?: boolean;
  bidirectional?: boolean;
}

export class PlivoAdapter implements TelephonyProvider {
  readonly name = 'plivo' as const;
  private readonly client: InstanceType<typeof PlivoClient>;
  private readonly keepCallAlive: boolean;
  private readonly bidirectional: boolean;

  constructor(private readonly cfg: PlivoConfig) {
    this.client = new PlivoClient(cfg.authId, cfg.authToken);
    this.keepCallAlive = cfg.keepCallAlive ?? true;
    this.bidirectional = cfg.bidirectional ?? true;
  }

  async initiateCall(params: InitiateCallParams): Promise<CallHandle> {
    const answerUrl = params.answerStreamUrl
      .replace(/^wss:/, 'https:')
      .replace(/^ws:/, 'http:');
    const resp = await this.client.calls.create(
      params.from || this.cfg.fromNumber,
      params.to,
      answerUrl,
      { answerMethod: 'POST' },
    );
    const callId =
      (resp as { requestUuid?: string; request_uuid?: string }).requestUuid ??
      (resp as { request_uuid?: string }).request_uuid ??
      '';
    return { callId, provider: this.name };
  }

  buildAnswerResponse(streamWssUrl: string, params?: Record<string, string>): string {
    const attrs: Record<string, string> = {
      bidirectional: String(this.bidirectional),
      keepCallAlive: String(this.keepCallAlive),
      contentType: 'audio/x-l16;rate=8000',
      streamTimeout: '86400',
      audioTrack: 'inbound',
    };
    const extra = params
      ? Object.entries(params)
          .map(([k, v]) => ` extraParam_${escapeXml(k)}="${escapeXml(v)}"`)
          .join('')
      : '';
    const attrString = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeXml(v)}"`)
      .join(' ');
    // Plivo does not reliably echo extraParams back on the media stream, so we
    // ALSO append them to the WebSocket URL as a query string. The bridge reads
    // them from the WS upgrade request — this is the reliable transport for the
    // per-call greeting/script/language.
    let urlWithParams = streamWssUrl;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) urlWithParams += (streamWssUrl.includes('?') ? '&' : '?') + qs;
    }
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response><Stream ${attrString}${extra}>${escapeXml(urlWithParams)}</Stream></Response>`
    );
  }

  handleStream(ws: TelephonyWebSocket, ctx?: { callId?: string }): CallSession {
    return new PlivoCallSession(ws, ctx?.callId ?? '');
  }

  async hangupCall(callId: string): Promise<void> {
    if (!callId) return;
    await this.client.calls.hangup(callId);
  }
}

class PlivoCallSession implements CallSession {
  readonly provider = 'plivo' as const;
  private handlers: TelephonyEventHandler[] = [];

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
      JSON.stringify({
        event: 'playAudio',
        media: { contentType: 'audio/x-l16', sampleRate: '8000', payload: chunk.toString('base64') },
      }),
    );
  }

  clearAudio(): void {
    if (this.ws.readyState !== WS_OPEN) return;
    this.ws.send(JSON.stringify({ event: 'clearAudio' }));
  }

  async close(): Promise<void> {
    try {
      this.ws.close(1000, 'session_closed');
    } catch {
      /* already closing */
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
      case 'start': {
        const start = (msg.start ?? {}) as Record<string, unknown>;
        const streamId = str(start.streamId ?? start.stream_id ?? msg.streamId);
        const resolved = str(start.callId ?? start.call_id ?? this.callId);
        if (resolved) this.callId = resolved;
        this.emit({
          type: 'call.started',
          callId: this.callId,
          streamId,
          format: CANONICAL_FORMAT,
          metadata: extractMetadata(start),
        });
        break;
      }
      case 'media': {
        const media = (msg.media ?? {}) as Record<string, unknown>;
        const payload = str(media.payload);
        if (!payload) return;
        this.emit({
          type: 'audio.received',
          callId: this.callId,
          chunk: Buffer.from(payload, 'base64'),
          sequence: num(media.sequenceNumber ?? media.sequence_number),
        });
        break;
      }
      case 'dtmf': {
        const dtmf = (msg.dtmf ?? {}) as Record<string, unknown>;
        const digit = str(dtmf.digit ?? msg.digit);
        if (digit) this.emit({ type: 'dtmf', callId: this.callId, digit });
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

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
function extractMetadata(start: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const source = (start.extraParams ?? start.extra_params ?? start.customParameters) as
    | Record<string, unknown>
    | undefined;
  if (source && typeof source === 'object') {
    for (const [k, v] of Object.entries(source)) out[k] = str(v);
  }
  return out;
}
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
