import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, TabBar, Modal, Input, Select, ProgressBar, EmptyState } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { LANGUAGES } from '../../lib/utils';
import {
  Megaphone, Plus, Play, Pause, Wand2, Phone, MessageSquare, Mail,
  Users, BarChart2, Target, Zap, Copy, Check, RefreshCw, Upload,
  Clock, Calendar, Send, TrendingUp, Eye, Edit3,
  FileText, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  voice: <Phone size={12} />, whatsapp: <MessageSquare size={12} />,
  sms: <Zap size={12} />, email: <Mail size={12} />,
};
const CHANNEL_COLORS: Record<string, string> = {
  voice: '#fbbf24', whatsapp: '#4ade80', sms: '#60a5fa', email: '#a78bfa',
};

const SCHEDULE_SLOTS = [
  { day: 'Mon', time: '09:00', count: 87, status: 'sent' },
  { day: 'Mon', time: '17:00', count: 45, status: 'sent' },
  { day: 'Tue', time: '10:00', count: 120, status: 'sent' },
  { day: 'Wed', time: '09:30', count: 98, status: 'pending' },
  { day: 'Thu', time: '11:00', count: 150, status: 'pending' },
  { day: 'Fri', time: '09:00', count: 200, status: 'scheduled' },
  { day: 'Sat', time: '10:00', count: 75, status: 'scheduled' },
];

const MOCK_TEMPLATES = [
  {
    id: 't1', name: 'Rabi Season Promo', type: 'WhatsApp',  lang: 'Marathi', approved: true,
    body: `नमस्कार {नाव}!\n\nरब्बी हंगामात नवीन ट्रॅक्टरवर ₹25,000 कॅशबॅक मिळवा! 🚜\n\nJohn Deere 5310 - ₹8.5L पासून\nMahindra 575 DI - ₹6.2L पासून\n\nआजच showroom ला भेट द्या.\n📍 {डीलर_नाव}, {शहर}\n📞 {फोन}`,
  },
  {
    id: 't2', name: 'Tractor Demo Invite', type: 'SMS', lang: 'Hindi', approved: true,
    body: `{नाम} जी, आपको हमारे Tractor Demo में आमंत्रित किया जाता है!\n\nतारीख: {तारीख}\nस्थान: {पता}\n\nNew Mahindra & John Deere models का live demo देखें। EMI 0% से शुरू।\n\nConfirm करें: {link}`,
  },
  {
    id: 't3', name: 'New Arrival Alert', type: 'WhatsApp', lang: 'Marathi', approved: false,
    body: `📢 नवीन आगमन!\n\n{मॉडेल} आता {डीलर} येथे उपलब्ध आहे.\n\n✅ {HP} HP इंजिन\n✅ {वर्षे} वर्षांची वॉरंटी\n✅ Easy Finance उपलब्ध\n\nTest Drive साठी संपर्क: {फोन}`,
  },
];

// ── Script generator ──────────────────────────────────────────────────────────

function generateScript(campaign: Record<string, unknown>, channel: string): string {
  const name = String(campaign?.name ?? 'Campaign');
  const goal = String(campaign?.goal ?? '');
  if (channel === 'voice') return `नमस्कार! मी ${String(campaign?.dealer_name ?? 'AgroDesk')} मधून बोलत आहे.\n\nआपल्याला ${name} बद्दल माहिती द्यायची आहे.\n\n${goal}\n\nआपण आमच्या showroom ला भेट द्यायला आवडेल का? मी आपल्यासाठी appointment book करतो.\n\n[जर होय] — ठीक आहे, मी तुमचे नाव आणि सोयीचा दिवस नोंदवतो.\n[जर नाही] — ठीक आहे, कधी वेळ असेल तेव्हा संपर्क करा. धन्यवाद!`;
  if (channel === 'whatsapp') return `नमस्कार {नाव} जी! 🙏\n\n*${name}*\n\n${goal}\n\n✅ EMI सुविधा उपलब्ध\n✅ Free Test Drive\n✅ Exchange Offer\n\nअधिक माहितीसाठी reply करा किंवा खाली दिलेल्या link वर click करा 👇\n{link}`;
  return `${name}\n\n${goal}\n\nContact us: {phone}`;
}

