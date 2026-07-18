/**
 * Support Intake — orchestrator.
 *
 * THE most important test in the module: even if triage throws, the ticket is
 * still created (as UNSURE). Also covers idempotency on externalCallId.
 *
 * prisma is mocked so this runs offline (no DB), matching the tenant-isolation
 * test's approach.
 *
 * Note: everything the vi.mock factory touches must be created inside
 * vi.hoisted(), because vi.mock is hoisted above normal `const` declarations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory prisma double (hoisted so the mock factory can see it) ──
const h = vi.hoisted(() => {
  const created: any[] = [];
  const state = {
    routing: null as any,
    existingByExternalId: null as any,
  };
  const fakePrisma = {
    supportRequest: {
      findUnique: vi.fn(async () => state.existingByExternalId),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `sr_${created.length + 1}`, ...data };
        created.push(row);
        return row;
      }),
    },
    contact: { findFirst: vi.fn(async () => null) },
    machine: { findMany: vi.fn(async () => []) },
    supportRouting: { findUnique: vi.fn(async () => state.routing) },
  };
  return { created, state, fakePrisma };
});

vi.mock('../lib/prisma.js', () => ({ prisma: h.fakePrisma }));

import { handleIntake } from '../services/support/intake.js';

const FULL_ROUTING = {
  mechanic_phone: '9990000001',
  technician_phone: '9990000002',
  dealer_phone: '9990000003',
};

// A provider that violates its contract and throws.
const throwingProvider = {
  triage: async () => {
    throw new Error('LLM unavailable');
  },
};

beforeEach(() => {
  h.created.length = 0;
  h.state.existingByExternalId = null;
  h.state.routing = { ...FULL_ROUTING };
  vi.clearAllMocks();
});

describe('handleIntake — the ticket is never lost', () => {
  it('creates an UNSURE ticket even when triage throws', async () => {
    const row = await handleIntake({
      dealerId: 'd1',
      phone: '9876543210',
      text: 'ट्रॅक्टरबद्दल काहीतरी',
      channel: 'WHATSAPP',
      provider: throwingProvider as any,
    });

    expect(h.fakePrisma.supportRequest.create).toHaveBeenCalledTimes(1);
    expect(row.type).toBe('UNSURE');
    expect(row.status).toBe('NEW');
    expect(row.transferred).toBe(false);
    expect(row.channel).toBe('WHATSAPP');
    expect(row.note).toContain('ट्रॅक्टरबद्दल');
  });

  it('routes a thrown/UNSURE ticket to the dealer phone', async () => {
    const row = await handleIntake({
      dealerId: 'd1',
      phone: '9876543210',
      text: 'x',
      channel: 'CALL',
      provider: throwingProvider as any,
    });
    expect(row.routed_to).toBe('DEALER');
    expect(row.routed_to_phone).toBe('9990000003');
  });

  it('classifies + routes a normal SERVICE request to the mechanic', async () => {
    const row = await handleIntake({
      dealerId: 'd1',
      phone: '9876543210',
      text: 'फ्री सर्विस करायची आहे',
      channel: 'WHATSAPP',
      isDemo: true, // forces MockTriageProvider
    });
    expect(row.type).toBe('SERVICE');
    expect(row.routed_to).toBe('MECHANIC');
    expect(row.routed_to_phone).toBe('9990000001');
  });

  it('still creates the ticket when NO routing is configured (phone null)', async () => {
    h.state.routing = null;
    const row = await handleIntake({
      dealerId: 'd1',
      phone: '9876543210',
      text: 'बंद पडलाय',
      channel: 'CALL',
      isDemo: true,
    });
    expect(h.fakePrisma.supportRequest.create).toHaveBeenCalledTimes(1);
    expect(row.type).toBe('REPAIR');
    expect(row.routed_to_phone).toBeNull();
  });

  it('is idempotent on externalCallId (duplicate delivery → no second row)', async () => {
    h.state.existingByExternalId = { id: 'already', type: 'SERVICE', external_call_id: 'wamid.1' };
    const row = await handleIntake({
      dealerId: 'd1',
      phone: '9876543210',
      text: 'oil change',
      channel: 'WHATSAPP',
      externalCallId: 'wamid.1',
      isDemo: true,
    });
    expect(row.id).toBe('already');
    expect(h.fakePrisma.supportRequest.create).not.toHaveBeenCalled();
  });
});
