/**
 * Telephony bridge — provider selection + WebSocket media bridge.
 *
 * `attachTelephonyBridge(server)` mounts a WebSocket server at /telephony/stream
 * and, for every call, wires the selected provider's CallSession to a VoiceEngine
 * (Sarvam STT → Gemini → Sarvam TTS). Provider is chosen by TELEPHONY_PROVIDER;
 * the bridge itself is provider- and AI-agnostic.
 */

import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import type {
  AudioFormat,
  CallSession,
  PcmChunk,
  TelephonyProvider,
  TelephonyProviderName,
  TelephonyWebSocket,
} from './types.js';
import { PlivoAdapter } from './adapters/plivo.js';
import { ExotelAdapter } from './adapters/exotel.js';
import { createAgroDeskEngine } from './voice/engine.js';
import { takeCallParams } from './callParamsStore.js';
import { getProvidersSync } from '../lib/platformConfig.js';

/** The AI half of a call. One instance per call. */
export interface VoiceEngine {
  start(format: AudioFormat): Promise<void> | void;
  handleCallerAudio(chunk: PcmChunk): void;
  onReplyAudio(cb: (pcm: PcmChunk) => void): void;
  onBargeIn(cb: () => void): void;
  stop(): Promise<void> | void;
}

export interface BridgeDeps {
  createEngine?: (ctx: { callId: string; metadata: Record<string, string> }) => VoiceEngine;
  path?: string;
  logger?: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

/**
 * Live calls, keyed by the per-call token from the Stream URL.
 *
 * Plivo can drop and re-establish the media WebSocket mid-call. Treating that
 * reconnect as a brand-new call built a second engine, which re-greeted the
 * caller and threw away the STT session and conversation history — the "glitch,
 * then it greets me again" behaviour. Instead we park the engine for a short
 * grace period and re-attach it if the socket comes back.
 */
interface LiveCall {
  engine: VoiceEngine;
  /** Pending teardown, cancelled if the caller reconnects in time. */
  dispose?: NodeJS.Timeout;
}
const liveCalls = new Map<string, LiveCall>();

/** How long to hold an engine after the socket drops, waiting for a reconnect. */
const RECONNECT_GRACE_MS = 10_000;

/** Parse the query string off a WS upgrade request URL into a flat string map. */
function parseUrlQuery(url?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!url) return out;
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return out;
  for (const [k, v] of new URLSearchParams(url.slice(qIndex + 1))) out[k] = v;
  return out;
}

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`[telephony] Missing required env var: ${name}`);
  return v;
}

export const TELEPHONY_PROVIDER: TelephonyProviderName =
  (process.env.TELEPHONY_PROVIDER as TelephonyProviderName) || 'plivo';

export function createTelephonyProvider(
  name: TelephonyProviderName = TELEPHONY_PROVIDER,
): TelephonyProvider {
  switch (name) {
    case 'plivo':
      return new PlivoAdapter({
        authId: req('PLIVO_AUTH_ID'),
        authToken: req('PLIVO_AUTH_TOKEN'),
        fromNumber: req('PLIVO_FROM_NUMBER'),
      });
    case 'exotel':
      return new ExotelAdapter({
        sid: process.env.EXOTEL_SID,
        apiKey: process.env.EXOTEL_API_KEY,
        apiToken: process.env.EXOTEL_API_TOKEN,
        fromNumber: process.env.EXOTEL_PHONE,
      });
    default:
      throw new Error(`[telephony] Unknown TELEPHONY_PROVIDER: ${name as string}`);
  }
}

let singleton: TelephonyProvider | null = null;
let singletonName: TelephonyProviderName | null = null;

/**
 * Current telephony provider.
 *
 * The active provider comes from platform_config (set in the Sovereign Vault),
 * falling back to TELEPHONY_PROVIDER then 'plivo'. Reads the cached config
 * snapshot — no DB round-trip per call — and rebuilds the adapter only when
 * the selection actually changes, so a vault switch takes effect within the
 * config cache TTL (~30s) without a redeploy.
 *
 * In-flight calls keep the adapter they started with; only new calls pick up
 * the change.
 */
export function getTelephonyProvider(): TelephonyProvider {
  const configured = getProvidersSync().voice as TelephonyProviderName;

  if (singleton && singletonName === configured) return singleton;

  try {
    singleton = createTelephonyProvider(configured);
    singletonName = configured;
    console.log(`[telephony] provider set to "${configured}"`);
  } catch (err) {
    // Misconfigured target (e.g. Exotel selected but its credentials are
    // missing). Keep serving with the existing adapter rather than failing
    // the call; surface loudly so it gets fixed.
    console.error(`[telephony] cannot switch to "${configured}":`, err);
    if (singleton) return singleton;
    throw err;
  }

  return singleton;
}

