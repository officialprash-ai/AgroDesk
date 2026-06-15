import React, { useState, useCallback, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, ProgressBar, Modal, Select, Input } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { LANGUAGES } from '../../lib/utils';
import {
  Phone, Upload, Play, Pause, Users, CheckCircle, XCircle,
  Clock, Sparkles, Download, AlertCircle, CalendarDays,
  X, Pencil, UserPlus, Plus, RefreshCw,
} from 'lucide-react';

// ─── Types & Constants ────────────────────────────────────────
interface Call {
  id: number | string;
  name: string;
  phone: string;
  status: string;
  duration: number;
  language: string;
  score: number;
  time: string;
  note: string;
  callback_date?: string;
  added_to_crm?: boolean;
}

const INITIAL_CALLS: Call[] = [
  { id: 1, name: 'Mohan Shinde',     phone: '+919876500001', status: 'interested',    duration: 142, language: 'mr', score: 85, time: '10:32 AM', note: 'Wants demo on Saturday' },
  { id: 2, name: 'Kiran Pawar',      phone: '+919876500002', status: 'not_interested', duration: 38,  language: 'mr', score: 10, time: '10:28 AM', note: 'Already bought from competitor' },
  { id: 3, name: 'Ashok Kulkarni',   phone: '+919876500003', status: 'callback',      duration: 65,  language: 'hi', score: 60, time: '10:25 AM', note: 'Call back after 5 PM' },
  { id: 4, name: 'Santosh Yadav',    phone: '+919876500004', status: 'in_progress',   duration: 0,   language: 'mr', score: 0,  time: '10:33 AM', note: '' },
  { id: 5, name: 'Dnyaneshwar Mane', phone: '+919876500005', status: 'pending',       duration: 0,   language: 'mr', score: 0,  time: '—',        note: '' },
  { id: 6, name: 'Ramkrishna Nair',  phone: '+919876500006', status: 'interested',    duration: 198, language: 'mr', score: 92, time: '10:18 AM', note: 'Ready to visit, needs financing info' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  interested:    { label: 'Interested',    color: '#4ade80', icon: CheckCircle },
  not_interested:{ label: 'Not Interested',color: '#6b7280', icon: XCircle },
  callback:      { label: 'Callback',      color: '#fbbf24', icon: Clock },
  in_progress:   { label: 'In Call',       color: '#60a5fa', icon: Phone },
  pending:       { label: 'Pending',       color: '#374151', icon: Clock },
  failed:        { label: 'Failed',        color: '#ef4444', icon: AlertCircle },
};

// ─── Helpers ──────────────────────────────────────────────────
function fmtDuration(secs: number) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

function parseCSV(text: string): Pick<Call, 'name' | 'phone' | 'language' | 'note'>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: Pick<Call, 'name' | 'phone' | 'language' | 'note'>[] = [];
  const isHeader = (line: string) => /name|phone|contact/i.test(line.split(',')[0]);
  const start = isHeader(lines[0]) ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const name = cols[0] || `Contact ${i}`;
    const phone = cols[1]?.replace(/\D/g, '') ? `+91${cols[1].replace(/\D/g, '').slice(-10)}` : '';
    const note = cols[2] ?? '';
    if (name && phone) results.push({ name, phone, language: 'mr', note, status: 'pending', duration: 0, score: 0, time: '—', id: Date.now() + i } as any);
  }
  return results;
}

