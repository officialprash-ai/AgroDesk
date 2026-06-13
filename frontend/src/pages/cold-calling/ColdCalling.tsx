import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, ProgressBar, Modal, Select } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { LANGUAGES } from '../../lib/utils';
import { Phone, Upload, Play, Pause, Users, CheckCircle, XCircle, Clock, Sparkles, Download, AlertCircle } from 'lucide-react';

const MOCK_CALLS = [
  { id: 1, name: 'Mohan Shinde', phone: '+919876500001', status: 'interested', duration: 142, language: 'mr', score: 85, time: '10:32 AM', note: 'Wants demo on Saturday' },
  { id: 2, name: 'Kiran Pawar', phone: '+919876500002', status: 'not_interested', duration: 38, language: 'mr', score: 10, time: '10:28 AM', note: 'Already bought from competitor' },
  { id: 3, name: 'Ashok Kulkarni', phone: '+919876500003', status: 'callback', duration: 65, language: 'hi', score: 60, time: '10:25 AM', note: 'Call back after 5 PM' },
  { id: 4, name: 'Santosh Yadav', phone: '+919876500004', status: 'in_progress', duration: 0, language: 'mr', score: 0, time: '10:33 AM', note: '' },
  { id: 5, name: 'Dnyaneshwar Mane', phone: '+919876500005', status: 'pending', duration: 0, language: 'mr', score: 0, time: '—', note: '' },
  { id: 6, name: 'Ramkrishna Nair', phone: '+919876500006', status: 'interested', duration: 198, language: 'mr', score: 92, time: '10:18 AM', note: 'Ready to visit, needs financing info' },
];

const STATUS_CONFIG = {
  interested: { label: 'Interested', color: '#4ade80', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: '#6b7280', icon: XCircle },
  callback: { label: 'Callback', color: '#fbbf24', icon: Clock },
  in_progress: { label: 'In Call', color: '#60a5fa', icon: Phone },
  pending: { label: 'Pending', color: '#374151', icon: Clock },
  failed: { label: 'Failed', color: '#ef4444', icon: AlertCircle },
};

export const ColdCalling: React.FC = () => {
  const { openScriptModal } = useAppStore();
  const [running, setRunning] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLang, setUploadLang] = useState('mr');
  const [filter, setFilter] = useState('all');

  const { dealer } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleUploadStart = async () => {
    setUploadLoading(true);
    try {
      await api.campaigns.create({
        dealer_id: dealerId,
        name: `Cold Call Campaign ${new Date().toLocaleDateString('en-IN')}`,
        goal: 'Outbound cold calling via uploaded contact list',
        channels: ['voice'],
        language: uploadLang,
      });
      setShowUpload(false);
      setRunning(true);
    } catch (e) {
      console.error(e);
    }
    setUploadLoading(false);
  };

  const calls = MOCK_CALLS;
  const interested = calls.filter(c => c.status === 'interested');
  const completed = calls.filter(c => ['interested', 'not_interested', 'callback'].includes(c.status)).length;

  const filtered = filter === 'all' ? calls : calls.filter(c => c.status === filter);

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Cold Calling Agent" subtitle="Module D · AI-powered bulk outreach & lead qualification" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Contacts" value={calls.length} icon={<Users size={16} />} accent="#60a5fa" />
          <MetricCard label="Interested" value={interested.length} sub={`${Math.round(interested.length / calls.length * 100)}% rate`} icon={<CheckCircle size={16} />} accent="#4ade80" />
          <MetricCard label="Callbacks" value={calls.filter(c => c.status === 'callback').length} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Completed" value={`${completed}/${calls.length}`} icon={<Phone size={16} />} accent="#a78bfa" />
        </div>

        {/* Campaign Control */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Rabi Season Cold Call Campaign</h3>
              <p className="text-xs text-[var(--text-muted)]">Marathi · {calls.length} contacts loaded</p>
            </div>
            <Badge variant={running ? 'active' : 'info'}>{running ? 'Running' : 'Paused'}</Badge>
          </div>

          <ProgressBar value={completed} max={calls.length} label={`Progress: ${completed}/${calls.length} contacts processed`} color="#4ade80" />

          <div className="flex gap-3 mt-4">
            <Button icon={running ? <Pause size={13} /> : <Play size={13} />}
              onClick={() => setRunning(!running)}>
              {running ? 'Pause Campaign' : 'Resume Campaign'}
            </Button>
            <Button variant="secondary" icon={<Upload size={13} />} onClick={() => setShowUpload(true)}>
              Upload Contacts
            </Button>
            <Button variant="secondary" icon={<Sparkles size={13} />} onClick={() => openScriptModal('cold_call_new')}>
              AI Script
            </Button>
            <Button variant="ghost" icon={<Download size={13} />}>Export Results</Button>
          </div>
        </Card>

        {/* Live Call Visualizer */}
        {running && (
          <Card className="bg-[rgba(74,222,128,0.04)] border-brand-400/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-brand-400 flex items-center justify-center">
                  <Phone size={16} className="text-surface-900" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-30" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Currently calling: Santosh Yadav</p>
                <p className="text-xs text-[var(--text-muted)]">+91 98765 00004 · Marathi · 00:42</p>
              </div>
              <div className="flex items-end gap-1 h-8">
                {[3,5,7,4,6,8,5,3,7,4].map((h, i) => (
                  <div key={i} className="voice-bar" style={{ height: `${h * 4}px` }} />
                ))}
              </div>
              <Badge variant="active">AI Voice Active</Badge>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'interested', 'callback', 'in_progress', 'not_interested', 'pending'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === s ? 'border-brand-400/30 bg-[rgba(74,222,128,0.1)] text-brand-400' : 'border-[var(--border)] text-[var(--text-secondary)]'
              }`}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label || s}
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
                  const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
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
                          {LANGUAGES.find(l => l.code === c.language)?.label}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg?.color }}>
                          <Icon size={11} />{cfg?.label}
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
                      <td className="text-xs text-[var(--text-secondary)] font-mono">{c.duration ? `${Math.floor(c.duration/60)}:${String(c.duration%60).padStart(2,'0')}` : '—'}</td>
                      <td className="text-xs text-[var(--text-muted)]">{c.time}</td>
                      <td className="text-xs text-[var(--text-secondary)] max-w-[140px] truncate">{c.note || '—'}</td>
                      <td>
                        <div className="flex gap-1.5">
                          {c.status === 'interested' && (
                            <button className="text-xs px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.1)] text-brand-400 hover:bg-[rgba(74,222,128,0.2)] transition-colors">
                              Add to CRM
                            </button>
                          )}
                          {c.status === 'callback' && (
                            <button className="text-xs px-2 py-1 rounded-lg bg-[rgba(251,191,36,0.1)] text-amber-400">
                              Schedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upload Modal */}
        <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Contact List" size="md">
          <div className="space-y-4">
            <div className="h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-brand-400/40 transition-colors flex flex-col items-center justify-center cursor-pointer bg-[rgba(255,255,255,0.02)]">
              <Upload size={20} className="text-[var(--text-muted)] mb-2" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">Drop CSV / Excel here</p>
              <p className="text-xs text-[var(--text-muted)]">Columns: Name, Phone, Village (optional)</p>
            </div>
            <Select label="Call Language" value={uploadLang} onChange={e => setUploadLang(e.target.value)}
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
              <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button icon={<Play size={13} />} onClick={handleUploadStart} disabled={uploadLoading}>{uploadLoading ? 'Starting...' : 'Upload & Start Campaign'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
