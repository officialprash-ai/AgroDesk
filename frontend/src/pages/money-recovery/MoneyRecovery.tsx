import React, { useState, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, MetricCard, Modal, Input, Select, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatDate, formatRelative } from '../../lib/utils';
import {
  IndianRupee, Phone, MessageSquare, Mail, AlertTriangle,
  CheckCircle, Clock, Sparkles, Play, Shield, Plus,
  X, TrendingUp, FileText, CheckSquare,
  XCircle, ArrowRight,
} from 'lucide-react';

// ─── Stage Config ─────────────────────────────────────────────
const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string; scriptType: string }> = {
  gentle: { label: 'Gentle Reminder', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   desc: 'Friendly first reminder', scriptType: 'recovery_gentle' },
  firm:   { label: 'Firm Reminder',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  desc: 'Clear payment request',  scriptType: 'recovery_firm'   },
  stern:  { label: 'Stern Notice',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',  desc: 'Formal demand',          scriptType: 'recovery_legal'  },
  legal:  { label: 'Legal Notice',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   desc: 'Requires approval',      scriptType: 'recovery_legal'  },
};

const STAGE_ORDER = ['gentle', 'firm', 'stern', 'legal'];

function nextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium"
      style={{ background: type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: type === 'success' ? '#4ade80' : '#f87171', backdropFilter: 'blur(12px)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ─── Outcome Modal ────────────────────────────────────────────
function OutcomeModal({ open, onClose, onSave, channel, caseName }: {
  open: boolean; onClose: () => void;
  onSave: (outcome: string) => Promise<void>;
  channel: string; caseName: string;
}) {
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(false);
  const OUTCOMES = channel === 'voice'
    ? ['Called — No Answer', 'Called — Busy', 'Called — PTP given', 'Called — Refused to pay', 'Called — Payment done', 'Called — Wrong number']
    : channel === 'whatsapp'
    ? ['Message sent — Delivered', 'Message sent — Read (no reply)', 'Message sent — Replied positively', 'Message sent — Replied negatively']
    : ['Email sent — Delivered', 'Email bounced'];
  const save = async () => {
    if (!outcome) return;
    setLoading(true);
    await onSave(outcome);
    setLoading(false);
    setOutcome('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Log ${channel} Contact — ${caseName}`} size="sm">
      <div className="space-y-3">
        <p className="text-xs text-[var(--text-muted)]">Select the outcome of this contact attempt:</p>
        <div className="space-y-1.5">
          {OUTCOMES.map(o => (
            <button key={o} onClick={() => setOutcome(o)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: outcome === o ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)', color: outcome === o ? '#4ade80' : 'var(--text-secondary)', border: `1px solid ${outcome === o ? 'rgba(74,222,128,0.3)' : 'var(--border)'}` }}>
              {o}
            </button>
          ))}
          <input value={outcome} onChange={e => setOutcome(e.target.value)}
            placeholder="Or type a custom outcome..."
            className="w-full px-3 py-2 rounded-lg text-sm bg-[rgba(255,255,255,0.03)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-400/50" />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Skip</Button>
          <Button size="sm" onClick={save} disabled={loading || !outcome}>{loading ? 'Saving...' : 'Save Outcome'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────
export const MoneyRecovery: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data, loading, refetch } = useApi(() => api.recovery.list(dealerId), [dealerId]);
  const recoveryCases = data?.cases ?? [];

  const [tab, setTab] = useState('all');
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type }), []);

  // Outcome capture
  const [outcomeModal, setOutcomeModal] = useState<{ open: boolean; caseId: string; caseName: string; channel: string } | null>(null);

  // Detail modal sub-states
  const [ptpForm, setPtpForm] = useState({ ptp_date: '', ptp_amount: '' });
  const [ptpLoading, setPtpLoading] = useState(false);
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [legalLoading, setLegalLoading] = useState(false);

  // Add case form
  const [form, setForm] = useState({ customer_name: '', phone: '', amount_due: '', due_date: '', escalation_stage: 'gentle' });

  const filtered = tab === 'all' ? recoveryCases : recoveryCases.filter((r: any) => r.escalation_stage === tab);
  const totalDue = recoveryCases.reduce((a: number, r: any) => a + r.amount_due, 0);

  // ── Handlers ─────────────────────────────────────────────
  const handleBulkRun = async () => {
    setBulkLoading(true);
    try {
      const res: any = await api.recovery.bulk(dealerId, ['voice', 'whatsapp']);
      setShowBulk(false);
      showToast(`Recovery run queued for ${res.queued ?? 0} cases`);
      refetch();
    } catch { showToast('Failed to queue bulk run', 'error'); }
    setBulkLoading(false);
  };

  const handleAddCase = async () => {
    if (!form.customer_name || !form.phone || !form.amount_due || !form.due_date) return;
    setAddLoading(true);
    try {
      await api.recovery.create({ dealer_id: dealerId, customer_name: form.customer_name, phone: form.phone, amount_due: parseInt(form.amount_due), due_date: form.due_date, escalation_stage: form.escalation_stage as any });
      setShowAdd(false);
      setForm({ customer_name: '', phone: '', amount_due: '', due_date: '', escalation_stage: 'gentle' });
      showToast('Case added');
      refetch();
    } catch { showToast('Failed to add case', 'error'); }
    setAddLoading(false);
  };

  const logContact = async (caseId: string, caseName: string, channel: 'voice' | 'whatsapp' | 'email', autoOutcome?: string) => {
    if (autoOutcome) {
      try {
        await api.recovery.logContact(caseId, { channel, outcome: autoOutcome });
        showToast(`${channel} contact logged`);
        refetch();
        if (selected?.id === caseId) {
          const res: any = await api.recovery.list(dealerId);
          const updated = (res.cases ?? []).find((c: any) => c.id === caseId);
          if (updated) setSelected(updated);
        }
      } catch { showToast('Failed to log contact', 'error'); }
    } else {
      setOutcomeModal({ open: true, caseId, caseName, channel });
    }
  };

  const saveOutcome = async (outcome: string) => {
    if (!outcomeModal) return;
    await api.recovery.logContact(outcomeModal.caseId, { channel: outcomeModal.channel as any, outcome });
    showToast('Contact outcome saved');
    refetch();
    if (selected?.id === outcomeModal.caseId) {
      const res: any = await api.recovery.list(dealerId);
      const updated = (res.cases ?? []).find((c: any) => c.id === outcomeModal.caseId);
      if (updated) setSelected(updated);
    }
  };

  const handleWhatsApp = (r: any) => {
    openScriptModal('whatsapp_intro', { case: r });
    logContact(r.id, r.customer_name, 'whatsapp', 'WhatsApp message initiated');
  };

  const handleEmail = (r: any) => {
    setOutcomeModal({ open: true, caseId: r.id, caseName: r.customer_name, channel: 'email' });
  };

  const handleCall = (r: any) => {
    openScriptModal(STAGE_CONFIG[r.escalation_stage]?.scriptType ?? 'recovery_gentle', { case: r });
    setOutcomeModal({ open: true, caseId: r.id, caseName: r.customer_name, channel: 'voice' });
  };

  const handleSavePtp = async () => {
    if (!selected || !ptpForm.ptp_date) return;
    setPtpLoading(true);
    try {
      await api.recovery.update(selected.id, { ptp_date: ptpForm.ptp_date, ptp_amount: ptpForm.ptp_amount ? parseInt(ptpForm.ptp_amount) : null });
      showToast('Promise to Pay saved');
      refetch();
      const res: any = await api.recovery.list(dealerId);
      const updated = (res.cases ?? []).find((c: any) => c.id === selected.id);
      if (updated) setSelected(updated);
    } catch { showToast('Failed to save PTP', 'error'); }
    setPtpLoading(false);
  };

  const handleEscalate = async () => {
    if (!selected) return;
    const next = nextStage(selected.escalation_stage);
    if (!next) return;
    setEscalateLoading(true);
    try {
      await api.recovery.update(selected.id, { escalation_stage: next });
      showToast(`Escalated to ${STAGE_CONFIG[next].label}`);
      refetch();
      const res: any = await api.recovery.list(dealerId);
      const updated = (res.cases ?? []).find((c: any) => c.id === selected.id);
      if (updated) setSelected(updated);
    } catch { showToast('Failed to escalate', 'error'); }
    setEscalateLoading(false);
  };

  const handleResolve = async (status: 'resolved' | 'written_off') => {
    if (!selected) return;
    setResolveLoading(true);
    try {
      await api.recovery.update(selected.id, { status });
      showToast(status === 'resolved' ? 'Case marked as resolved!' : 'Case written off');
      setSelected(null);
      refetch();
    } catch { showToast('Failed to update case', 'error'); }
    setResolveLoading(false);
  };

  const handleLegalNotice = async () => {
    if (!selected) return;
    setLegalLoading(true);
    openScriptModal('recovery_legal', { case: selected });
    await logContact(selected.id, selected.customer_name, 'email', 'Legal notice dispatched');
    setLegalLoading(false);
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Money Recovery Agent" subtitle="Module C · Automated multi-channel payment recovery" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Pending" value={formatCurrency(totalDue)} sub={`${recoveryCases.length} cases`} icon={<IndianRupee size={16} />} accent="#fbbf24" />
          <MetricCard label="Legal Stage" value={recoveryCases.filter((r: any) => r.escalation_stage === 'legal').length} sub="Need approval" icon={<Shield size={16} />} accent="#ef4444" />
          <MetricCard label="PTPs Today" value={recoveryCases.filter((r: any) => r.ptp_date).length} sub="Promise to pay" icon={<Clock size={16} />} accent="#60a5fa" />
          <MetricCard label="Resolved MTD" value="₹8.4L" sub="6 cases closed" icon={<CheckCircle size={16} />} accent="#4ade80" />
        </div>

        {/* Escalation Pipeline */}
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
            const count = recoveryCases.filter((r: any) => r.escalation_stage === key).length;
            const amount = recoveryCases.filter((r: any) => r.escalation_stage === key).reduce((a: number, r: any) => a + r.amount_due, 0);
            return (
              <Card key={key} className="text-center cursor-pointer" hover onClick={() => setTab(key)}>
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: cfg.bg }}>
                  <AlertTriangle size={18} style={{ color: cfg.color }} />
                </div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{cfg.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mb-2">{cfg.desc}</p>
                <p className="text-xl font-display font-bold" style={{ color: cfg.color }}>{count}</p>
                <p className="text-xs text-[var(--text-secondary)]">{formatCurrency(amount)}</p>
              </Card>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <TabBar tabs={[
            { id: 'all', label: 'All Cases', count: recoveryCases.length },
            { id: 'gentle', label: 'Gentle' }, { id: 'firm', label: 'Firm' },
            { id: 'stern', label: 'Stern' }, { id: 'legal', label: 'Legal' },
          ]} active={tab} onChange={setTab} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Sparkles size={13} />} onClick={() => openScriptModal('recovery_gentle')}>AI Script</Button>
            <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>Add Case</Button>
            <Button size="sm" icon={<Play size={13} />} onClick={() => setShowBulk(true)}>Run Bulk Recovery</Button>
          </div>
        </div>

        {/* Cases Table */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount Due</th>
                  <th>Due Date</th>
                  <th>Stage</th>
                  <th>Promise to Pay</th>
                  <th>Last Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const cfg = STAGE_CONFIG[r.escalation_stage];
                  const isOverdue = new Date(r.due_date) < new Date();
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => { setSelected(r); setPtpForm({ ptp_date: r.ptp_date ? r.ptp_date.split('T')[0] : '', ptp_amount: r.ptp_amount ? String(r.ptp_amount) : '' }); }}>
                      <td>
                        <div>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{r.customer_name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{r.phone}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-base font-display font-bold text-amber-400">{formatCurrency(r.amount_due)}</span>
                      </td>
                      <td>
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                          {formatDate(r.due_date)} {isOverdue && '(Overdue)'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        {r.ptp_date ? (
                          <div>
                            <p className="text-xs text-brand-400 font-medium">{formatDate(r.ptp_date)}</p>
                            {r.ptp_amount && <p className="text-[10px] text-[var(--text-muted)]">{formatCurrency(r.ptp_amount)}</p>}
                          </div>
                        ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="text-xs text-[var(--text-muted)]">{r.last_contact ? formatRelative(r.last_contact) : '—'}</td>
                      <td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleCall(r)}
                            className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.1)] text-[var(--text-muted)] hover:text-brand-400 transition-colors" title="AI Voice Call">
                            <Phone size={13} />
                          </button>
                          <button onClick={() => handleWhatsApp(r)}
                            className="p-1.5 rounded-lg hover:bg-[rgba(96,165,250,0.1)] text-[var(--text-muted)] hover:text-blue-400 transition-colors" title="Send WhatsApp">
                            <MessageSquare size={13} />
                          </button>
                          <button onClick={() => handleEmail(r)}
                            className="p-1.5 rounded-lg hover:bg-[rgba(167,139,250,0.1)] text-[var(--text-muted)] hover:text-purple-400 transition-colors" title="Log Email">
                            <Mail size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">No cases found</div>
            )}
          </div>
        </Card>

        {/* ── ADD CASE MODAL ────────────────────────────────── */}
        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Recovery Case">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Customer Name" placeholder="Suresh Jadhav"
                value={form.customer_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              <Input label="Phone" placeholder="+91 98765 43210"
                value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount Due (₹)" type="number" placeholder="85000"
                value={form.amount_due} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, amount_due: e.target.value }))} />
              <Input label="Due Date" type="date"
                value={form.due_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <Select label="Starting Stage" options={[
              { value: 'gentle', label: 'Gentle Reminder' }, { value: 'firm', label: 'Firm Reminder' },
              { value: 'stern', label: 'Stern Notice' }, { value: 'legal', label: 'Legal Notice' },
            ]} value={form.escalation_stage} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, escalation_stage: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddCase} disabled={addLoading}>{addLoading ? 'Saving...' : 'Add Case'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── CASE DETAIL MODAL ────────────────────────────── */}
        {selected && (
          <Modal open={!!selected} onClose={() => setSelected(null)} title={`Recovery — ${selected.customer_name}`} size="lg">
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)]">
                  <p className="text-xs text-[var(--text-muted)]">Amount Due</p>
                  <p className="text-xl font-display font-bold text-amber-400">{formatCurrency(selected.amount_due)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Due Date</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{formatDate(selected.due_date)}</p>
                  {new Date(selected.due_date) < new Date() && <p className="text-[10px] text-red-400 mt-0.5">Overdue</p>}
                </div>
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Stage</p>
                  <p className="text-base font-semibold" style={{ color: STAGE_CONFIG[selected.escalation_stage].color }}>
                    {STAGE_CONFIG[selected.escalation_stage].label}
                  </p>
                </div>
              </div>

              {/* Promise to Pay */}
              <div className="p-4 rounded-xl bg-[rgba(96,165,250,0.06)] border border-[rgba(96,165,250,0.15)]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={14} className="text-blue-400" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Promise to Pay (PTP)</p>
                  {selected.ptp_date && (
                    <span className="text-xs text-blue-400 bg-[rgba(96,165,250,0.1)] px-2 py-0.5 rounded-full">
                      Set: {formatDate(selected.ptp_date)}{selected.ptp_amount ? ` — ${formatCurrency(selected.ptp_amount)}` : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="PTP Date" type="date"
                    value={ptpForm.ptp_date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPtpForm(f => ({ ...f, ptp_date: e.target.value }))} />
                  <Input label="PTP Amount (₹)" type="number" placeholder={String(selected.amount_due)}
                    value={ptpForm.ptp_amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPtpForm(f => ({ ...f, ptp_amount: e.target.value }))} />
                  <div className="flex items-end">
                    <Button size="sm" onClick={handleSavePtp} disabled={ptpLoading || !ptpForm.ptp_date} className="w-full">
                      {ptpLoading ? 'Saving…' : 'Save PTP'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Escalate */}
              {nextStage(selected.escalation_stage) && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <TrendingUp size={14} className="text-[var(--text-muted)]" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--text-primary)]">Escalate this case?</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Move from <span style={{ color: STAGE_CONFIG[selected.escalation_stage].color }}>{STAGE_CONFIG[selected.escalation_stage].label}</span>
                      {' → '}
                      <span style={{ color: STAGE_CONFIG[nextStage(selected.escalation_stage)!].color }}>{STAGE_CONFIG[nextStage(selected.escalation_stage)!].label}</span>
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" icon={<ArrowRight size={12} />}
                    onClick={handleEscalate} disabled={escalateLoading}>
                    {escalateLoading ? 'Escalating…' : `Move to ${STAGE_CONFIG[nextStage(selected.escalation_stage)!].label}`}
                  </Button>
                </div>
              )}

              {/* Contact History */}
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Contact History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {Array.isArray(selected.channel_history) && selected.channel_history.length > 0 ? (
                    [...selected.channel_history].reverse().map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                        <div className="w-6 h-6 rounded-lg bg-[rgba(74,222,128,0.08)] flex items-center justify-center flex-shrink-0">
                          {h.channel === 'voice' ? <Phone size={11} className="text-brand-400" /> :
                           h.channel === 'whatsapp' ? <MessageSquare size={11} className="text-blue-400" /> :
                           <Mail size={11} className="text-purple-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{h.outcome || 'Contacted'}</p>
                          <p className="text-[10px] text-[var(--text-muted)] capitalize">{h.channel} · {formatDate(h.date)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-3">No contact history yet</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                <Button icon={<Phone size={13} />} onClick={() => handleCall(selected)}>AI Voice Call</Button>
                <Button variant="secondary" icon={<MessageSquare size={13} />} onClick={() => handleWhatsApp(selected)}>WhatsApp</Button>
                <Button variant="ghost" icon={<Mail size={13} />} onClick={() => handleEmail(selected)}>Email</Button>
                {selected.escalation_stage === 'legal' && (
                  <Button variant="danger" icon={<FileText size={13} />} onClick={handleLegalNotice} disabled={legalLoading}>
                    {legalLoading ? 'Sending…' : 'Send Legal Notice'}
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="ghost" icon={<CheckCircle size={13} />} onClick={() => handleResolve('resolved')} disabled={resolveLoading}
                  className="text-brand-400 hover:text-brand-400">
                  {resolveLoading ? '…' : 'Mark Resolved'}
                </Button>
                <Button variant="ghost" icon={<XCircle size={13} />} onClick={() => handleResolve('written_off')} disabled={resolveLoading}
                  className="text-red-400/70 hover:text-red-400">
                  Write Off
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── BULK RUN MODAL ────────────────────────────────── */}
        <Modal open={showBulk} onClose={() => setShowBulk(false)} title="Run Bulk Recovery" size="md">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              AgroDesk will contact all {recoveryCases.filter((r: any) => r.status === 'active').length} active cases using the appropriate escalation script via Voice + WhatsApp.
            </p>
            <div className="space-y-2">
              {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                const count = recoveryCases.filter((r: any) => r.escalation_stage === key && r.status !== 'resolved').length;
                return count > 0 ? (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: `${cfg.color}30`, background: cfg.bg }}>
                    <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{count} cases</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="p-3 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)]">
              <p className="text-xs text-red-400 flex items-center gap-2">
                <Shield size={12} />
                Legal stage cases are excluded — they require manual review and approval
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowBulk(false)}>Cancel</Button>
              <Button icon={<Play size={13} />} onClick={handleBulkRun} disabled={bulkLoading}>
                {bulkLoading ? 'Queuing...' : 'Start Recovery Run'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── OUTCOME MODAL ────────────────────────────────── */}
        {outcomeModal && (
          <OutcomeModal
            open={outcomeModal.open}
            onClose={() => setOutcomeModal(null)}
            onSave={saveOutcome}
            channel={outcomeModal.channel}
            caseName={outcomeModal.caseName}
          />
        )}

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
