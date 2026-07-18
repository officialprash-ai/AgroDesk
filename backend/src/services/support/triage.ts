/**
 * Support Intake — Triage
 *
 * The triage step does exactly ONE thing: sort an inbound message into one of
 * four buckets and write a short dealer-readable note. It does NOT diagnose,
 * quote prices, promise dates, or suggest fixes — see the system prompt.
 *
 * Two providers implement the same interface:
 *   - LlmTriageProvider  → real classification via Gemini (the repo's LLM; see
 *                          lib/llm.ts, which replaced Anthropic). Parses
 *                          defensively and NEVER throws — worst case UNSURE.
 *   - MockTriageProvider → deterministic keyword rules. Used in demo mode and
 *                          in tests so they run offline with no LLM spend.
 *
 * Provider abstraction mirrors TelephonyProvider / the other vendor layers:
 * swap the implementation without touching intake logic.
 */

import { geminiText, parseJsonLoose } from '../../lib/llm.js';

// ─── Types ───────────────────────────────────────────────────

export type RequestType = 'SERVICE' | 'REPAIR' | 'OTHER' | 'UNSURE';

export interface TriageInput {
  /** Transcript (voice) or WhatsApp message body. */
  text: string;
  hasMedia: boolean;
  /** Present only when the caller's phone matched a known Contact. */
  knownCustomer?: {
    name: string;
    machines: { id: string; make: string; model: string; regNo?: string }[];
  };
}

export interface TriageResult {
  type: RequestType;
  /** One-line summary in Marathi, as a dealer would jot it down. */
  note: string;
  /** Optional English translation, for search. */
  noteEn: string;
  /** Only if an unknown caller stated their name. */
  callerName?: string;
  /** Only when the customer unambiguously identified one of their machines. */
  machineId?: string;
}

export interface TriageProvider {
  triage(input: TriageInput): Promise<TriageResult>;
}

// ─── System prompt (shared, Marathi-first intake clerk) ──────

export const TRIAGE_SYSTEM_PROMPT = `You are an intake clerk at a tractor dealership in Maharashtra, India.
Your ONLY job is to sort a customer's message into one bucket and summarise it.
You do NOT diagnose problems. You do NOT suggest fixes. You do NOT mention price or dates.

Buckets:
- SERVICE: routine servicing, free service, oil change, filter change, periodic checkup
- REPAIR: something is broken or not working — breakdown, noise, leak, won't start
- OTHER: RTO, registration, insurance, loan/finance, documents, spare parts enquiry, anything non-mechanical
- UNSURE: you genuinely cannot tell

Input is Marathi, often mixed with Hindi and English tractor jargon
("clutch plate", "self start", "PTO"). This is normal. Do not force pure Marathi.

Return ONLY a JSON object, no preamble, no markdown fences:
{"type":"...","note":"...","noteEn":"...","callerName":null,"machineId":null}

- note: one short line in Marathi describing what the customer wants, as a dealer would jot it down.
- machineId: only set it if the customer clearly identified which tractor AND it matches
  one in the provided list. Otherwise null.
- If unclear, return UNSURE. Guessing wrong is worse than UNSURE.`;

const VALID_TYPES: RequestType[] = ['SERVICE', 'REPAIR', 'OTHER', 'UNSURE'];

/** Build the user-message context block passed alongside the system prompt. */
function buildUserMessage(input: TriageInput): string {
  const lines: string[] = [];
  if (input.knownCustomer) {
    lines.push(`Known customer: ${input.knownCustomer.name}`);
    if (input.knownCustomer.machines.length) {
      lines.push('Their tractors (machineId → make model [regNo]):');
      for (const m of input.knownCustomer.machines) {
        lines.push(`  ${m.id} → ${m.make} ${m.model}${m.regNo ? ` [${m.regNo}]` : ''}`);
      }
    } else {
      lines.push('Their tractors: none on record.');
    }
  } else {
    lines.push('Caller is UNKNOWN (no Contact match). If they state their name, put it in callerName.');
  }
  lines.push(`Message has media/photo attached: ${input.hasMedia ? 'yes' : 'no'}`);
  lines.push('');
  lines.push(`Customer message:\n"""${input.text}"""`);
  return lines.join('\n');
}

