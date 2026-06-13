import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Input, Select, TabBar, Badge } from '../../components/ui';
import { useAppStore } from '../../store';
import { authApi } from '../../lib/api';
import { LANGUAGES } from '../../lib/utils';
import { Building, Zap, Phone, MessageSquare, Database, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { dealer, setAuth, token } = useAppStore();
  const [tab, setTab] = useState('profile');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile form — seed from dealer store
  const [form, setForm] = useState({
    name: dealer?.name ?? '',
    city: dealer?.city ?? '',
    district: dealer?.district ?? '',
    gst_number: '',
    phone: dealer?.phone ?? '',
    email: '',
    language: dealer?.language ?? 'mr',
  });

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const res = await authApi.updateProfile(form);
      if (token) setAuth(token, res.dealer);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Profile save failed:', e);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" subtitle="Dealer profile, integrations & agent configuration" />
      <div className="p-6 space-y-5 page-enter">

        <TabBar tabs={[
          { id: 'profile', label: 'Profile' },
          { id: 'integrations', label: 'Integrations' },
          { id: 'agents', label: 'Agent Config' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'billing', label: 'Billing' },
        ]} active={tab} onChange={setTab} />

        {/* Profile */}
        {tab === 'profile' && (
          <div className="max-w-xl space-y-4">
            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Building size={14} className="text-brand-400" />Dealership Information</h3>
              <div className="space-y-3">
                <Input label="Dealership Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  <Input label="District" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
                </div>
                <Select label="State" options={[{ value: 'MH', label: 'Maharashtra' }, { value: 'GJ', label: 'Gujarat' }, { value: 'PB', label: 'Punjab' }]} />
                <Input label="GST Number" placeholder="27XXXXX1234Z1" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
                <Input label="Primary Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input label="Email" type="email" placeholder="dealer@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <Select label="Default Language for AI" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))} />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button onClick={handleSaveProfile} loading={saveLoading}>Save Profile</Button>
                {saveSuccess && (
                  <span className="text-xs text-brand-400 flex items-center gap-1"><CheckCircle size={12} /> Saved!</span>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Integrations */}
        {tab === 'integrations' && (
          <div className="max-w-2xl space-y-4">
            {[
              { name: 'WhatsApp Business API', provider: 'AiSensy / Interakt', status: 'connected', icon: MessageSquare, color: '#4ade80', desc: 'BSP connected · 1,000 msgs/day tier' },
              { name: 'Exotel Voice', provider: 'Exotel India', status: 'connected', icon: Phone, color: '#60a5fa', desc: 'Outbound calling · 200 calls/min' },
              { name: 'Sarvam AI', provider: 'Sarvam.ai', status: 'connected', icon: Zap, color: '#a78bfa', desc: 'Marathi STT/TTS · 22 Indian languages' },
              { name: 'Meta Ads', provider: 'Meta Marketing API', status: 'disconnected', icon: Zap, color: '#fbbf24', desc: 'Connect for automated ad campaigns' },
              { name: 'TallyPrime', provider: 'Desktop Connector', status: 'disconnected', icon: Database, color: '#f87171', desc: 'Requires Tally Connector on PC' },
              { name: 'MSG91 SMS', provider: 'MSG91 (DLT Registered)', status: 'connected', icon: MessageSquare, color: '#34d399', desc: 'Transactional + Promotional · DLT active' },
            ].map(int => {
              const Icon = int.icon;
              return (
                <Card key={int.name} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${int.color}15` }}>
                    <Icon size={18} style={{ color: int.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{int.name}</p>
                      <Badge variant={int.status === 'connected' ? 'active' : 'overdue'}>{int.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{int.provider}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{int.desc}</p>
                  </div>
                  <Button variant={int.status === 'connected' ? 'secondary' : 'outline'} size="sm">
                    {int.status === 'connected' ? 'Configure' : 'Connect'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        {/* Agents Config */}
        {tab === 'agents' && (
          <div className="max-w-xl space-y-4">
            {[
              { module: 'A', name: 'Sales Engine', settings: ['Auto-post to Facebook Page', 'WhatsApp broadcast opt-in only', 'AI scripts in Marathi default'], on: [true, true, true] },
              { module: 'B', name: 'Used Tractor Agent', settings: ['Auto-urgency scoring', 'Buyer matching alerts', 'AI listing descriptions'], on: [true, true, true] },
              { module: 'C', name: 'Money Recovery', settings: ['Auto-escalate after 7 days', 'Legal stage needs approval', 'WhatsApp payment links'], on: [true, true, false] },
              { module: 'D', name: 'Cold Calling Agent', settings: ['DLT scrub before calling', 'TRAI quiet hours (9AM-9PM)', 'Auto-add interested to CRM'], on: [true, true, true] },
              { module: 'E', name: 'AI Salesman', settings: ['Auto-respond in 10s', 'Escalate after 3 rounds', 'Send brochure on first enquiry'], on: [true, true, false] },
              { module: 'F', name: 'AI Accountant', settings: ['Monthly reminder on 1st', 'Daily nudge until submitted', 'Auto OCR on upload'], on: [true, true, true] },
            ].map(agent => (
              <Card key={agent.module}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.1)] text-brand-400 border border-[rgba(74,222,128,0.2)]">{agent.module}</span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{agent.name}</h3>
                </div>
                <div className="space-y-2">
                  {agent.settings.map((s, i) => (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)]">{s}</span>
                      <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative ${agent.on[i] ? 'bg-brand-400' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                        <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: agent.on[i] ? '18px' : '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Notifications */}
        {tab === 'notifications' && (
          <div className="max-w-xl space-y-4">
            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Notification Channels</h3>
              <div className="space-y-3">
                {[
                  'New interested lead from cold call',
                  'Payment received (recovery)',
                  'Bill upload reminder (accountant)',
                  'Tally sync completed',
                  'Campaign completed',
                  'Tractor enquiry received',
                ].map(n => (
                  <div key={n} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">{n}</span>
                    <div className="flex gap-2">
                      {['WA', 'SMS', 'App'].map(ch => (
                        <label key={ch} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] cursor-pointer">
                          <input type="checkbox" className="accent-brand-400" defaultChecked={ch !== 'SMS'} />
                          {ch}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4">Save Preferences</Button>
            </Card>
          </div>
        )}

        {/* Billing */}
        {tab === 'billing' && (
          <div className="max-w-2xl space-y-4">
            <Card className="bg-[rgba(74,222,128,0.04)] border-brand-400/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-brand-400 font-semibold uppercase tracking-wider mb-1">Current Plan</p>
                  <h3 className="font-display font-bold text-2xl text-[var(--text-primary)]">{dealer?.plan ?? 'Growth'}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">₹6,999/month · Billed monthly</p>
                </div>
                <Badge variant="active">Active</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[['2,000', 'AI Calls/mo'], ['5,000', 'WhatsApp msgs'], ['All 6', 'Agent modules']].map(([v, l]) => (
                  <div key={l} className="text-center p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                    <p className="text-base font-bold text-brand-400">{v}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{l}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Starter', price: '₹2,999', features: ['500 AI calls', '1,000 WhatsApp', 'CRM + 3 modules'] },
                { name: 'Growth', price: '₹6,999', features: ['2,000 AI calls', '5,000 WhatsApp', 'All 6 modules'], current: true },
                { name: 'Pro', price: '₹14,999', features: ['Unlimited calls', 'Unlimited WA', 'Custom AI models', 'Tally sync'] },
              ].map(plan => (
                <Card key={plan.name} className={plan.current ? 'border-brand-400/30 bg-[rgba(74,222,128,0.04)]' : ''}>
                  <p className="font-display font-bold text-base text-[var(--text-primary)]">{plan.name}</p>
                  <p className="text-xl font-bold text-brand-400 my-1">{plan.price}<span className="text-xs text-[var(--text-muted)]">/mo</span></p>
                  <div className="space-y-1.5 my-3">
                    {plan.features.map(f => <p key={f} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><CheckCircle size={10} className="text-brand-400 flex-shrink-0" />{f}</p>)}
                  </div>
                  <Button variant={plan.current ? 'secondary' : 'outline'} size="sm" className="w-full justify-center">
                    {plan.current ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
