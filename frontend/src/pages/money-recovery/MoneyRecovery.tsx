import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, Modal, Input, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatDate, formatRelative } from '../../lib/utils';
import { IndianRupee, Phone, MessageSquare, Mail, AlertTriangle, CheckCircle, Clock, Sparkles, Play, Shield, Plus } from 'lucide-react';

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  gentle: { label: 'Gentle Reminder', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', desc: 'Friendly first reminder' },
  firm:   { label: 'Firm Reminder',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', desc: 'Clear payment request' },
  stern:  { label: 'Stern Notice',    color: '#f97316', bg: 'rgba(249,115,22,0.1)', desc: 'Formal demand' },
  legal:  { label: 'Legal Notice',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)', desc: 'Requires approval' },
};

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

  // Add case form state
  const [form, setForm] = useState({
    customer_name: '', phone: '', amount_due: '', due_date: '', escalation_stage: 'gentle',
  });

  const filtered = tab === 'all' ? recoveryCases : recoveryCases.filter((r: any) => r.escalation_stage === tab);
  const totalDue = recoveryCases.reduce((a: number, r: any) => a + r.amount_due, 0);

  const handleBulkRun = async () => {
    setBulkLoading(true);
    try {
      await api.recovery.bulk(dealerId, ['voice', 'whatsapp']);
      setShowBulk(false);
      refetch();
    } catch (e) {
      console.error(e);
    }
    setBulkLoading(false);
  };

  const handleAddCase = async () => {
    if (!form.customer_name || !form.phone || !form.amount_due || !form.due_date) return;
    setAddLoading(true);
    try {
      await api.recovery.create({
        dealer_id: dealerId,
        customer_name: form.customer_name,
        phone: form.phone,
        amount_due: parseInt(form.amount_due),
        due_date: form.due_date,
        escalation_stage: form.escalation_stage as any,
      });
      setShowAdd(false);
      setForm({ customer_name: '', phone: '', amount_due: '', due_date: '', escalation_stage: 'gentle' });
      refetch();
    } catch (e) {
      console.error(e);
    }
    setAddLoading(false);
  };

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
                    <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
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
                          <button onClick={() => openScriptModal(`recovery_${r.escalation_stage}`, { case: r })}
                            className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.1)] text-[var(--text-muted)] hover:text-brand-400 transition-colors" title="AI Call">
                            <Phone size={13} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-[rgba(96,165,250,0.1)] text-[var(--text-muted)] hover:text-blue-400 transition-colors" title="WhatsApp">
                            <MessageSquare size={13} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-[rgba(167,139,250,0.1)] text-[var(--text-muted)] hover:text-purple-400 transition-colors" title="Email">
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

        {/* Add Case Modal */}
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
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddCase} disabled={addLoading}>
                {addLoading ? 'Saving...' : 'Add Case'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Case Detail Modal */}
        {selected && (
          <Modal open={!!selected} onClose={() => setSelected(null)} title={`Recovery — ${selected.customer_name}`} size="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)]">
                  <p className="text-xs text-[var(--text-muted)]">Amount Due</p>
                  <p className="text-xl font-display font-bold text-amber-400">{formatCurrency(selected.amount_due)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Due Date</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{formatDate(selected.due_date)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Stage</p>
                  <p className="text-base font-semibold" style={{ color: STAGE_CONFIG[selected.escalation_stage].color }}>
                    {STAGE_CONFIG[selected.escalation_stage].label}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Contact History</h4>
                <div className="space-y-2">
                  {Array.isArray(selected.channel_history) && selected.channel_history.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                      <div className="w-6 h-6 rounded-lg bg-[rgba(74,222,128,0.08)] flex items-center justify-center flex-shrink-0">
                        {h.channel === 'voice' ? <Phone size={12} className="text-brand-400" /> :
                         h.channel === 'whatsapp' ? <MessageSquare size={12} className="text-brand-400" /> :
                         <Mail size={12} className="text-brand-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[var(--text-primary)]">{h.outcome}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{h.channel} · {formatDate(h.date)}</p>
                      </div>
                    </div>
                  ))}
                  {(!selected.channel_history || selected.channel_history.length === 0) && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-3">No contact history yet</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button icon={<Phone size={13} />} onClick={() => openScriptModal(`recovery_${selected.escalation_stage}`, { case: selected })}>
                  AI Voice Call
                </Button>
                <Button variant="secondary" icon={<MessageSquare size={13} />}>WhatsApp</Button>
                {selected.escalation_stage === 'legal' && (
                  <Button variant="danger" icon={<Shield size={13} />}>Send Legal Notice</Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Bulk Run Modal */}
        <Modal open={showBulk} onClose={() => setShowBulk(false)} title="Run Bulk Recovery" size="md">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              AgroDesk will automatically contact all {recoveryCases.filter((r: any) => r.status === 'active').length} active cases using the appropriate escalation script.
            </p>
            <div className="space-y-2">
              {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                const count = recoveryCases.filter((r: any) => r.escalation_stage === key && r.status === 'active').length;
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
                Legal stage requires manual approval before sending
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

      </div>
    </div>
  );
};
