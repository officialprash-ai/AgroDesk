/**
 * Support Intake — Orchestrator
 *
 * ONE function, used by every channel (WhatsApp, voice, manual). It captures a
 * request as a ticket. The order of operations is load-bearing and must not be
 * reordered:
 *
 *   1. Resolve identity  — Contact by phone (+ their machines).
 *   2. Triage            — bucket + note (wrapped; falls back to UNSURE).
 *   3. Resolve route     — who to hand off to.
 *   4. Persist the row   — transferred:false. THIS STEP NEVER GETS SKIPPED,
 *                          even if triage throws.
 *   5. Return the row    — the caller does the transfer/notify AFTER this.
 *
 * The whole point of the module: the ticket exists before any call transfer.
 */

import { prisma as _prisma } from '../../lib/prisma.js';
// `as any` for the new Support Intake models — matches the worker/webhook style
// and stays compiling even before `prisma generate` regenerates the client.
const prisma = _prisma as any;

import { getTriageProvider, type TriageProvider, type TriageResult } from './triage.js';
import { resolveRoute, type RoutingConfig } from './router.js';

export type RequestChannel = 'CALL' | 'WHATSAPP' | 'MANUAL';

export interface IntakeParams {
  dealerId: string;
  phone: string;
  text: string;
  channel: RequestChannel;
  mediaUrls?: string[];
  externalCallId?: string;
  /** Demo dealers use the deterministic mock triage (no LLM spend). */
  isDemo?: boolean;
  /** Override the triage provider (tests inject a throwing/mock provider). */
  provider?: TriageProvider;
}

/** Normalise an Indian phone to its bare 10-digit form for matching. */
export function normalisePhone(phone: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * Capture an inbound request as a SupportRequest ticket and return it.
 * Idempotent on externalCallId (WhatsApp/telephony retry the same event).
 */
export async function handleIntake(params: IntakeParams): Promise<any> {
  const { dealerId, phone, text, channel } = params;
  const mediaUrls = params.mediaUrls ?? [];
  const externalCallId = params.externalCallId;

  // ── Idempotency: if we've already logged this external event, return it. ──
  if (externalCallId) {
    const existing = await prisma.supportRequest
      .findUnique({ where: { external_call_id: externalCallId } })
      .catch(() => null);
    if (existing) return existing;
  }

  // ── 1. Resolve identity ──────────────────────────────────────
  const tenDigits = normalisePhone(phone);
  let contact: any = null;
  if (tenDigits) {
    contact = await prisma.contact
      .findFirst({
        where: { dealer_id: dealerId, phone: { endsWith: tenDigits } },
      })
      .catch(() => null);
  }

  let machines: any[] = [];
  if (contact) {
    machines = await prisma.machine
      .findMany({ where: { dealer_id: dealerId, contact_id: contact.id } })
      .catch(() => []);
  }

  // ── 2. Triage — MUST NOT be able to abort ticket creation ────
  const provider = params.provider ?? getTriageProvider({ isDemo: params.isDemo });
  let triage: TriageResult;
  try {
    triage = await provider.triage({
      text,
      hasMedia: mediaUrls.length > 0,
      knownCustomer: contact
        ? {
            name: contact.name,
            machines: machines.map((m) => ({
              id: m.id,
              make: m.make,
              model: m.model,
              regNo: m.reg_no ?? undefined,
            })),
          }
        : undefined,
    });
  } catch (err) {
    // Defence in depth: even a provider that violates its contract and throws
    // cannot stop us from recording the request.
    console.error('[intake] triage threw — recording as UNSURE:', (err as Error).message);
    triage = {
      type: 'UNSURE',
      note: (text ?? '').trim().slice(0, 200) || 'विनंती नोंदवली',
      noteEn: '',
    };
  }

  // ── 3. Resolve route ─────────────────────────────────────────
  const routing = (await prisma.supportRouting
    .findUnique({ where: { dealer_id: dealerId } })
    .catch(() => null)) as RoutingConfig | null;
  const route = resolveRoute(triage.type, routing);

  // ── 4. Persist — the step that never gets skipped ────────────
  const created = await prisma.supportRequest.create({
    data: {
      dealer_id: dealerId,
      contact_id: contact?.id ?? null,
      machine_id: triage.machineId ?? null,
      phone,
      caller_name: !contact ? triage.callerName ?? null : null,
      type: triage.type,
      status: 'NEW',
      channel,
      note: triage.note,
      note_en: triage.noteEn || null,
      routed_to: route.target,
      routed_to_phone: route.phone,
      transferred: false,
      external_call_id: externalCallId ?? null,
      media_urls: mediaUrls,
    },
  });

  // ── 5. Return — transfer / notify is the caller's job, AFTER this ──
  return created;
}
