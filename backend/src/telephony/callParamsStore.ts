/**
 * Short-lived in-process store for per-call parameters (greeting/script,
 * language, ids). The Plivo answer webhook and the media WebSocket both run in
 * this same API process, so we hand the (potentially long) script between them
 * via a short token instead of stuffing it in the WebSocket URL — long
 * URL-encoded Marathi scripts exceed Plivo's Stream URL limit and the socket
 * never connects, dropping the call on pickup.
 */
export interface CallParams {
  greeting?: string;
  language?: string;
  contactId?: string;
  dealershipId?: string;
  contactName?: string;
  dealerName?: string;
  dealerCity?: string;
}

const TTL_MS = 5 * 60_000; // a call connects within seconds; 5 min is ample
const store = new Map<string, { params: CallParams; expires: number }>();

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of store) if (v.expires < now) store.delete(k);
}

/** Store params, return a short token to embed in the Stream URL. */
export function putCallParams(params: CallParams): string {
  sweep();
  const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  store.set(token, { params, expires: Date.now() + TTL_MS });
  return token;
}

/** Retrieve and remove params for a token (one-shot). */
export function takeCallParams(token: string | undefined): CallParams {
  if (!token) return {};
  const entry = store.get(token);
  if (!entry) return {};
  store.delete(token);
  return entry.params;
}
