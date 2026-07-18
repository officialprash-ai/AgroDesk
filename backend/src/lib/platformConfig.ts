/**
 * Platform configuration — the read side of the Sovereign Vault ops panel.
 *
 * The vault (agrodesk-ops) writes rows into `platform_config`; this backend
 * reads them. Values are cached for CACHE_TTL_MS so config changes propagate
 * within ~30s without adding a DB round-trip to every call.
 *
 * Design rules:
 *  - FAIL OPEN. If the DB is unreachable or a row is malformed, fall back to
 *    the last known-good snapshot, then to env, then to hardcoded defaults.
 *    A config-service outage must never take telephony down.
 *  - Values are validated before use. The vault is a superadmin surface, but
 *    an unknown provider string should degrade to the default, not crash a call.
 */
import { prisma } from './prisma.js';

export type ProviderMap = {
  voice: string;
  tts: string;
  whatsapp: string;
  llm: string;
  sms: string;
  ocr: string;
};

export type PlanLimits = Record<string, Record<string, number>>;

const CACHE_TTL_MS = 30_000;

/**
 * Known-good values — one entry per implementation that actually exists.
 *
 * Only `voice` is genuinely switchable today (PlivoAdapter + ExotelAdapter).
 * The rest have a single implementation, so they are effectively fixed; they
 * stay listed so the vault can display them and so adding a second vendor is
 * a one-line change here rather than a new abstraction.
 *
 * `llm` is Gemini: lib/llm.ts replaced Anthropic across AI handlers, OCR and
 * webhooks. There is no Anthropic code path.
 */
export const VALID_PROVIDERS: Record<keyof ProviderMap, string[]> = {
  voice: ['plivo', 'exotel'],
  tts: ['sarvam'],
  whatsapp: ['aisensy'],
  llm: ['gemini'],
  sms: ['msg91'],
  ocr: ['textract'],
};

/** Env-and-code defaults. Mirrors behaviour before the vault existed. */
function envDefaults(): ProviderMap {
  return {
    voice: process.env.TELEPHONY_PROVIDER || 'plivo',
    tts: 'sarvam',
    whatsapp: 'aisensy',
    llm: 'gemini',
    sms: 'msg91',
    ocr: 'textract',
  };
}

type CacheEntry<T> = { value: T; fetchedAt: number };

let providersCache: CacheEntry<ProviderMap> | null = null;
let limitsCache: CacheEntry<PlanLimits> | null = null;

function isFresh(entry: CacheEntry<unknown> | null): boolean {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function readConfigRow<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  } catch (err) {
    console.error(`[platformConfig] read failed for "${key}":`, err);
    return null;
  }
}

/** Coerce a raw row into a valid ProviderMap, falling back per-field. */
function sanitizeProviders(raw: unknown): ProviderMap {
  const defaults = envDefaults();
  if (!raw || typeof raw !== 'object') return defaults;

  const input = raw as Partial<Record<keyof ProviderMap, unknown>>;
  const out = { ...defaults };

  (Object.keys(VALID_PROVIDERS) as (keyof ProviderMap)[]).forEach((k) => {
    const v = input[k];
    if (typeof v === 'string' && VALID_PROVIDERS[k].includes(v)) {
      out[k] = v;
    } else if (v !== undefined) {
      console.warn(`[platformConfig] ignoring invalid ${k} provider: ${String(v)}`);
    }
  });

  return out;
}

/** Current provider selection. Cached for 30s. */
export async function getProviders(): Promise<ProviderMap> {
  if (isFresh(providersCache)) return providersCache!.value;

  const raw = await readConfigRow<unknown>('providers');
  if (raw === null) {
    // DB unreachable or row missing — prefer last known good over defaults.
    if (providersCache) return providersCache.value;
    return envDefaults();
  }

  const value = sanitizeProviders(raw);
  providersCache = { value, fetchedAt: Date.now() };
  return value;
}

/**
 * Last-known provider selection without awaiting a DB read.
 * For hot paths that cannot be async. Returns env defaults until first load,
 * so call preloadPlatformConfig() at boot.
 */
export function getProvidersSync(): ProviderMap {
  return providersCache?.value ?? envDefaults();
}

/** Plan limits by tier. Cached for 30s. */
export async function getPlanLimits(): Promise<PlanLimits> {
  if (isFresh(limitsCache)) return limitsCache!.value;

  const raw = await readConfigRow<PlanLimits>('plan_limits');
  if (raw === null || typeof raw !== 'object') {
    if (limitsCache) return limitsCache.value;
    return {};
  }

  limitsCache = { value: raw, fetchedAt: Date.now() };
  return raw;
}

/**
 * Resolve one limit for a plan. Returns null when unknown, which callers
 * should treat as "not enforced" rather than "zero allowed".
 */
export async function getLimit(plan: string, metric: string): Promise<number | null> {
  const limits = await getPlanLimits();
  const v = limits?.[plan]?.[metric];
  return typeof v === 'number' ? v : null;
}

/** Warm the cache at startup so sync getters are populated. */
export async function preloadPlatformConfig(): Promise<void> {
  await Promise.all([getProviders(), getPlanLimits()]);
  const p = getProvidersSync();
  console.log(`[platformConfig] loaded — voice=${p.voice} llm=${p.llm} tts=${p.tts}`);
}

/** Drop caches; next read hits the DB. Exposed for tests and admin hooks. */
export function invalidatePlatformConfig(): void {
  providersCache = null;
  limitsCache = null;
}
