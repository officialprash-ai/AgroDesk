import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, Modal, Input, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { BILL_CATEGORIES } from '../../lib/utils';
import { FileText, Upload, Send, CheckCircle, Clock, AlertCircle, Plus, Phone, Mail, Building, ChevronRight, Camera } from 'lucide-react';

const MONTH_STEPS = [
  { key: 'tractor_purchase', label: 'Tractor Purchase Bills', icon: '🚜' },
  { key: 'tractor_sales', label: 'Tractor Sales Bills', icon: '📋' },
  { key: 'spare_purchase', label: 'Spare Parts Purchase', icon: '⚙️' },
  { key: 'spare_sales', label: 'Spare Parts Sales', icon: '🔧' },
  { key: 'cash_voucher', label: 'Cash Vouchers / Payment Receipts', icon: '💵' },
  { key: 'other', label: 'Other Bills', icon: '📁' },
];

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7); // "YYYY-MM"

export const AIAccountant: React.FC = () => {
  const { dealer } = useAppStore();
  const dealerId = dealer?.id ?? '';

  // ── API data ──────────────────────────────────────────────────
  const { data: docsData, refetch: refetchDocs } = useApi(
    () => api.documents.list(dealerId, CURRENT_PERIOD),
    [dealerId]
  );
  const { data: accsData, refetch: refetchAccs } = useApi(
    () => api.documents.accountants(dealerId),
    [dealerId]
  );
  const docs = docsData?.documents ?? [];
  const accountants = accsData?.accountants ?? [];

  // ── UI state ──────────────────────────────────────────────────
  const [tab, setTab] = useState('upload');
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, { files: string[]; skipped: boolean }>>({});
  const [showWizard, setShowWizard] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [accForm, setAccForm] = useState({ name: '', phone: '', email: '', tally_enabled: false, is_default: false });

  const currentStep = MONTH_STEPS[step];
  const isLastStep = step === MONTH_STEPS.length - 1;
  const allDone = Object.keys(uploaded).length === MONTH_STEPS.length;

  // ── Metrics from real docs ────────────────────────────────────
  const billsUploaded = docs.filter(d => d.file_url).length;
  const tallySynced = docs.filter(d => d.tally_synced).length;
  const pendingOcr = docs.filter(d => d.file_url && !d.ocr_data).length;

  // ── Handlers ──────────────────────────────────────────────────
  const handleUpload = async (skip = false) => {
    // Simulate upload: create a document record in DB
    if (!skip) {
      try {
        await api.documents.list(dealerId, CURRENT_PERIOD); // ensure we have latest
        // In real impl, file upload to S3 first, then create doc with file_url
        // For MVP: create doc record with placeholder
        await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JSON.parse(localStorage.getItem('agrodesk-auth') ?? '{}')?.state?.token ?? ''}`,
          },
          body: JSON.stringify({
            dealer_id: dealerId,
            category: currentStep.key,
            period_month: CURRENT_PERIOD,
            filename: `${currentStep.key}.pdf`,
            file_url: `/uploads/${dealerId}/${currentStep.key}-${Date.now()}.pdf`,
          }),
        });
        refetchDocs();
      } catch (e) {
        console.error('Doc create failed:', e);
      }
    }
    setUploaded(prev => ({ ...prev, [currentStep.key]: { files: skip ? [] : ['invoice.pdf'], skipped: skip } }));
    if (!isLastStep) setStep(s => s + 1);
    else setShowSendModal(true);
  };

  const handleSend = async () => {
    if (!selectedAcc) return;
    setSendLoading(true);
    try {
      await api.documents.sendToAccountant({ dealer_id: dealerId, accountant_id: selectedAcc, period_month: CURRENT_PERIOD });
      setShowSendModal(false);
      setShowWizard(false);
      setUploaded({});
      refetchDocs();
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSendLoading(false);
    }
  };

  const handleAddAccountant = async () => {
    if (!accForm.name || !accForm.phone || !accForm.email) return;
    setAddLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/documents/accountants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('agrodesk-auth') ?? '{}')?.state?.token ?? ''}`,
        },
        body: JSON.stringify({ dealer_id: dealerId, ...accForm }),
      });
      refetchAccs();
      setShowAddAcc(false);
      setAccForm({ name: '', phone: '', email: '', tally_enabled: false, is_default: false });
    } catch (e) {
      console.error('Add accountant failed:', e);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="AI Accountant" subtitle="Module F · Automated bill collection, OCR & Tally sync" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Bills Uploaded" value={String(billsUploaded)} sub={CURRENT_PERIOD} icon={<FileText size={16} />} accent="#4ade80" />
          <MetricCard label="Tally Synced" value={String(tallySynced)} sub={`of ${billsUploaded} bills`} icon={<CheckCircle size={16} />} accent="#60a5fa" />
          <MetricCard label="Pending OCR" value={String(pendingOcr)} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Accountants" value={String(accountants.length)} icon={<Building size={16} />} accent="#a78bfa" />
        </div>

        {/* Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)]">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-brand-400 flex items-center justify-center">
              <FileText size={18} className="text-surface-900" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-20" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{CURRENT_PERIOD} bills — upload & send to accountant</p>
            <p className="text-xs text-[var(--text-muted)]">Upload all bill categories to send to accountant</p>
          </div>
          <Button size="sm" icon={<Upload size={13} />} onClick={() => { setShowWizard(true); setStep(0); }}>
            Start Upload
          </Button>
        </div>

        <TabBar tabs={[
          { id: 'upload', label: 'Bill Upload', count: Object.keys(uploaded).length },
          { id: 'history', label: 'History', count: docs.length },
          { id: 'accountants', label: 'Accountants', count: accountants.length },
          { id: 'tally', label: 'Tally Sync' },
        ]} active={tab} onChange={setTab} />

        {/* Upload Tab */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {BILL_CATEGORIES.map(cat => {
                const u = uploaded[cat.key];
                const dbDoc = docs.find(d => d.category === cat.key);
                return (
                  <Card key={cat.key} hover className="cursor-pointer" onClick={() => { setShowWizard(true); setStep(MONTH_STEPS.findIndex(s => s.key === cat.key)); }}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{cat.label}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {u ? (u.skipped ? 'Skipped' : `${u.files.length} file(s) uploaded`) : dbDoc ? '1 file in DB' : 'Not uploaded'}
                        </p>
                        <div className="mt-2">
                          {u ? (
                            u.skipped ? <Badge variant="info">Skipped</Badge> : <Badge variant="active"><CheckCircle size={10} /> Uploaded</Badge>
                          ) : dbDoc ? (
                            <Badge variant="active"><CheckCircle size={10} /> In DB</Badge>
                          ) : (
                            <Badge variant="pending"><Clock size={10} /> Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {allDone && (
              <Button icon={<Send size={13} />} className="w-full justify-center" onClick={() => setShowSendModal(true)}>
                All Bills Ready — Send to Accountant
              </Button>
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead><tr><th>Category</th><th>Period</th><th>Filename</th><th>OCR</th><th>Tally</th><th>Status</th></tr></thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-[var(--text-muted)] py-8">No documents yet</td></tr>
                  ) : docs.map(d => (
                    <tr key={d.id}>
                      <td className="font-medium text-[var(--text-primary)]">{d.category}</td>
                      <td className="text-[var(--text-secondary)]">{d.period_month}</td>
                      <td className="text-[var(--text-secondary)] text-xs">{d.filename ?? '—'}</td>
                      <td>{d.ocr_data ? <Badge variant="active">Done</Badge> : <Badge variant="pending">Pending</Badge>}</td>
                      <td>{d.tally_synced ? <Badge variant="active">Synced</Badge> : <Badge variant="info">No</Badge>}</td>
                      <td><Badge variant={d.confirmed ? 'active' : 'pending'}>{d.confirmed ? 'Confirmed' : 'Unconfirmed'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Accountants Tab */}
        {tab === 'accountants' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAddAcc(true)}>Add Accountant</Button>
            </div>
            {accountants.length === 0 ? (
              <Card><p className="text-center text-[var(--text-muted)] py-8">No accountants added yet</p></Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {accountants.map((acc: any) => (
                  <Card key={acc.id}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] flex items-center justify-center">
                        <Building size={18} className="text-brand-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{acc.name}</p>
                          {acc.is_default && <Badge variant="active">Default</Badge>}
                          {acc.tally_enabled && <Badge variant="info">Tally</Badge>}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Phone size={10} />{acc.phone}</p>
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Mail size={10} />{acc.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                      <Button variant="secondary" size="sm" icon={<Send size={12} />} onClick={() => { setSelectedAcc(acc.id); setShowSendModal(true); }}>Send Bills</Button>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tally Tab */}
        {tab === 'tally' && (
          <div className="space-y-4 max-w-2xl">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Tally Connector Status</h3>
                  <p className="text-xs text-[var(--text-muted)]">Desktop agent for TallyPrime sync</p>
                </div>
                <Badge variant="pending">Not Connected</Badge>
              </div>
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                {['Install Tally Connector on dealer PC (Windows)', 'Opens port 9000 for XML sync', 'AgroDesk pushes vouchers via HTTP', 'Works with TallyPrime 3.0+'].map((s, i) => (
                  <p key={i} className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[rgba(255,255,255,0.06)] text-xs flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">{i + 1}</span>{s}</p>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button icon={<CheckCircle size={13} />}>Download Connector</Button>
                <Button variant="secondary">View Setup Guide</Button>
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Non-Tally Dealers</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Bills are packaged as a structured ZIP/PDF and sent directly to your accountant via WhatsApp or Email.</p>
              <div className="flex gap-2">
                <Button variant="secondary" icon={<Send size={13} />}>Send to Accountant (WhatsApp)</Button>
                <Button variant="ghost" icon={<Mail size={13} />}>Email Package</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Upload Wizard Modal */}
        <Modal open={showWizard} onClose={() => setShowWizard(false)} title={`Bill Upload Wizard — ${CURRENT_PERIOD}`} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              {MONTH_STEPS.map((s, i) => (
                <div key={s.key} className={`flex-1 h-1 rounded-full transition-all ${i < step ? 'bg-brand-400' : i === step ? 'bg-brand-400/60' : 'bg-[rgba(255,255,255,0.08)]'}`} />
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Step {step + 1} of {MONTH_STEPS.length}</p>
            <div className="text-center py-2">
              <div className="text-4xl mb-2">{currentStep.icon}</div>
              <h3 className="text-base font-display font-bold text-[var(--text-primary)]">{currentStep.label}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Do you have {currentStep.label.toLowerCase()} for {CURRENT_PERIOD}?</p>
            </div>
            {uploaded[currentStep.key] ? (
              <div className="p-4 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] flex items-center gap-3">
                <CheckCircle size={16} className="text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{uploaded[currentStep.key].skipped ? 'Skipped' : 'File uploaded'}</p>
                  <p className="text-xs text-[var(--text-muted)]">OCR processing in background</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-28 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-brand-400/40 transition-colors flex flex-col items-center justify-center cursor-pointer bg-[rgba(255,255,255,0.02)]" onClick={() => handleUpload(false)}>
                  <Camera size={20} className="text-[var(--text-muted)] mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">📷 Scan from phone camera</p>
                  <p className="text-xs text-[var(--text-muted)]">or upload PDF/image</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 justify-center" icon={<Upload size={13} />} onClick={() => handleUpload(false)}>Upload File</Button>
                  <Button variant="ghost" className="flex-1 justify-center" onClick={() => handleUpload(true)}>Skip — Not Available</Button>
                </div>
              </div>
            )}
            {uploaded[currentStep.key] && !isLastStep && (
              <Button className="w-full justify-center" icon={<ChevronRight size={13} />} onClick={() => setStep(s => s + 1)}>
                Next: {MONTH_STEPS[step + 1].label}
              </Button>
            )}
          </div>
        </Modal>

        {/* Send Modal */}
        <Modal open={showSendModal} onClose={() => setShowSendModal(false)} title="Send Bills to Accountant" size="md">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">Choose accountant to send {CURRENT_PERIOD} bills:</p>
            {accountants.length === 0 ? (
              <div className="p-4 rounded-xl bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)]">
                <p className="text-sm text-[var(--text-secondary)]">No accountants added yet. Add one in the Accountants tab first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accountants.map((acc: any) => (
                  <div key={acc.id} onClick={() => setSelectedAcc(acc.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAcc === acc.id ? 'border-brand-400/40 bg-[rgba(74,222,128,0.08)]' : 'border-[var(--border)] hover:border-[var(--border-bright)]'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAcc === acc.id ? 'border-brand-400' : 'border-[var(--border)]'}`}>
                      {selectedAcc === acc.id && <div className="w-2 h-2 rounded-full bg-brand-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{acc.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{acc.tally_enabled ? '🔗 Tally sync' : '📦 Package & send'} · {acc.email}</p>
                    </div>
                    {acc.is_default && <Badge variant="active">Default</Badge>}
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)]">
                📊 Summary: {Object.values(uploaded).filter(u => !u.skipped).length} categories uploaded,{' '}
                {Object.values(uploaded).filter(u => u.skipped).length} skipped
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowSendModal(false)}>Cancel</Button>
              <Button icon={<Send size={13} />} onClick={handleSend} disabled={!selectedAcc || sendLoading}>
                {sendLoading ? 'Sending…' : `Send to ${accountants.find((a: any) => a.id === selectedAcc)?.name ?? 'Accountant'}`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Accountant Modal */}
        <Modal open={showAddAcc} onClose={() => setShowAddAcc(false)} title="Add Accountant">
          <div className="space-y-3">
            <Input label="Full Name" placeholder="CA Suresh Mehta" value={accForm.name} onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Phone" placeholder="+91 98234 56780" value={accForm.phone} onChange={e => setAccForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" placeholder="suresh@mehta-ca.com" type="email" value={accForm.email} onChange={e => setAccForm(f => ({ ...f, email: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" className="accent-brand-400" checked={accForm.tally_enabled} onChange={e => setAccForm(f => ({ ...f, tally_enabled: e.target.checked }))} />
              Enable Tally sync (has TallyPrime)
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" className="accent-brand-400" checked={accForm.is_default} onChange={e => setAccForm(f => ({ ...f, is_default: e.target.checked }))} />
              Set as default accountant
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddAcc(false)}>Cancel</Button>
              <Button onClick={handleAddAccountant} disabled={addLoading || !accForm.name || !accForm.phone || !accForm.email}>
                {addLoading ? 'Saving…' : 'Save Accountant'}
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
};
