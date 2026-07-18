import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Header } from '../../components/layout/Header';
import { Card, Badge, Button, TabBar, EmptyState } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatRelative } from '../../lib/utils';
import { useT } from '../../lib/i18n';
import {
  Phone, MessageCircle, Pencil, Wrench, FileText, Check, Plus, Settings as SettingsIcon, Inbox,
} from 'lucide-react';

// ─── Display metadata ─────────────────────────────────────────────────────────
const TYPE_META: Record<string, { key: string; variant: 'active' | 'pending' | 'overdue' | 'info' | 'purple' }> = {
  SERVICE: { key: 'support.type.SERVICE', variant: 'active' },
  REPAIR: { key: 'support.type.REPAIR', variant: 'overdue' },
  OTHER: { key: 'support.type.OTHER', variant: 'info' },
  UNSURE: { key: 'support.type.UNSURE', variant: 'pending' },
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  WHATSAPP: <MessageCircle size={13} className="text-[#4ade80]" />,
  CALL: <Phone size={13} className="text-[#60a5fa]" />,
  MANUAL: <Pencil size={13} className="text-[var(--text-muted)]" />,
};

const STATUS_CHIPS = [
  { id: 'all', key: 'common.all', status: undefined },
  { id: 'new', key: 'common.new', status: 'NEW' },
  { id: 'progress', key: 'common.inProgress', status: 'IN_PROGRESS' },
] as const;

// ─── Ticket row ───────────────────────────────────────────────────────────────
const TicketRow: React.FC<{
  r: any;
  onCallBack: (r: any) => void;
  onDone: (r: any) => void;
}> = ({ r, onCallBack, onDone }) => {
  const t = useT();
  const who = r.contact?.name || r.caller_name || r.phone;
  const tractor = r.machine ? `${r.machine.make} ${r.machine.model}` : null;
  const type = TYPE_META[r.type] ?? TYPE_META.UNSURE;
  // "Call not connected" only applies to inbound calls that never bridged.
  const notConnected = r.channel === 'CALL' && !r.transferred && r.status !== 'DONE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 px-4 border-b border-[var(--border)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
    >
      {notConnected && (
        <span title={t('support.notConnected')} className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
      )}
      {!notConnected && <span className="w-2 h-2 flex-shrink-0" />}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[var(--text-primary)] truncate">{who}</span>
          {tractor && <span className="text-xs text-[var(--text-muted)]">· {tractor}</span>}
          <Badge variant={type.variant} className="ml-0.5">{t(type.key)}</Badge>
          {r.status === 'DONE' && <Badge variant="active">{t('common.done')}</Badge>}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">{r.note}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-shrink-0">
        {CHANNEL_ICON[r.channel]}
        <span className="tabular-nums">{formatRelative(r.created_at)}</span>
      </div>

      {r.status !== 'DONE' && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button size="sm" variant="secondary" icon={<Phone size={13} />} onClick={() => onCallBack(r)}>
            {t('support.callBack')}
          </Button>
          <Button size="sm" variant="ghost" icon={<Check size={13} />} onClick={() => onDone(r)}>
            {t('common.done')}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

// ─── Panel (Service or Other, via `types` prop) ───────────────────────────────
const SupportPanel: React.FC<{
  rows: any[];
  loading: boolean;
  onCallBack: (r: any) => void;
  onDone: (r: any) => void;
}> = ({ rows, loading, onCallBack, onDone }) => {
  const t = useT();
  if (loading) return <div className="py-16 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;
  if (rows.length === 0)
    return <EmptyState icon={<Inbox size={28} />} title={t('support.empty.title')} message={t('support.empty.message')} />;
  return (
    <div>
      {rows.map((r) => (
        <TicketRow key={r.id} r={r} onCallBack={onCallBack} onDone={onDone} />
      ))}
    </div>
  );
};

// ─── Routing settings ─────────────────────────────────────────────────────────
const RoutingSettings: React.FC<{ showToast: (m: string, t?: 'success' | 'error') => void }> = ({ showToast }) => {
  const t = useT();
  const { data, loading } = useApi(() => api.support.routing(), []);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (data?.routing) {
      setForm({
        mechanic_phone: data.routing.mechanic_phone ?? '',
        technician_phone: data.routing.technician_phone ?? '',
        dealer_phone: data.routing.dealer_phone ?? '',
        office_hours_start: data.routing.office_hours_start ?? '09:00',
        office_hours_end: data.routing.office_hours_end ?? '19:00',
      });
    }
  }, [data]);

  if (loading || !form) return <div className="py-10 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;

  const field = (key: string, label: string, hint: string, type = 'tel') => (
    <div className="min-w-0">
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-400"
      />
      <p className="text-[11px] leading-snug text-[var(--text-muted)] mt-1">{hint}</p>
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.support.saveRouting(form);
      showToast(t('support.routing.saved'));
    } catch {
      showToast(t('common.saveFailed'), 'error');
    }
    setSaving(false);
  };

  // Two columns on anything wider than mobile so the whole form — including the
  // Save button — fits above the fold on a 768px-tall laptop.
  return (
    <Card className="p-5 max-w-3xl space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        {t('support.routing.intro')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {field('mechanic_phone', t('support.routing.mechanic'), t('support.routing.mechanicHint'))}
        {field('technician_phone', t('support.routing.technician'), t('support.routing.technicianHint'))}
        {field('dealer_phone', t('support.routing.dealer'), t('support.routing.dealerHint'))}
        <div className="grid grid-cols-2 gap-3">
          {field('office_hours_start', t('support.routing.officeStart'), t('support.routing.officeHint'), 'time')}
          {field('office_hours_end', t('support.routing.officeEnd'), t('support.routing.afterHoursHint'), 'time')}
        </div>
      </div>
      <Button onClick={save} loading={saving}>{t('common.save')}</Button>
    </Card>
  );
};

