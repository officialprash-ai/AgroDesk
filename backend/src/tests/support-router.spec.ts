/**
 * Support Intake — router fallback chain.
 * The chain must ALWAYS terminate at the dealer, and never throw — even when
 * every phone is null (the ticket still gets a target, just no number).
 */
import { describe, it, expect } from 'vitest';
import { resolveRoute } from '../services/support/router.js';

const full = { mechanic_phone: '9990000001', technician_phone: '9990000002', dealer_phone: '9990000003' };

describe('resolveRoute', () => {
  it('SERVICE → mechanic when set', () => {
    expect(resolveRoute('SERVICE', full)).toEqual({ target: 'MECHANIC', phone: '9990000001' });
  });
  it('REPAIR → mechanic when set', () => {
    expect(resolveRoute('REPAIR', full)).toEqual({ target: 'MECHANIC', phone: '9990000001' });
  });
  it('OTHER → technician when set', () => {
    expect(resolveRoute('OTHER', full)).toEqual({ target: 'TECHNICIAN', phone: '9990000002' });
  });
  it('UNSURE → dealer', () => {
    expect(resolveRoute('UNSURE', full)).toEqual({ target: 'DEALER', phone: '9990000003' });
  });

  it('SERVICE falls back to dealer phone when no mechanic', () => {
    expect(resolveRoute('SERVICE', { dealer_phone: '9990000003' })).toEqual({ target: 'MECHANIC', phone: '9990000003' });
  });
  it('OTHER falls back to dealer phone when no technician', () => {
    expect(resolveRoute('OTHER', { dealer_phone: '9990000003' })).toEqual({ target: 'TECHNICIAN', phone: '9990000003' });
  });

  it('all phones null → target set, phone null (ticket still surfaces)', () => {
    expect(resolveRoute('SERVICE', { mechanic_phone: null, technician_phone: null, dealer_phone: null })).toEqual({ target: 'MECHANIC', phone: null });
    expect(resolveRoute('OTHER', {})).toEqual({ target: 'TECHNICIAN', phone: null });
    expect(resolveRoute('UNSURE', {})).toEqual({ target: 'DEALER', phone: null });
  });

  it('null / undefined routing config → never throws, phone null', () => {
    expect(resolveRoute('REPAIR', null)).toEqual({ target: 'MECHANIC', phone: null });
    expect(resolveRoute('OTHER', undefined)).toEqual({ target: 'TECHNICIAN', phone: null });
  });
});
