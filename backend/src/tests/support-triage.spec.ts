/**
 * Support Intake — triage classification.
 * 20 realistic Marathi / Hinglish utterances across all four buckets, run
 * against the deterministic MockTriageProvider (no LLM, offline).
 */
import { describe, it, expect } from 'vitest';
import { MockTriageProvider, type RequestType } from '../services/support/triage.js';

const provider = new MockTriageProvider();

const CASES: { text: string; expected: RequestType }[] = [
  // ── SERVICE ──
  { text: 'गाडीची फ्री सर्विस करायची आहे', expected: 'SERVICE' },
  { text: 'oil change करायचं आहे ट्रॅक्टरचं', expected: 'SERVICE' },
  { text: '50 तास झाले, servicing needed', expected: 'SERVICE' },
  { text: 'फिल्टर बदलायचा आहे', expected: 'SERVICE' },
  { text: 'periodic checkup साठी बोलतोय', expected: 'SERVICE' },

  // ── REPAIR ──
  { text: 'ट्रॅक्टर सुरू होत नाही', expected: 'REPAIR' },
  { text: 'self start बंद पडलाय', expected: 'REPAIR' },
  { text: 'इंजिनमधून आवाज येतोय', expected: 'REPAIR' },
  { text: 'clutch plate खराब झालीये', expected: 'REPAIR' },
  { text: 'तेल गळत आहे engine मधून', expected: 'REPAIR' },
  { text: 'ब्रेक नीट लागत नाही', expected: 'REPAIR' },

  // ── OTHER ──
  { text: 'insurance renew करायचा आहे', expected: 'OTHER' },
  { text: 'RTO चं passing काम आहे', expected: 'OTHER' },
  { text: 'loan चा EMI बद्दल विचारायचं होतं', expected: 'OTHER' },
  { text: 'spare part हवा आहे', expected: 'OTHER' },
  { text: 'registration कागदपत्र हवे', expected: 'OTHER' },

  // ── UNSURE ──
  { text: 'साहेब जरा भेटायचं होतं', expected: 'UNSURE' },
  { text: 'उद्या येऊ का?', expected: 'UNSURE' },
  { text: 'नमस्कार, बोलताय का?', expected: 'UNSURE' },
  { text: 'एक विचारायचं होतं', expected: 'UNSURE' },
];

describe('MockTriageProvider classification', () => {
  it('has 20 cases across all four buckets', () => {
    expect(CASES).toHaveLength(20);
    for (const b of ['SERVICE', 'REPAIR', 'OTHER', 'UNSURE'] as RequestType[]) {
      expect(CASES.some((c) => c.expected === b)).toBe(true);
    }
  });

  for (const { text, expected } of CASES) {
    it(`"${text}" → ${expected}`, async () => {
      const r = await provider.triage({ text, hasMedia: false });
      expect(r.type).toBe(expected);
      expect(r.note).toBeTruthy(); // a note is always jotted down
    });
  }

  it('binds to a known machine when its make/model is mentioned', async () => {
    const r = await provider.triage({
      text: 'माझ्या John Deere ची सर्विस करायची',
      hasMedia: false,
      knownCustomer: { name: 'Ramrao', machines: [{ id: 'm1', make: 'John Deere', model: '5050D' }] },
    });
    expect(r.type).toBe('SERVICE');
    expect(r.machineId).toBe('m1');
  });
});