// ─── Manual add modal (minimal) ───────────────────────────────────────────────
const AddModal: React.FC<{ open: boolean; onClose: () => void; onAdded: () => void; showToast: (m: string, t?: 'success' | 'error') => void }> = ({ open, onClose, onAdded, showToast }) => {
  const t = useT();
  const [form, setForm] = useState({ phone: '', note: '', type: 'SERVICE', caller_name: '' });
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  const submit = async () => {
    if (!form.phone || !form.note) return;
    setSaving(true);
    try {
      await api.support.create(form);
      showToast(t('support.added'));
      setForm({ phone: '', note: '', type: 'SERVICE', caller_name: '' });
      onAdded();
      onClose();
    } catch {
      showToast(t('support.addFailed'), 'error');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="p-6 w-full max-w-md space-y-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-lg">{t('support.addNew')}</h3>
        <input placeholder={t('support.form.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-[var(--text-primary)]" />
        <input placeholder={t('support.form.name')} value={form.caller_name} onChange={(e) => setForm({ ...form, caller_name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-[var(--text-primary)]" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-[var(--text-primary)]">
          <option value="SERVICE">{t('support.type.SERVICE')}</option>
          <option value="REPAIR">{t('support.type.REPAIR')}</option>
          <option value="OTHER">{t('support.type.OTHER')}</option>
        </select>
        <textarea placeholder={t('support.form.work')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3}
          className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-[var(--text-primary)]" />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
        </div>
      </Card>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const Support: React.FC = () => {
  const t = useT();
  const { dealer } = useAppStore();
  const [tab, setTab] = useState<'service' | 'other' | 'settings'>('service');
  const [chip, setChip] = useState<'all' | 'new' | 'progress'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const status = STATUS_CHIPS.find((c) => c.id === chip)?.status;
  const { data, loading, refetch } = useApi(() => api.support.list({ status, page: 1 }), [status, dealer?.id]);
  const requests: any[] = data?.requests ?? [];

  const serviceRows = requests.filter((r) => r.type === 'SERVICE' || r.type === 'REPAIR');
  const otherRows = requests.filter((r) => r.type === 'OTHER' || r.type === 'UNSURE');

  const onCallBack = async (r: any) => {
    try {
      await api.support.update(r.id, { status: 'SEEN' });
    } catch { /* non-fatal — still place the call */ }
    window.location.href = `tel:${r.phone}`;
    refetch();
  };
  const onDone = async (r: any) => {
    try {
      await api.support.update(r.id, { status: 'DONE' });
      showToast(t('support.markedDone'));
      refetch();
    } catch {
      showToast(t('common.updateFailed'), 'error');
    }
  };

  const tabs = [
    { id: 'service', label: t('support.tab.service'), icon: <Wrench size={14} />, count: serviceRows.length },
    { id: 'other', label: t('support.tab.other'), icon: <FileText size={14} />, count: otherRows.length },
    { id: 'settings', label: t('support.tab.settings'), icon: <SettingsIcon size={14} /> },
  ];

  return (
    <div>
      <Header title={t('support.title')} subtitle={t('support.subtitle')} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabBar tabs={tabs} active={tab} onChange={(t) => setTab(t as any)} />
          {tab !== 'settings' && (
            <Button icon={<Plus size={15} />} onClick={() => setShowAdd(true)}>{t('support.addNew')}</Button>
          )}
        </div>

        {tab !== 'settings' && (
          <div className="flex gap-2">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChip(c.id as any)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  chip === c.id
                    ? 'bg-brand-400 text-surface-900'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t(c.key)}
              </button>
            ))}
          </div>
        )}

        {tab === 'service' && (
          <Card className="overflow-hidden">
            <SupportPanel rows={serviceRows} loading={loading} onCallBack={onCallBack} onDone={onDone} />
          </Card>
        )}
        {tab === 'other' && (
          <Card className="overflow-hidden">
            <SupportPanel rows={otherRows} loading={loading} onCallBack={onCallBack} onDone={onDone} />
          </Card>
        )}
        {tab === 'settings' && <RoutingSettings showToast={showToast} />}
      </div>

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={refetch} showToast={showToast} />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-brand-400 text-surface-900'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Support;