function exportCSV(calls: Call[]) {
  const header = 'Name,Phone,Status,Score,Duration,Time,Note,Language\n';
  const rows = calls.map(c =>
    `"${c.name}","${c.phone}","${STATUS_CONFIG[c.status]?.label ?? c.status}",${c.score},${fmtDuration(c.duration)},"${c.time}","${c.note}","${c.language}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cold-calls-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
      style={{ background: type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: type === 'success' ? '#4ade80' : '#f87171', backdropFilter: 'blur(12px)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export const ColdCalling: React.FC = () => {
  const { openScriptModal, dealer } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';

  // ── Calls State ──────────────────────────────────────────
  const [calls, setCalls] = useState<Call[]>(INITIAL_CALLS);
  const [running, setRunning] = useState(false);
  const [liveTimer, setLiveTimer] = useState(0);
  const [filter, setFilter] = useState('all');
  const [campaignName, setCampaignName] = useState('Rabi Season Cold Call Campaign');
  const [campaignLang, setCampaignLang] = useState('mr');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type }), []);

  // ── Modals ───────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLang, setUploadLang] = useState('mr');
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);


  const [crmModal, setCrmModal] = useState<{ open: boolean; call?: Call }>({ open: false });
  const [crmForm, setCrmForm] = useState({ name: '', phone: '', village: '', language: 'mr' });
  const [crmLoading, setCrmLoading] = useState(false);

  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; call?: Call }>({ open: false });
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [editNoteModal, setEditNoteModal] = useState<{ open: boolean; call?: Call; note: string }>({ open: false, note: '' });

  const [newCampaignModal, setNewCampaignModal] = useState(false);
  const [newCampaignForm, setNewCampaignForm] = useState({ name: `Cold Call ${new Date().toLocaleDateString('en-IN')}`, goal: 'Outbound lead qualification', language: 'mr' });
  const [newCampaignLoading, setNewCampaignLoading] = useState(false);

  // ── Live Timer ───────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setLiveTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Current in-progress call
  const currentCall = calls.find(c => c.status === 'in_progress');

  // ── Derived ──────────────────────────────────────────────
  const interested = calls.filter(c => c.status === 'interested');
  const completed = calls.filter(c => ['interested', 'not_interested', 'callback'].includes(c.status)).length;
  const filtered = filter === 'all' ? calls : calls.filter(c => c.status === filter);

  // ── Handlers ─────────────────────────────────────────────
  const handleFileSelect = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setUploadPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleUploadStart = async () => {
    setUploadLoading(true);
    try {
      const newCalls: Call[] = uploadPreview.map((c, i) => ({
        ...c,
        id: Date.now() + i,
        status: 'pending',
        duration: 0,
        score: 0,
        time: '—',
        note: c.note ?? '',
        language: uploadLang,
      }));
      setCalls(prev => [...prev, ...newCalls]);
      await api.campaigns.create({
        dealer_id: dealerId,
        name: campaignName,
        goal: 'Outbound cold calling via uploaded contact list',
        channels: ['voice'],
        language: uploadLang,
        total_contacts: newCalls.length,
      });
      setShowUpload(false);
      setUploadPreview([]);
      setRunning(true);
      setLiveTimer(0);
      showToast(`${newCalls.length} contacts loaded — campaign started!`);
    } catch {
      showToast('Failed to start campaign', 'error');
    }
    setUploadLoading(false);
  };

  const handleToggleRunning = () => {
    setRunning(r => !r);
    if (running) showToast('Campaign paused');
    else { showToast('Campaign resumed'); setLiveTimer(0); }
  };

  const openAddToCrm = (call: Call) => {
    setCrmForm({ name: call.name, phone: call.phone, village: '', language: call.language });
    setCrmModal({ open: true, call });
  };

  const handleAddToCrm = async () => {
    if (!crmForm.name || !crmForm.phone) return;
    setCrmLoading(true);
    try {
      await api.contacts.create({
        dealer_id: dealerId,
        name: crmForm.name,
        phone: crmForm.phone,
        village: crmForm.village,
        language: crmForm.language,
        lead_status: 'interested',
        score: crmModal.call?.score ?? 70,
        tags: ['cold_call', 'interested'],
        opt_in_call: true,
      });
      setCalls(prev => prev.map(c => c.id === crmModal.call?.id ? { ...c, added_to_crm: true } : c));
      setCrmModal({ open: false });
      showToast(`${crmForm.name} added to CRM pipeline!`);
    } catch { showToast('Failed to add contact', 'error'); }
    setCrmLoading(false);
  };

  const openSchedule = (call: Call) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleModal({ open: true, call });
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleModal.call) return;
    setScheduleLoading(true);
    await new Promise(r => setTimeout(r, 600)); // simulate
    setCalls(prev => prev.map(c => c.id === scheduleModal.call?.id ? { ...c, callback_date: `${scheduleDate} ${scheduleTime}`, note: `Callback: ${scheduleDate} at ${scheduleTime}` } : c));
    setScheduleModal({ open: false });
    showToast(`Callback scheduled for ${scheduleDate} at ${scheduleTime}`);
    setScheduleLoading(false);
  };

  const saveNote = () => {
    if (!editNoteModal.call) return;
    setCalls(prev => prev.map(c => c.id === editNoteModal.call?.id ? { ...c, note: editNoteModal.note } : c));
    setEditNoteModal({ open: false, note: '' });
    showToast('Note saved');
  };

  const handleCallRow = (call: Call) => {
    openScriptModal('cold_call_new', { contact: { name: call.name, phone: call.phone, language: call.language } });
    setCalls(prev => prev.map(c => c.id === call.id ? { ...c, status: 'in_progress', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) } : c));
    setRunning(true);
    setLiveTimer(0);
  };

  const handleNewCampaign = async () => {
    setNewCampaignLoading(true);
    try {
      await api.campaigns.create({
        dealer_id: dealerId,
        name: newCampaignForm.name,
        goal: newCampaignForm.goal,
        channels: ['voice'],
        language: newCampaignForm.language,
      });
      setCampaignName(newCampaignForm.name);
      setCampaignLang(newCampaignForm.language);
      setCalls(INITIAL_CALLS.map(c => ({ ...c, status: 'pending', time: '—', duration: 0, score: 0, note: '' })));
      setRunning(false);
      setNewCampaignModal(false);
      showToast('New campaign created!');
    } catch { showToast('Failed to create campaign', 'error'); }
    setNewCampaignLoading(false);
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Cold Calling Agent" subtitle="Module D · AI-powered bulk outreach & lead qualification" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Contacts" value={calls.length} icon={<Users size={16} />} accent="#60a5fa" />
          <MetricCard label="Interested" value={interested.length} sub={calls.length ? `${Math.round(interested.length / calls.length * 100)}% rate` : '0%'} icon={<CheckCircle size={16} />} accent="#4ade80" />
          <MetricCard label="Callbacks" value={calls.filter(c => c.status === 'callback').length} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Completed" value={`${completed}/${calls.length}`} icon={<Phone size={16} />} accent="#a78bfa" />
        </div>

        {/* Campaign Control */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">{campaignName}</h3>
              <p className="text-xs text-[var(--text-muted)]">{LANGUAGES.find(l => l.code === campaignLang)?.label ?? campaignLang} · {calls.length} contacts loaded</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setNewCampaignModal(true)} className="text-xs text-[var(--text-muted)] hover:text-brand-400 flex items-center gap-1 transition-colors">
                <Plus size={11} /> New Campaign
              </button>
              <Badge variant={running ? 'active' : 'info'}>{running ? 'Running' : 'Paused'}</Badge>
            </div>
          </div>

          <ProgressBar value={completed} max={calls.length} label={`Progress: ${completed}/${calls.length} contacts processed`} color="#4ade80" />

          <div className="flex flex-wrap gap-2 mt-4">
            <Button icon={running ? <Pause size={13} /> : <Play size={13} />} onClick={handleToggleRunning}>
              {running ? 'Pause Campaign' : 'Resume Campaign'}
            </Button>
            <Button variant="secondary" icon={<Upload size={13} />} onClick={() => setShowUpload(true)}>Upload Contacts</Button>
            <Button variant="secondary" icon={<Sparkles size={13} />} onClick={() => openScriptModal('cold_call_new')}>AI Script</Button>
            <Button variant="ghost" icon={<Download size={13} />} onClick={() => exportCSV(calls)}>Export Results</Button>
          </div>
        </Card>

        {/* Live Call Visualizer */}
        {running && currentCall && (
          <Card className="bg-[rgba(74,222,128,0.04)] border-brand-400/20">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-400 flex items-center justify-center">
                  <Phone size={16} className="text-surface-900" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-30" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Currently calling: {currentCall.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{currentCall.phone} · {LANGUAGES.find(l => l.code === currentCall.language)?.label} · {fmtDuration(liveTimer)}</p>
              </div>
              <div className="flex items-end gap-1 h-8">
                {[3,5,7,4,6,8,5,3,7,4].map((h, i) => (
                  <div key={i} className="voice-bar" style={{ height: `${h * 4}px` }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="active">AI Voice Active</Badge>
                <Button variant="ghost" size="sm" icon={<RefreshCw size={11} />}
                  onClick={() => { setCalls(prev => prev.map(c => c.status === 'in_progress' ? { ...c, status: 'callback', duration: liveTimer, score: 60, note: 'Callback requested', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) } : c)); setLiveTimer(0); showToast('Call completed — marked callback'); }}>
                  End Call
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'interested', 'callback', 'in_progress', 'not_interested', 'pending'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === s ? 'border-brand-400/30 bg-[rgba(74,222,128,0.1)] text-brand-400' : 'border-[var(--border)] text-[var(--text-secondary)]'
              }`}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
              <span className="ml-1.5 opacity-60">
                {s === 'all' ? calls.length : calls.filter(c => c.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Calls Table */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Duration</th>
                  <th>Time</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cfg = STATUS_CONFIG[c.status];
                  const Icon = cfg?.icon || Phone;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div>
                          <p className="font-medium text-sm text-[var(--text-primary)]">{c.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{c.phone}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]">
                          {LANGUAGES.find(l => l.code === c.language)?.label ?? c.language}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg?.color }}>
                          <Icon size={11} />{cfg?.label ?? c.status}
                        </span>
                      </td>
                      <td>
                        {c.score > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 w-10 rounded-full bg-[rgba(255,255,255,0.06)]">
                              <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 70 ? '#4ade80' : '#fbbf24' }} />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-primary)]">{c.score}</span>
                          </div>
                        ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="text-xs text-[var(--text-secondary)] font-mono">{fmtDuration(c.duration)}</td>
                      <td className="text-xs text-[var(--text-muted)]">{c.time}</td>
                      <td className="max-w-[140px]">
                        <button
                          onClick={() => setEditNoteModal({ open: true, call: c, note: c.note })}
                          className="text-xs text-[var(--text-secondary)] truncate max-w-full block text-left hover:text-brand-400 transition-colors group">
                          {c.note || <span className="text-[var(--text-muted)] italic">Add note…</span>}
                          <Pencil size={9} className="inline ml-1 opacity-0 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          {/* Call button for pending contacts */}
                          {(c.status === 'pending' || c.status === 'callback') && (
                            <button onClick={() => handleCallRow(c)}
                              className="text-xs px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.08)] text-brand-400 hover:bg-[rgba(74,222,128,0.15)] transition-colors flex items-center gap-1">
                              <Phone size={10} /> Call
                            </button>
                          )}
                          {c.status === 'interested' && !c.added_to_crm && (
                            <button onClick={() => openAddToCrm(c)}
                              className="text-xs px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.1)] text-brand-400 hover:bg-[rgba(74,222,128,0.2)] transition-colors flex items-center gap-1">
                              <UserPlus size={10} /> Add to CRM
                            </button>
                          )}
                          {c.status === 'interested' && c.added_to_crm && (
                            <span className="text-xs px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.05)] text-brand-400/50 flex items-center gap-1">
                              <CheckCircle size={10} /> In CRM
                            </span>
                          )}
                          {c.status === 'callback' && (
                            <button onClick={() => openSchedule(c)}
                              className="text-xs px-2 py-1 rounded-lg bg-[rgba(251,191,36,0.1)] text-amber-400 hover:bg-[rgba(251,191,36,0.2)] transition-colors flex items-center gap-1">
                              <CalendarDays size={10} /> Schedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">No contacts found</div>
            )}
          </div>
        </Card>

        {/* ── UPLOAD CONTACTS MODAL ────────────────────────── */}
        <Modal open={showUpload} onClose={() => { setShowUpload(false); setUploadPreview([]); }} title="Upload Contact List" size="md">
          <div className="space-y-4">
            <label htmlFor="csv-file-input" className="h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-brand-400/40 transition-colors flex flex-col items-center justify-center cursor-pointer bg-[rgba(255,255,255,0.02)]">
              <Upload size={20} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {uploadPreview.length > 0 ? `${uploadPreview.length} contacts parsed ✓` : 'Click to upload CSV / Excel'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Columns: Name, Phone, Note (optional)</p>
            </label>
            <input id="csv-file-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />

            {uploadPreview.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 border border-[var(--border)] rounded-xl p-2">
                {uploadPreview.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)] w-28 truncate">{c.name}</span>
                    <span className="font-mono">{c.phone}</span>
                    {c.note && <span className="text-[var(--text-muted)] truncate">{c.note}</span>}
                  </div>
                ))}
                {uploadPreview.length > 5 && <p className="text-xs text-[var(--text-muted)] text-center">+{uploadPreview.length - 5} more…</p>}
              </div>
            )}

            <Select label="Call Language" value={uploadLang} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadLang(e.target.value)}
              options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))} />

            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] space-y-1.5">
              <p className="text-xs font-medium text-[var(--text-primary)]">Auto-actions after upload:</p>
              {['DLT/DND scrub (TRAI compliant)', 'Deduplicate against existing CRM', 'AI calls in selected language', 'Interested leads auto-added to CRM pipeline'].map(item => (
                <p key={item} className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <CheckCircle size={10} className="text-brand-400 flex-shrink-0" />{item}
                </p>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowUpload(false); setUploadPreview([]); }}>Cancel</Button>
              <Button icon={<Play size={13} />} onClick={handleUploadStart} disabled={uploadLoading || uploadPreview.length === 0}>
                {uploadLoading ? 'Starting...' : `Upload ${uploadPreview.length ? `${uploadPreview.length} Contacts & ` : ''}Start Campaign`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── ADD TO CRM MODAL ─────────────────────────────── */}
        <Modal open={crmModal.open} onClose={() => setCrmModal({ open: false })} title="Add Lead to CRM" size="sm">
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)] text-xs text-brand-400 flex items-center gap-2">
              <CheckCircle size={13} /> Score {crmModal.call?.score} · {crmModal.call?.note}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name" value={crmForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrmForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Phone" value={crmForm.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrmForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <Input label="Village / Area (optional)" placeholder="e.g. Sangamner" value={crmForm.village} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrmForm(f => ({ ...f, village: e.target.value }))} />
            <Select label="Language" value={crmForm.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCrmForm(f => ({ ...f, language: e.target.value }))}
              options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCrmModal({ open: false })}>Cancel</Button>
              <Button icon={<UserPlus size={13} />} onClick={handleAddToCrm} disabled={crmLoading}>
                {crmLoading ? 'Adding...' : 'Add to CRM Pipeline'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── SCHEDULE CALLBACK MODAL ──────────────────────── */}
        <Modal open={scheduleModal.open} onClose={() => setScheduleModal({ open: false })} title={`Schedule Callback · ${scheduleModal.call?.name}`} size="sm">
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Note from call: <span className="text-[var(--text-secondary)] italic">"{scheduleModal.call?.note}"</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Callback Date" type="date" value={scheduleDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleDate(e.target.value)} />
              <Input label="Time" type="time" value={scheduleTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleTime(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setScheduleModal({ open: false })}>Cancel</Button>
              <Button icon={<CalendarDays size={13} />} onClick={handleSchedule} disabled={scheduleLoading || !scheduleDate}>
                {scheduleLoading ? 'Scheduling...' : 'Schedule Callback'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── EDIT NOTE MODAL ──────────────────────────────── */}
        <Modal open={editNoteModal.open} onClose={() => setEditNoteModal({ open: false, note: '' })} title={`Note · ${editNoteModal.call?.name}`} size="sm">
          <div className="space-y-3">
            <textarea rows={3} value={editNoteModal.note}
              onChange={e => setEditNoteModal(m => ({ ...m, note: e.target.value }))}
              placeholder="Add notes about this call…"
              className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-brand-400/50" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditNoteModal({ open: false, note: '' })}>Cancel</Button>
              <Button onClick={saveNote}>Save Note</Button>
            </div>
          </div>
        </Modal>

        {/* ── NEW CAMPAIGN MODAL ───────────────────────────── */}
        <Modal open={newCampaignModal} onClose={() => setNewCampaignModal(false)} title="New Cold Call Campaign" size="sm">
          <div className="space-y-4">
            <Input label="Campaign Name" value={newCampaignForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCampaignForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Goal / Description" placeholder="e.g. Kharif season tractor outreach" value={newCampaignForm.goal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCampaignForm(f => ({ ...f, goal: e.target.value }))} />
            <Select label="Call Language" value={newCampaignForm.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCampaignForm(f => ({ ...f, language: e.target.value }))}
              options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNewCampaignModal(false)}>Cancel</Button>
              <Button onClick={handleNewCampaign} disabled={newCampaignLoading}>{newCampaignLoading ? 'Creating...' : 'Create Campaign'}</Button>
            </div>
          </div>
        </Modal>

      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
