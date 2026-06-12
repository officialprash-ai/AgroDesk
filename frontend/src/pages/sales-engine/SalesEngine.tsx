import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, TabBar, Modal, Input, Select, ProgressBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatRelative, LANGUAGES } from '../../lib/utils';
import { Megaphone, Plus, Play, Pause, StopCircle, Sparkles, Phone, MessageSquare, Mail, Users, BarChart2, Target, Zap } from 'lucide-react';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  voice: <Phone size={12} />, whatsapp: <MessageSquare size={12} />,
  sms: <Zap size={12} />, email: <Mail size={12} />,
};
const CHANNEL_COLORS: Record<string, string> = {
  voice: '#fbbf24', whatsapp: '#4ade80', sms: '#60a5fa', email: '#a78bfa',
};

export const SalesEngine: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data, refetch } = useApi(() => api.campaigns.list(dealerId), [dealerId]);
  const campaigns = data?.campaigns ?? [];
  const [tab, setTab] = useState('campaigns');
  const [showNew, setShowNew] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp']);

  const toggleChannel = (ch: string) =>
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);

  const [campForm, setCampForm] = useState({ name: '', goal: '', language: 'hi' });
  const [campLoading, setCampLoading] = useState(false);

  const handleCreateCampaign = async () => {
    if (!campForm.name) return;
    setCampLoading(true);
    try {
      await api.campaigns.create({
        dealer_id: dealerId,
        name: campForm.name,
        goal: campForm.goal,
        channels: selectedChannels,
        language: campForm.language,
      });
      setShowNew(false);
      setCampForm({ name: '', goal: '', language: 'hi' });
      setSelectedChannels(['whatsapp']);
      refetch();
      openScriptModal('cold_call_new');
    } catch (e) {
      console.error(e);
    }
    setCampLoading(false);
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Sales Engine" subtitle="Module A · Automated outreach & campaign management" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Campaigns" value={campaigns.filter(c => c.status === 'running').length} icon={<Megaphone size={16} />} accent="#4ade80" />
          <MetricCard label="Messages Sent" value="1,284" sub="This month" icon={<Zap size={16} />} accent="#60a5fa" />
          <MetricCard label="Responses" value="312" sub="24.3% rate" icon={<Users size={16} />} accent="#fbbf24" />
          <MetricCard label="Interested Leads" value="87" sub="From campaigns" icon={<Target size={16} />} accent="#a78bfa" />
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <TabBar tabs={[
            { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
            { id: 'templates', label: 'Templates' },
            { id: 'schedule', label: 'Schedule' },
          ]} active={tab} onChange={setTab} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Sparkles size={13} />} onClick={() => openScriptModal('cold_call_new')}>
              AI Script
            </Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>New Campaign</Button>
          </div>
        </div>

        {/* Campaign Cards */}
        {tab === 'campaigns' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map(c => (
              <Card key={c.id} className="space-y-4" hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{c.name}</h3>
                      <Badge variant={c.status === 'running' ? 'active' : c.status === 'paused' ? 'pending' : 'info'}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{c.goal}</p>
                  </div>
                </div>

                {/* Channels */}
                <div className="flex gap-2">
                  {c.channels.map(ch => (
                    <span key={ch} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: `${CHANNEL_COLORS[ch]}15`, color: CHANNEL_COLORS[ch], border: `1px solid ${CHANNEL_COLORS[ch]}30` }}>
                      {CHANNEL_ICONS[ch]}{ch}
                    </span>
                  ))}
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
                    {LANGUAGES.find(l => l.code === c.language)?.label}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <ProgressBar value={c.sent} max={c.total_contacts} label={`Sent: ${c.sent}/${c.total_contacts}`} color="#60a5fa" />
                  <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                    <span>Responses: <strong className="text-brand-400">{c.responses}</strong></span>
                    <span>Interested: <strong className="text-amber-400">{c.interested}</strong></span>
                    <span>Rate: <strong className="text-[var(--text-primary)]">{c.total_contacts ? Math.round((c.responses / c.sent) * 100) || 0 : 0}%</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                  {c.status === 'running' ? (
                    <Button variant="secondary" size="sm" icon={<Pause size={12} />}>Pause</Button>
                  ) : (
                    <Button size="sm" icon={<Play size={12} />}>Resume</Button>
                  )}
                  <Button variant="ghost" size="sm" icon={<BarChart2 size={12} />}>Stats</Button>
                  <Button variant="ghost" size="sm" icon={<Sparkles size={12} />}
                    onClick={() => openScriptModal('cold_call_new', { campaign: c })}>
                    Script
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { name: 'Rabi Season Promo', type: 'WhatsApp Template', lang: 'Marathi', approved: true },
              { name: 'Tractor Demo Invite', type: 'SMS Template', lang: 'Hindi', approved: true },
              { name: 'New Arrival Alert', type: 'WhatsApp Template', lang: 'Marathi', approved: false },
            ].map(t => (
              <Card key={t.name} hover>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</h3>
                  <Badge variant={t.approved ? 'active' : 'pending'}>{t.approved ? 'Approved' : 'Pending'}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">{t.type} · {t.lang}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">Preview</Button>
                  <Button variant="ghost" size="sm" icon={<Sparkles size={12} />}>Edit with AI</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* New Campaign Modal */}
        <Modal open={showNew} onClose={() => setShowNew(false)} title="Create New Campaign" size="lg">
          <div className="space-y-4">
            <Input label="Campaign Name" placeholder="e.g. Rabi Season 2024 Outreach" value={campForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Goal" placeholder="e.g. Generate 50 new enquiries for Mahindra 575 DI" value={campForm.goal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampForm(f => ({ ...f, goal: e.target.value }))} />

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Channels</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CHANNEL_ICONS).map(([ch]) => (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${selectedChannels.includes(ch) ? 'border-brand-400 bg-[rgba(74,222,128,0.1)] text-brand-400' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                    {CHANNEL_ICONS[ch]}{ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select label="Language" options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))} value={campForm.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCampForm(f => ({ ...f, language: e.target.value }))} />
              <Input label="Contact List" placeholder="Upload CSV or select group" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" />
              <Input label="End Date" type="date" />
            </div>

            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Sparkles size={12} className="text-brand-400" />
                AI will generate optimized scripts in your selected language
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button icon={<Sparkles size={13} />} onClick={handleCreateCampaign} disabled={campLoading}>
                {campLoading ? 'Creating...' : 'Create & Generate Scripts'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