/**
 * Mount the media WebSocket on an existing http.Server and wire each call to a
 * VoiceEngine. Returns the WebSocketServer so callers can close it on shutdown.
 */
export function attachTelephonyBridge(server: Server, deps: BridgeDeps = {}): WebSocketServer {
  // NOTE: the provider is resolved per connection (below), not here. Resolving
  // it once at mount time would pin the process to whichever provider was
  // active at boot, so vault switches would need a redeploy to take effect.
  const createEngine =
    deps.createEngine ??
    ((ctx) =>
      createAgroDeskEngine(ctx, {
        // Provider forwards these as call metadata (extraParams on the <Stream>).
        language: ctx.metadata.language || undefined,
        greeting: ctx.metadata.greeting || undefined,
      }));
  const log = deps.logger ?? console;
  const wss = new WebSocketServer({ server, path: deps.path ?? '/telephony/stream' });

  wss.on('connection', (rawWs, req) => {
    // The Stream URL carries a short token; resolve it to the per-call params
    // (greeting/script/language/ids) stashed by the answer webhook. Falls back to
    // any raw query params for backward compatibility. Merges anything Plivo
    // echoes on the stream on top.
    const urlMeta = parseUrlQuery((req as { url?: string } | undefined)?.url);
    const stored = takeCallParams(urlMeta.token);
    // Resolved per call so a provider switch in the vault applies to new calls.
    const session: CallSession = getTelephonyProvider().handleStream(
      rawWs as unknown as TelephonyWebSocket,
    );
    let engine: VoiceEngine | null = null;
    /** Registry key for this socket, set once call.started resolves it. */
    let callKey: string | undefined = urlMeta.token || undefined;

    session.on((event) => {
      switch (event.type) {
        case 'call.started': {
          const metadata = { ...urlMeta, ...stored, ...event.metadata } as Record<string, string>;
          // Token is stable across reconnects for one call; callId is not.
          const key = urlMeta.token || event.callId;
          callKey = key;
          const existing = liveCalls.get(key);

          if (existing) {
            // Reconnect: keep the same engine, so the caller is NOT greeted a
            // second time and the conversation history and STT session survive.
            clearTimeout(existing.dispose);
            existing.dispose = undefined;
            engine = existing.engine;
            engine.onReplyAudio((pcm) => session.sendAudioChunk(pcm));
            engine.onBargeIn(() => session.clearAudio());
            log.info('[telephony] call.reconnected', event.callId, `key=${key}`);
            break;
          }

          log.info('[telephony] call.started', event.callId, metadata);
          engine = createEngine({ callId: event.callId, metadata });
          engine.onReplyAudio((pcm) => session.sendAudioChunk(pcm));
          engine.onBargeIn(() => session.clearAudio());
          liveCalls.set(key, { engine });
          // Never let an engine start-up rejection become an unhandled rejection
          // (Node would crash the whole process, killing every call + the API).
          Promise.resolve(engine.start(event.format)).catch((err) =>
            log.error('[telephony] engine start failed', err),
          );
          break;
        }
        case 'audio.received':
          engine?.handleCallerAudio(event.chunk);
          break;
        case 'dtmf':
          log.info('[telephony] dtmf', event.digit);
          break;
        case 'call.stopped': {
          log.info('[telephony] call.stopped', event.callId, event.reason);
          const key = callKey ?? urlMeta.token ?? event.callId;
          const live = key ? liveCalls.get(key) : undefined;
          if (live) {
            // Don't tear down yet — this may be a blip, not a hangup. If nobody
            // reconnects within the grace window, release everything.
            clearTimeout(live.dispose);
            live.dispose = setTimeout(() => {
              liveCalls.delete(key);
              void Promise.resolve(live.engine.stop()).catch((err) =>
                log.error('[telephony] engine stop failed', err),
              );
              log.info('[telephony] call released', key);
            }, RECONNECT_GRACE_MS);
            // Timer must not hold the process open on shutdown.
            live.dispose.unref?.();
          } else {
            void engine?.stop();
          }
          engine = null;
          break;
        }
        case 'error':
          log.error('[telephony] stream error', event.error);
          break;
      }
    });
  });

  // The provider is resolved per connection, so report the currently configured
  // one rather than a mount-time singleton.
  log.info(
    `[telephony] media WS mounted at ${deps.path ?? '/telephony/stream'} ` +
      `(provider=${getProvidersSync().voice ?? TELEPHONY_PROVIDER})`,
  );
  return wss;
}
