/**
 * In-memory store for Sarvam-generated call audio.
 *
 * Lifecycle:
 *  1. Worker generates TTS audio → stores here with a UUID key
 *  2. Exotel fetches /api/audio/:id when the call is answered
 *  3. Entry auto-expires after TTL_MS (default 10 min)
 *
 * On Railway (single process), this lives in the same process as the Express
 * server, so the Map is shared. If you later scale to multiple workers, move
 * this to Redis (store audio as a key with TTL).
 */

interface AudioEntry {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const store = new Map<string, AudioEntry>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Purge expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

export function storeAudio(id: string, buffer: Buffer, contentType = 'audio/wav'): void {
  store.set(id, { buffer, contentType, expiresAt: Date.now() + TTL_MS });
}

export function getAudio(id: string): AudioEntry | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) { store.delete(id); return undefined; }
  return entry;
}

export function deleteAudio(id: string): void {
  store.delete(id);
}