/** Coerce arbitrary parsed JSON into a safe TriageResult. Never throws. */
function coerce(raw: unknown, input: TriageInput): TriageResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const type = VALID_TYPES.includes(o.type as RequestType) ? (o.type as RequestType) : 'UNSURE';

  const note =
    typeof o.note === 'string' && o.note.trim()
      ? o.note.trim()
      : (input.text || '').slice(0, 200) || 'विनंती नोंदवली';

  const noteEn = typeof o.noteEn === 'string' ? o.noteEn.trim() : '';

  const callerName =
    typeof o.callerName === 'string' && o.callerName.trim() ? o.callerName.trim() : undefined;

  // Only accept a machineId that actually belongs to the known customer.
  let machineId: string | undefined;
  if (typeof o.machineId === 'string' && o.machineId.trim()) {
    const owned = input.knownCustomer?.machines.some((m) => m.id === o.machineId);
    if (owned) machineId = o.machineId.trim();
  }

  return { type, note, noteEn, callerName, machineId };
}

// ─── LLM provider (Gemini) ───────────────────────────────────

export class LlmTriageProvider implements TriageProvider {
  async triage(input: TriageInput): Promise<TriageResult> {
    try {
      const rawText = await geminiText({
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(input) }],
        maxTokens: 300,
      });
      const parsed = parseJsonLoose<unknown>(rawText);
      return coerce(parsed, input);
    } catch (err) {
      // Parsing/LLM failure must NEVER block ticket creation — fall back to
      // UNSURE so the caller (intake orchestrator) still persists the request.
      console.error('[triage] LLM triage failed, defaulting to UNSURE:', (err as Error).message);
      return coerce({ type: 'UNSURE' }, input);
    }
  }
}

// ─── Mock provider (deterministic, offline) ──────────────────

const SERVICE_KEYWORDS = [
  'service', 'सर्विस', 'सर्व्हिस', 'सर्विसिंग', 'फ्री सर्विस', 'ऑइल', 'oil',
  'oil change', 'तेल', 'filter', 'फिल्टर', 'फिल्टर बदल', 'periodic', 'checkup',
  'चेकअप', 'servicing', 'greasing', 'ग्रीसिंग',
];
const REPAIR_KEYWORDS = [
  'तुटल', 'तुटला', 'तुटली', 'बंद', 'चालू होत नाही', 'सुरू होत नाही', 'self start',
  'सेल्फ', 'awaj', 'आवाज', 'noise', 'leak', 'गळत', 'गळती', 'तेल गळत', 'खराब',
  'नादुरुस्त', 'दुरुस्त', 'repair', 'breakdown', 'clutch', 'क्लच', 'brake', 'ब्रेक',
  'engine', 'इंजिन', 'गरम', 'overheat', 'radiator', 'pto', 'गियर', 'gear',
  'battery', 'बॅटरी', 'starter', 'नाही लागत',
];
const OTHER_KEYWORDS = [
  'rto', 'आरटीओ', 'insurance', 'विमा', 'registration', 'रजिस्ट्रेशन', 'papers',
  'कागद', 'कागदपत्र', 'loan', 'finance', 'फायनान्स', 'कर्ज', 'emi', 'document',
  'spare', 'part', 'पार्ट', 'स्पेअर', 'पैसे', 'passing', 'पासिंग',
];

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export class MockTriageProvider implements TriageProvider {
  async triage(input: TriageInput): Promise<TriageResult> {
    const text = (input.text ?? '').toLowerCase();

    // REPAIR wins over SERVICE when both appear (a breakdown is more urgent to
    // capture correctly than a routine service mention).
    let type: RequestType = 'UNSURE';
    if (containsAny(text, REPAIR_KEYWORDS)) type = 'REPAIR';
    else if (containsAny(text, SERVICE_KEYWORDS)) type = 'SERVICE';
    else if (containsAny(text, OTHER_KEYWORDS)) type = 'OTHER';

    // Try to bind to a known machine if its make/model/regNo is mentioned.
    let machineId: string | undefined;
    if (input.knownCustomer) {
      for (const m of input.knownCustomer.machines) {
        const tokens = [m.make, m.model, m.regNo].filter(Boolean).map((t) => String(t).toLowerCase());
        if (tokens.some((t) => t && text.includes(t))) {
          machineId = m.id;
          break;
        }
      }
    }

    const note = (input.text ?? '').trim().slice(0, 200) || 'विनंती नोंदवली';
    return {
      type,
      note,
      noteEn: '',
      machineId,
    };
  }
}

// ─── Selection helper ────────────────────────────────────────

/**
 * Pick a provider. Demo dealers and test runs use the deterministic mock so
 * they never hit the LLM (no spend, no flakiness); everyone else gets Gemini.
 */
export function getTriageProvider(opts?: { isDemo?: boolean }): TriageProvider {
  if (opts?.isDemo || process.env.NODE_ENV === 'test' || process.env.SUPPORT_TRIAGE_PROVIDER === 'mock') {
    return new MockTriageProvider();
  }
  return new LlmTriageProvider();
}
