import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input, Select, Badge } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { LANGUAGES } from '../../lib/utils';
import { Building2, Tractor, Sparkles, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

const STEPS = ['Organization', 'Brands', 'Plan', 'Review'];

const PLAN_DETAILS: { id: string; name: string; price: string; highlights: string[]; recommended?: boolean }[] = [
  { id: 'starter', name: 'Starter', price: '₹2,999/mo', highlights: ['500 AI calls/mo', '1,000 WhatsApp msgs/mo', '2,000 contacts', '2 active campaigns'] },
  { id: 'growth', name: 'Growth', price: '₹7,999/mo', highlights: ['2,000 AI calls/mo', '5,000 WhatsApp msgs/mo', '10,000 contacts', '10 active campaigns'], recommended: true },
  { id: 'pro', name: 'Pro', price: '₹19,999/mo', highlights: ['Unlimited AI calls', 'Unlimited WhatsApp', 'Unlimited contacts', 'Unlimited campaigns'] },
];

const BUSINESS_TYPES = [
  { value: 'authorized_dealer', label: 'Authorized brand dealer' },
  { value: 'reseller', label: 'Used tractor reseller' },
  { value: 'both', label: 'Both' },
];

export const Onboarding: React.FC = () => {
  const { dealer, updateDealer, clearAuth } = useAppStore();
  const [step, setStep] = useState(Math.min(dealer?.onboarding_step ?? 0, 3));
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    name: dealer?.name ?? '', city: dealer?.city ?? '', district: dealer?.district ?? '',
    state: dealer?.state ?? 'Maharashtra', gst_number: '',
    business_type: dealer?.business_type ?? 'authorized_dealer',
    language: dealer?.language ?? 'mr',
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>(dealer?.brand_ids ?? []);
  const [plan, setPlan] = useState(dealer?.plan ?? 'growth');

  useEffect(() => {
    api.onboarding.brands().then(r => setBrands(r.brands)).catch(() => {});
  }, []);

  const goNext = async (fn: () => Promise<{ dealer: any }>, nextStep: number) => {
    setError(''); setLoading(true);
    try {
      const res = await fn();
      updateDealer(res.dealer);
      setStep(nextStep);
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong');
    }
    setLoading(false);
  };

  const finish = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.onboarding.complete();
      updateDealer(res.dealer);
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not finish setup');
    }
    setLoading(false);
  };

  const toggleBrand = (id: string) => setSelectedBrands(s => s.includes(id) ? s.filter(b => b !== id) : [...s, id]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-deep)] px-4 py-10 overflow-auto">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-wide text-brand-400 uppercase">Welcome to AgroDesk</p>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Let's set up your dealership</h1>
          <p className="text-sm text-[var(--text-muted)]">A few quick steps and you're ready to start selling.</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-brand-400' : 'text-[var(--text-muted)]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  i < step ? 'bg-brand-400 border-brand-400 text-surface-900' : i === step ? 'border-brand-400' : 'border-[var(--border)]'
                }`}>
                  {i < step ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-brand-400' : 'bg-[var(--border)]'}`} />}
            </React.Fragment>
          ))}
        </div>

        <Card className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={16} className="text-brand-400" />
                    <h2 className="font-display font-semibold text-sm text-[var(--text-primary)]">Organization details</h2>
                  </div>
                  <Input label="Dealership name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
                    <Input label="District" value={profile.district} onChange={e => setProfile(p => ({ ...p, district: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="State" value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} />
                    <Input label="GST number (optional)" placeholder="27AAAAA0000A1Z5" value={profile.gst_number} onChange={e => setProfile(p => ({ ...p, gst_number: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Business type" value={profile.business_type} onChange={e => setProfile(p => ({ ...p, business_type: e.target.value }))} options={BUSINESS_TYPES} />
                    <Select label="Primary language" value={profile.language} onChange={e => setProfile(p => ({ ...p, language: e.target.value }))} options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tractor size={16} className="text-brand-400" />
                    <h2 className="font-display font-semibold text-sm text-[var(--text-primary)]">Which brands do you sell or service?</h2>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Select all that apply — this helps AgroDesk tailor AI scripts and listings to your inventory.</p>
                  <div className="flex flex-wrap gap-2">
                    {brands.map(b => (
                      <button key={b.id} type="button" onClick={() => toggleBrand(b.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedBrands.includes(b.id) ? 'bg-brand-400 border-brand-400 text-surface-900' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-brand-400/40'
                        }`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                  {brands.length === 0 && <p className="text-xs text-[var(--text-muted)]">Loading brand catalog…</p>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-brand-400" />
                    <h2 className="font-display font-semibold text-sm text-[var(--text-primary)]">Choose your plan</h2>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {PLAN_DETAILS.map(p => (
                      <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                        className={`text-left p-4 rounded-xl border transition-colors relative ${
                          plan === p.id ? 'border-brand-400 bg-[rgba(74,222,128,0.06)]' : 'border-[var(--border)] hover:border-brand-400/30'
                        }`}>
                        {p.recommended && <span className="absolute -top-2 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-400 text-surface-900">POPULAR</span>}
                        <p className="font-display font-semibold text-sm text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mb-2">{p.price}</p>
                        <ul className="space-y-1">
                          {p.highlights.map(h => <li key={h} className="text-[11px] text-[var(--text-secondary)]">• {h}</li>)}
                        </ul>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">You can change plans anytime from Settings. Billing is confirmed separately by the AgroDesk team.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-brand-400" />
                    <h2 className="font-display font-semibold text-sm text-[var(--text-primary)]">Review & finish</h2>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--text-muted)]">Dealership</span><span className="text-[var(--text-primary)]">{profile.name || '—'}</span></div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--text-muted)]">Location</span><span className="text-[var(--text-primary)]">{[profile.city, profile.district].filter(Boolean).join(', ') || '—'}</span></div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--text-muted)]">Brands</span><span className="text-[var(--text-primary)]">{selectedBrands.length} selected</span></div>
                    <div className="flex justify-between pb-2"><span className="text-[var(--text-muted)]">Plan</span><Badge variant="info">{plan}</Badge></div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">You're all set. You can update any of this later from Settings.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && <p className="text-xs text-red-400 mt-4">{error}</p>}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
            <div>
              {step > 0 && <Button variant="ghost" size="sm" icon={<ArrowLeft size={13} />} onClick={() => setStep(s => s - 1)} disabled={loading}>Back</Button>}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={finish} disabled={loading}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2">
                Skip for now
              </button>
              {step === 0 && <Button size="sm" icon={<ArrowRight size={13} />} loading={loading} onClick={() => goNext(() => api.onboarding.saveProfile(profile), 1)}>Continue</Button>}
              {step === 1 && <Button size="sm" icon={<ArrowRight size={13} />} loading={loading} onClick={() => goNext(() => api.onboarding.saveBrands(selectedBrands), 2)}>Continue</Button>}
              {step === 2 && <Button size="sm" icon={<ArrowRight size={13} />} loading={loading} onClick={() => goNext(() => api.onboarding.savePlan(plan), 3)}>Continue</Button>}
              {step === 3 && <Button size="sm" icon={<CheckCircle2 size={13} />} loading={loading} onClick={finish}>Finish setup</Button>}
            </div>
          </div>
        </Card>

        <div className="text-center">
          <button onClick={clearAuth} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Sign out</button>
        </div>
      </div>
    </div>
  );
};