// ── Stats chart data ──────────────────────────────────────────────────────────

function getStatsData(c: Record<string, unknown>) {
  const sent = Number(c?.sent ?? 0);
  const responses = Number(c?.responses ?? 0);
  const interested = Number(c?.interested ?? 0);
  return {
    daily: [
      { day: 'Mon', sent: Math.round(sent * 0.18), resp: Math.round(responses * 0.15) },
      { day: 'Tue', sent: Math.round(sent * 0.22), resp: Math.round(responses * 0.20) },
      { day: 'Wed', sent: Math.round(sent * 0.15), resp: Math.round(responses * 0.12) },
      { day: 'Thu', sent: Math.round(sent * 0.25), resp: Math.round(responses * 0.28) },
      { day: 'Fri', sent: Math.round(sent * 0.20), resp: Math.round(responses * 0.25) },
    ],
    pie: [
      { name: 'Interested', value: interested, color: '#4ade80' },
      { name: 'Responded', value: responses - interested, color: '#60a5fa' },
      { name: 'No Response', value: sent - responses, color: 'rgba(255,255,255,0.08)' },
    ],
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export const SalesEngine: React.FC = () => {
  const { dealer } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data, refetch } = useApi(() => api.campaigns.list(dealerId), [dealerId]);
  const campaigns: Record<string, unknown>[] = (data as { campaigns?: Record<string, unknown>[] } | undefined)?.campaigns ?? [];

  // tab
  const [tab, setTab] = useState('campaigns');

  // campaign action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // modals
  const [showNew,     setShowNew]     = useState(false);
  const [showStats,   setShowStats]   = useState(false);
  const [showScript,  setShowScript]  = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Record<string, unknown> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof MOCK_TEMPLATES[0] | null>(null);

  // script state
  const [scriptChannel, setScriptChannel] = useState('whatsapp');
  const [scriptText, setScriptText] = useState('');
  const [scriptCopied, setScriptCopied] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);

  // new campaign form
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp']);
  const [campForm, setCampForm] = useState({ name: '', goal: '', language: 'hi', startDate: '', endDate: '' });
  const [campLoading, setCampLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<string | null>(null);


  // template edit
  const [editBody, setEditBody] = useState('');

  // ── handlers ────────────────────────────────────────────────────────────────

  const toggleStatus = async (c: Record<string, unknown>) => {
    const newStatus = c.status === 'running' ? 'paused' : 'running';
    setActionLoading(String(c.id) + '_status');
    try { await api.campaigns.setStatus(String(c.id), newStatus); refetch(); } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const openStats = (c: Record<string, unknown>) => { setSelectedCampaign(c); setShowStats(true); };

  const openScript = (c: Record<string, unknown>) => {
    setSelectedCampaign(c);
    setScriptChannel((Array.isArray(c.channels) && c.channels[0]) ? String(c.channels[0]) : 'whatsapp');
    setScriptText(generateScript(c, (Array.isArray(c.channels) && c.channels[0]) ? String(c.channels[0]) : 'whatsapp'));
    setShowScript(true);
  };

  const regenerateScript = () => {
    setScriptLoading(true);
    setTimeout(() => {
      if (selectedCampaign) setScriptText(generateScript(selectedCampaign, scriptChannel));
      setScriptLoading(false);
    }, 900);
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(scriptText).catch(() => {});
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 1800);
  };

  const handleCreateCampaign = async () => {
    if (!campForm.name) return;
    setCampLoading(true);
    try {
      await api.campaigns.create({
        dealer_id: dealerId, name: campForm.name, goal: campForm.goal,
        channels: selectedChannels, language: campForm.language,
      });
      setShowNew(false);
      setCampForm({ name: '', goal: '', language: 'hi', startDate: '', endDate: '' });
      setSelectedChannels(['whatsapp']);
      setCsvFile(null);
      refetch();
    } catch (e) { console.error(e); }
    setCampLoading(false);
  };

  const openTemplatePreview = (t: typeof MOCK_TEMPLATES[0]) => { setSelectedTemplate(t); setShowPreview(true); };
  const openTemplateEdit    = (t: typeof MOCK_TEMPLATES[0]) => { setSelectedTemplate(t); setEditBody(t.body); setShowEdit(true); };

  const campaignsByStatus = {
    running: campaigns.filter(c => c.status === 'running').length,
    paused:  campaigns.filter(c => c.status === 'paused').length,
    idle:    campaigns.filter(c => c.status === 'idle').length,
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Sales Engine" subtitle="Module A · Automated outreach & campaign management" />
      <div className="p-6 space-y-5">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { label: 'Active Campaigns', value: campaignsByStatus.running, icon: <Megaphone size={16} />, accent: '#4ade80', trend: { value: 12, label: 'vs last month' } },
            { label: 'Messages Sent', value: '1,284', sub: 'This month', icon: <Zap size={16} />, accent: '#60a5fa', trend: { value: 8, label: 'vs last month' } },
            { label: 'Responses', value: '312', sub: '24.3% rate', icon: <Users size={16} />, accent: '#fbbf24', trend: { value: 3, label: 'vs last month' } },
            { label: 'Interested Leads', value: '87', sub: 'From campaigns', icon: <Target size={16} />, accent: '#a78bfa', trend: { value: 15, label: 'vs last month' } },
          ] as any[]).map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <MetricCard {...m} />
            </motion.div>
          ))}
        </div>

        {/* Tab bar + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabBar tabs={[
            { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
            { id: 'templates', label: 'Templates', count: MOCK_TEMPLATES.length },
            { id: 'schedule',  label: 'Schedule' },
          ]} active={tab} onChange={setTab} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Wand2 size={13} />}
              onClick={() => { setSelectedCampaign(campaigns[0] ?? {}); setScriptChannel('whatsapp'); setScriptText(generateScript(campaigns[0] ?? {}, 'whatsapp')); setShowScript(true); }}>
              AI Script
            </Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>New Campaign</Button>
          </div>
        </div>

        {/* ── Campaigns Tab ─────────────────────────────────────────────────── */}
        {tab === 'campaigns' && (
          campaigns.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={32} />}
              title="No campaigns yet"
              message="Create your first outreach campaign to start connecting with leads."
              action={<Button icon={<Plus size={13} />} onClick={() => setShowNew(true)}>Create Campaign</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaigns.map((c, idx) => {
                const sent = Number(c.sent ?? 0);
                const total = Number(c.total_contacts ?? 1);
                const responses = Number(c.responses ?? 0);
                const interested = Number(c.interested ?? 0);
                const rate = sent > 0 ? Math.round((responses / sent) * 100) : 0;
                const isRunning = c.status === 'running';
                const loadingThis = actionLoading === String(c.id) + '_status';
                return (
                  <motion.div
                    key={String(c.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                  <Card className="space-y-4 h-full" hover>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{String(c.name)}</h3>
                          <Badge variant={isRunning ? 'active' : c.status === 'paused' ? 'pending' : 'info'}>
                            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow inline-block mr-1" />}
                            {String(c.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{String(c.goal ?? '')}</p>
                      </div>
                    </div>

                    {/* Channels + lang */}
                    <div className="flex gap-2 flex-wrap">
                      {(Array.isArray(c.channels) ? c.channels : []).map((ch: unknown) => (
                        <span key={String(ch)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: `${CHANNEL_COLORS[String(ch)] ?? '#888'}18`, color: CHANNEL_COLORS[String(ch)] ?? '#888', border: `1px solid ${CHANNEL_COLORS[String(ch)] ?? '#888'}30` }}>
                          {CHANNEL_ICONS[String(ch)]}{String(ch)}
                        </span>
                      ))}
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
                        {LANGUAGES.find(l => l.code === String(c.language))?.label ?? String(c.language)}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <ProgressBar value={sent} max={total || 1} label={`Sent: ${sent}/${total}`} color={isRunning ? '#60a5fa' : 'rgba(255,255,255,0.2)'} />
                      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                        <span>Responses: <strong className="text-brand-400">{responses}</strong></span>
                        <span>Interested: <strong className="text-amber-400">{interested}</strong></span>
                        <span>Rate: <strong className="text-[var(--text-primary)]">{rate}%</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                      <Button
                        variant={isRunning ? 'secondary' : 'primary'}
                        size="sm"
                        icon={loadingThis ? <RefreshCw size={12} className="animate-spin" /> : isRunning ? <Pause size={12} /> : <Play size={12} />}
                        onClick={() => toggleStatus(c)}
                        loading={loadingThis}
                      >
                        {isRunning ? 'Pause' : 'Resume'}
                      </Button>
                      <Button variant="ghost" size="sm" icon={<BarChart2 size={12} />} onClick={() => openStats(c)}>Stats</Button>
                      <Button variant="ghost" size="sm" icon={<Wand2 size={12} />} onClick={() => openScript(c)}>Script</Button>
                    </div>
                  </Card>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* ── Templates Tab ─────────────────────────────────────────────────── */}
        {tab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {MOCK_TEMPLATES.map(t => (
              <Card key={t.id} hover className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{t.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.type} · {t.lang}</p>
                  </div>
                  <Badge variant={t.approved ? 'active' : 'pending'}>{t.approved ? 'Approved' : 'Pending'}</Badge>
                </div>

                {/* Preview snippet */}
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 whitespace-pre-line leading-relaxed">{t.body}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<Eye size={12} />} onClick={() => openTemplatePreview(t)} className="flex-1">Preview</Button>
                  <Button variant="ghost" size="sm" icon={<Edit3 size={12} />} onClick={() => openTemplateEdit(t)} className="flex-1">Edit with AI</Button>
                </div>
              </Card>
            ))}

            {/* Add template card */}
            <Card className="flex flex-col items-center justify-center gap-3 py-8 border-dashed cursor-pointer hover:border-brand-400/40 transition-colors" onClick={() => setShowNew(true)}>
              <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
                <Plus size={18} className="text-brand-400" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">New Template</p>
            </Card>
          </div>
        )}

        {/* ── Schedule Tab ──────────────────────────────────────────────────── */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            {/* Week view */}
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                const slots = SCHEDULE_SLOTS.filter(s => s.day === day);
                return (
                  <div key={day} className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-muted)] text-center uppercase tracking-wide">{day}</p>
                    {slots.map((slot, i) => (
                      <div key={i} className={`rounded-xl p-2 border text-center cursor-pointer hover:border-brand-400/40 transition-all ${
                        slot.status === 'sent' ? 'bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.2)]' :
                        slot.status === 'pending' ? 'bg-[rgba(251,191,36,0.06)] border-[rgba(251,191,36,0.2)]' :
                        'bg-[rgba(96,165,250,0.06)] border-[rgba(96,165,250,0.2)]'
                      }`}>
                        <p className="text-[10px] font-mono text-[var(--text-secondary)]">{slot.time}</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{slot.count}</p>
                        <p className={`text-[9px] font-medium ${
                          slot.status === 'sent' ? 'text-brand-400' :
                          slot.status === 'pending' ? 'text-amber-400' : 'text-blue-400'
                        }`}>{slot.status}</p>
                      </div>
                    ))}
                    {slots.length === 0 && (
                      <button className="w-full h-16 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-brand-400/30 hover:text-brand-400 transition-all text-xs">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upcoming sends */}
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar size={14} className="text-brand-400" /> Upcoming Sends
              </h3>
              {SCHEDULE_SLOTS.filter(s => s.status !== 'sent').map((slot, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(96,165,250,0.1)] flex items-center justify-center">
                      <Clock size={13} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">{slot.day} at {slot.time}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{slot.count} messages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={slot.status === 'pending' ? 'pending' : 'info'}>{slot.status}</Badge>
                    <Button variant="ghost" size="sm" icon={<Send size={11} />}>Send Now</Button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* New Campaign */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create New Campaign" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Input label="Campaign Name *" placeholder="e.g. Rabi Season 2025 Outreach" value={campForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampForm(f => ({ ...f, name: e.target.value }))} />
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Goal</label>
              <textarea value={campForm.goal} placeholder="e.g. Generate 50 new enquiries for Mahindra 575 DI this month"
                rows={2} className="ag-input resize-none w-full text-sm"
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Channels</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(CHANNEL_ICONS).map(ch => (
                <button key={ch} onClick={() => setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${selectedChannels.includes(ch) ? 'border-brand-400 bg-[rgba(74,222,128,0.1)] text-brand-400' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-bright)]'}`}>
                  {CHANNEL_ICONS[ch]}{ch}
                </button>
              ))}
            </div>
          </div>

          {/* Language + dates */}
          <div className="grid grid-cols-3 gap-3">
            <Select label="Language" options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))}
              value={campForm.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCampForm(f => ({ ...f, language: e.target.value }))} />
            <Input label="Start Date" type="date" value={campForm.startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={campForm.endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>

          {/* CSV upload */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Contact List</label>
            <input id="campaign-csv-input" type="file" accept=".csv" className="hidden"
              onChange={e => { setCsvFile(e.target.files?.[0]?.name ?? null); e.target.value = ''; }} />
            <label htmlFor="campaign-csv-input"
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm transition-all cursor-pointer ${csvFile ? 'border-brand-400/40 bg-[rgba(74,222,128,0.04)] text-brand-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400/30 hover:text-brand-400'}`}>
              {csvFile ? <><CheckCircle2 size={14} />{csvFile}</> : <><Upload size={14} />Upload CSV contact list</>}
            </label>
          </div>

          {/* AI hint */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(74,222,128,0.04)] border border-[var(--border)]">
            <Wand2 size={12} className="text-brand-400 flex-shrink-0" />
            <p className="text-xs text-[var(--text-secondary)]">AI will auto-generate scripts in your selected language after creation.</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button icon={<Plus size={13} />} onClick={handleCreateCampaign} loading={campLoading} disabled={!campForm.name}>
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stats Modal */}
      <Modal open={showStats && !!selectedCampaign} onClose={() => setShowStats(false)} title="Campaign Stats" size="xl">
        {selectedCampaign && (() => {
          const sent = Number(selectedCampaign.sent ?? 0);
          const resp = Number(selectedCampaign.responses ?? 0);
          const inter = Number(selectedCampaign.interested ?? 0);
          const total = Number(selectedCampaign.total_contacts ?? 1);
          const stats = getStatsData(selectedCampaign);
          return (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Sent',  value: sent,  color: '#60a5fa', icon: <Send size={14} /> },
                  { label: 'Delivered',   value: Math.round(sent * 0.97), color: '#4ade80', icon: <CheckCircle2 size={14} /> },
                  { label: 'Responded',   value: resp,  color: '#fbbf24', icon: <MessageSquare size={14} /> },
                  { label: 'Interested',  value: inter, color: '#a78bfa', icon: <TrendingUp size={14} /> },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: k.color }}>{k.icon}</span>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{k.label}</p>
                    </div>
                    <p className="font-display font-bold text-xl text-[var(--text-primary)]">{k.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">Daily Messages</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.daily} barGap={4}>
                      <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="sent" name="Sent" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resp" name="Responses" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 self-start">Response Breakdown</p>
                  <PieChart width={120} height={120}>
                    <Pie data={stats.pie} cx={55} cy={55} innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                      {stats.pie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="space-y-1 self-start w-full mt-2">
                    {stats.pie.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                        <span className="font-medium text-[var(--text-primary)]">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Campaign Progress</p>
                <ProgressBar value={sent} max={total || 1} label={`${sent} / ${total} contacts reached`} color="#60a5fa" />
                <ProgressBar value={resp} max={sent || 1} label={`${resp} responded (${sent > 0 ? Math.round(resp / sent * 100) : 0}%)`} color="#4ade80" />
                <ProgressBar value={inter} max={resp || 1} label={`${inter} interested (${resp > 0 ? Math.round(inter / resp * 100) : 0}% of responses)`} color="#a78bfa" />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Script Modal */}
      <Modal open={showScript} onClose={() => setShowScript(false)} title="AI Campaign Script" size="lg">
        {selectedCampaign && (
          <div className="space-y-4">
            {/* Channel selector */}
            <div className="flex gap-2">
              {(Array.isArray(selectedCampaign.channels) ? selectedCampaign.channels : ['whatsapp']).map((ch: unknown) => (
                <button key={String(ch)} onClick={() => { setScriptChannel(String(ch)); setScriptText(generateScript(selectedCampaign, String(ch))); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${scriptChannel === String(ch) ? 'border-brand-400 bg-[rgba(74,222,128,0.1)] text-brand-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)]'}`}>
                  {CHANNEL_ICONS[String(ch)]}{String(ch)}
                </button>
              ))}
            </div>

            {/* Campaign context */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[rgba(74,222,128,0.04)] border border-[var(--border-brand)]">
              <AlertCircle size={13} className="text-brand-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{String(selectedCampaign.name)}</strong> — {String(selectedCampaign.goal ?? '')}</p>
            </div>

            {/* Script textarea */}
            <div className="relative">
              <textarea value={scriptText} onChange={e => setScriptText(e.target.value)}
                rows={10} className="ag-input resize-none w-full text-sm font-mono leading-relaxed"
                placeholder="AI script will appear here…" />
              {scriptLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.5)] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-brand-400 text-sm">
                    <RefreshCw size={14} className="animate-spin" />Regenerating…
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="secondary" size="sm" icon={<RefreshCw size={12} />} onClick={regenerateScript} loading={scriptLoading}>Regenerate</Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={scriptCopied ? <Check size={12} /> : <Copy size={12} />} onClick={copyScript}>
                  {scriptCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="sm" icon={<FileText size={12} />} onClick={() => setShowScript(false)}>Save Script</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Preview Modal */}
      <Modal open={showPreview && !!selectedTemplate} onClose={() => setShowPreview(false)} title="Template Preview" size="md">
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{selectedTemplate.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedTemplate.type} · {selectedTemplate.lang}</p>
              </div>
              <Badge variant={selectedTemplate.approved ? 'active' : 'pending'}>{selectedTemplate.approved ? 'Approved' : 'Pending'}</Badge>
            </div>
            {/* WhatsApp bubble mock */}
            <div className="p-4 rounded-2xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-brand-400 flex items-center justify-center"><MessageSquare size={12} className="text-surface-900" /></div>
                <p className="text-xs font-semibold text-brand-400">AgroDesk AI</p>
              </div>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed">{selectedTemplate.body}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-2 text-right">now ✓✓</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowPreview(false); openTemplateEdit(selectedTemplate); }} icon={<Edit3 size={12} />}>Edit</Button>
              <Button size="sm" onClick={() => setShowPreview(false)}>Use Template</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Edit Modal */}
      <Modal open={showEdit && !!selectedTemplate} onClose={() => setShowEdit(false)} title="Edit Template with AI" size="lg">
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(74,222,128,0.04)] border border-[var(--border)]">
              <Wand2 size={12} className="text-brand-400 flex-shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">Edit manually or use AI to refine tone, add offers, or translate.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Template Body</label>
              <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={9}
                className="ag-input resize-none w-full text-sm leading-relaxed" />
            </div>
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                {['Make formal', 'Add offer', 'Shorten'].map(action => (
                  <butto