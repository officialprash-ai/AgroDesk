import React, { useState, useRef, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, Modal, Input, Select } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, TRACTOR_MAKES } from '../../lib/utils';
import {
  Truck, Plus, Sparkles, Phone, Camera, ArrowUpDown,
  AlertTriangle, CheckCircle, Clock, RefreshCw, Pencil,
  Trash2, Copy, MessageSquare, X, Upload, ChevronRight,
  Users, Star, Filter,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────
function getUrgencyLabel(score: number) {
  if (score >= 85) return { label: 'Critical', color: '#ef4444' };
  if (score >= 65) return { label: 'High', color: '#fbbf24' };
  if (score >= 40) return { label: 'Medium', color: '#60a5fa' };
  return { label: 'Low', color: '#4ade80' };
}

const STATUS_CYCLE: Record<string, string> = {
  available: 'reserved',
  reserved: 'sold',
  sold: 'available',
};

const STATUS_VARIANTS: Record<string, 'active' | 'pending' | 'info' | 'error'> = {
  available: 'active',
  reserved: 'pending',
  sold: 'info',
};

function compressImage(file: File, maxSize = 600): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in"
      style={{ background: type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: type === 'success' ? '#4ade80' : '#f87171', backdropFilter: 'blur(12px)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────
export const UsedTractor: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data, loading, refetch } = useApi(() => api.tractors.list(dealerId), [dealerId]);
  const usedTractors = data?.tractors ?? [];

  // ── UI State ─────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  // ── Add Tractor ─────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ make: '', model: '', year: '', hours: '', asking_price: '', cost_price: '', condition: 'good' });

  // ── Edit Tractor ─────────────────────────────────────────
  const [editModal, setEditModal] = useState<{ open: boolean; tractor?: any }>({ open: false });
  const [editForm, setEditForm] = useState({ asking_price: '', hours: '', condition: 'good', description: '' });
  const [editLoading, setEditLoading] = useState(false);

  // ── Photos ───────────────────────────────────────────────
  const [photoModal, setPhotoModal] = useState<{ open: boolean; tractor?: any; photos: string[] }>({ open: false, photos: [] });
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Delete Confirm ───────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; tractor?: any }>({ open: false });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── AI Listing ───────────────────────────────────────────
  const [genDesc, setGenDesc] = useState<{ open: boolean; tractor?: any }>({ open: false });
  const [aiDesc, setAiDesc] = useState('');
  const [loadingDesc, setLoadingDesc] = useState(false);

  // ── Call Buyers ──────────────────────────────────────────
  const [callBuyersModal, setCallBuyersModal] = useState<{ open: boolean; tractor?: any }>({ open: false });
  const { data: contactsData } = useApi(
    () => callBuyersModal.open ? api.contacts.list(dealerId, { limit: 30 }) : Promise.resolve({ contacts: [], total: 0 }),
    [callBuyersModal.open, dealerId]
  );
  const buyers = (contactsData?.contacts ?? []).slice(0, 12);

  // ── Urgency Refresh ──────────────────────────────────────
  const [urgencyLoading, setUrgencyLoading] = useState(false);

  // ── Status Loading ───────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});

  // ─── Derived ────────────────────────────────────────────
  const filtered = [...usedTractors]
    .filter((t: any) => filterStatus === 'all' || t.status === filterStatus)
    .sort((a: any, b: any) => b.urgency_score - a.urgency_score);

  // ─── Handlers ───────────────────────────────────────────
  const handleAddTractor = async () => {
    if (!form.make || !form.model || !form.year) return;
    setAddLoading(true);
    try {
      const res = await api.tractors.create({
        dealer_id: dealerId, make: form.make, model: form.model,
        year: parseInt(form.year), hours: parseInt(form.hours) || 0,
        asking_price: parseInt(form.asking_price) || 0,
        cost_price: parseInt(form.cost_price) || 0, condition: form.condition,
      });
      setShowAdd(false);
      setForm({ make: '', model: '', year: '', hours: '', asking_price: '', cost_price: '', condition: 'good' });
      showToast('Tractor added!');
      if (res?.tractor) generateDescription(res.tractor);
      refetch();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to add tractor', 'error');
    }
    setAddLoading(false);
  };

  const handleCycleStatus = async (t: any) => {
    const next = STATUS_CYCLE[t.status] ?? 'available';
    setStatusLoading(s => ({ ...s, [t.id]: true }));
    try {
      await api.tractors.setStatus(t.id, next);
      showToast(`Marked as ${next}`);
      refetch();
    } catch {
      showToast('Failed to update status', 'error');
    }
    setStatusLoading(s => ({ ...s, [t.id]: false }));
  };

  const openEdit = (t: any) => {
    setEditForm({
      asking_price: String(t.asking_price),
      hours: String(t.hours),
      condition: t.condition,
      description: t.description ?? '',
    });
    setEditModal({ open: true, tractor: t });
  };

  const saveEdit = async () => {
    if (!editModal.tractor) return;
    setEditLoading(true);
    try {
      await api.tractors.update(editModal.tractor.id, {
        asking_price: parseInt(editForm.asking_price),
        hours: parseInt(editForm.hours),
        condition: editForm.condition,
        description: editForm.description,
      });
      showToast('Tractor updated!');
      setEditModal({ open: false });
      refetch();
    } catch {
      showToast('Failed to save changes', 'error');
    }
    setEditLoading(false);
  };

  const openPhotos = (t: any) => {
    setPhotoModal({ open: true, tractor: t, photos: t.photos ?? [] });
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    const current = photoModal.photos;
    const compressed: string[] = [];
    for (let i = 0; i < Math.min(files.length, 4 - current.length); i++) {
      try {
        compressed.push(await compressImage(files[i]));
      } catch { /* skip */ }
    }
    setPhotoModal(pm => ({ ...pm, photos: [...pm.photos, ...compressed] }));
    setPhotoUploading(false);
  };

  const removePhoto = (idx: number) => {
    setPhotoModal(pm => ({ ...pm, photos: pm.photos.filter((_, i) => i !== idx) }));
  };

  const savePhotos = async () => {
    if (!photoModal.tractor) return;
    setPhotoUploading(true);
    try {
      await api.tractors.update(photoModal.tractor.id, { photos: photoModal.photos });
      showToast(`${photoModal.photos.length} photo(s) saved!`);
      setPhotoModal({ open: false, photos: [] });
      refetch();
    } catch {
      showToast('Failed to save photos', 'error');
    }
    setPhotoUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteModal.tractor) return;
    setDeleteLoading(true);
    try {
      await api.tractors.setStatus(deleteModal.tractor.id, 'sold');
      showToast('Marked as sold & removed from active inventory');
      setDeleteModal({ open: false });
      refetch();
    } catch {
      showToast('Failed to update', 'error');
    }
    setDeleteLoading(false);
  };

  const generateDescription = async (t: any) => {
    setGenDesc({ open: true, tractor: t });
    setAiDesc('');
    setLoadingDesc(true);
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const raw = localStorage.getItem('agrodesk-auth');
      const token = raw ? JSON.parse(raw)?.state?.token : null;
      const res = await fetch(`${BASE}/api/ai/listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tractor: t }),
      });
      const d = await res.json();
      setAiDesc(d.description || t.ai_description || '');
    } catch {
      setAiDesc(t.ai_description || `${t.make} ${t.model} ${t.year}, ${t.hours} hrs. Condition: ${t.condition}. ₹${(t.asking_price / 100000).toFixed(1)}L — great deal!`);
    }
    setLoadingDesc(false);
  };

  const handleUrgencyRefresh = async () => {
    setUrgencyLoading(true);
    try {
      const res = await api.tractors.urgencyRefresh();
      showToast(`Urgency scores refreshed for ${(res as any).updated ?? 0} tractors`);
      refetch();
    } catch {
      showToast('Refresh failed', 'error');
    }
    setUrgencyLoading(false);
  };

  const copyListing = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  };

  // ─── Stats ───────────────────────────────────────────────
  const critical = usedTractors.filter((t: any) => t.urgency_score >= 85).length;
  const avgDays = Math.round(usedTractors.reduce((a: number, t: any) => a + t.days_on_lot, 0) / (usedTractors.length || 1));
  const totalValue = usedTractors.reduce((a: number, t: any) => a + t.asking_price, 0);

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Used Tractor Agent" subtitle="Module B · Smart inventory management & buyer matching" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Inventory" value={usedTractors.length} icon={<Truck size={16} />} accent="#a78bfa" />
          <MetricCard label="Sell Now (Critical)" value={critical} icon={<AlertTriangle size={16} />} accent="#ef4444" />
          <MetricCard label="Avg Days on Lot" value={avgDays} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Total Inventory Value" value={formatCurrency(totalValue)} icon={<CheckCircle size={16} />} accent="#4ade80" />
        </div>

        {/* Priority Banner */}
        {critical > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{critical} tractor{critical > 1 ? 's' : ''} need urgent attention</p>
              <p className="text-xs text-[var(--text-muted)]">High carrying cost — activate buyer outreach now</p>
            </div>
            <Button size="sm" variant="danger" icon={<Phone size={12} />} onClick={() => openScriptModal('cold_call_used')}>
              Start Outreach
            </Button>
          </div>
        )}

        {/* Header Actions + Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--border)]">
            {(['all', 'available', 'reserved', 'sold'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{ background: filterStatus === s ? 'rgba(74,222,128,0.12)' : 'transparent', color: filterStatus === s ? '#4ade80' : 'var(--text-muted)' }}>
                <Filter size={10} className="inline mr-1 -mt-0.5" />{s}
                {s !== 'all' && <span className="ml-1 opacity-60">({usedTractors.filter((t: any) => t.status === s).length})</span>}
                {s === 'all' && <span className="ml-1 opacity-60">({usedTractors.length})</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={<RefreshCw size={12} className={urgencyLoading ? 'animate-spin' : ''} />}
              onClick={handleUrgencyRefresh} disabled={urgencyLoading}>
              {urgencyLoading ? 'Refreshing…' : 'Urgency Refresh'}
            </Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>Add Tractor</Button>
          </div>
        </div>

        {/* Sort hint */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-secondary)]">Sorted by urgency (highest first)</span>
        </div>

        {/* Tractor Grid */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={`sk-${i}`} className="skeleton h-64 rounded-2xl" />)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t: any) => {
            const urgency = getUrgencyLabel(t.urgency_score);
            const margin = t.asking_price - t.cost_price;
            const photos = t.photos ?? [];
            return (
              <Card key={t.id} className="space-y-3" hover>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-display font-bold text-base text-[var(--text-primary)] truncate">{t.make} {t.model}</h3>
                      <button
                        onClick={() => handleCycleStatus(t)}
                        disabled={statusLoading[t.id]}
                        title="Click to change status"
                        className="transition-opacity hover:opacity-70">
                        <Badge variant={STATUS_VARIANTS[t.status] ?? 'info'}>{statusLoading[t.id] ? '…' : t.status}</Badge>
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{t.year} · {t.hours.toLocaleString()} hrs · {t.condition}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(t)} title="Edit"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                      <Pencil size={13} className="text-[var(--text-muted)]" />
                    </button>
                    <button onClick={() => setDeleteModal({ open: true, tractor: t })} title="Mark as Sold"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(239,68,68,0.1)] transition-colors">
                      <Trash2 size={13} className="text-red-400/70" />
                    </button>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-xs"
                      style={{ background: `${urgency.color}15`, color: urgency.color, border: `2px solid ${urgency.color}30` }}>
                      {t.urgency_score}
                    </div>
                  </div>
                </div>

                {/* Photo Strip */}
                <div
                  onClick={() => openPhotos(t)}
                  className="h-28 rounded-xl bg-[rgba(255,255,255,0.03)] border border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-brand-400/40 transition-colors relative overflow-hidden group">
                  {photos.length > 0 ? (
                    <>
                      <img src={photos[0]} className="w-full h-full object-cover rounded-xl" alt={t.model} />
                      {photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">+{photos.length - 1}</div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload size={20} className="text-[var(--text-muted)] mx-auto mb-1 group-hover:text-brand-400 transition-colors" />
                      <p className="text-xs text-[var(--text-muted)]">Add photos</p>
                    </div>
                  )}
                </div>

                {/* Price Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.03)]">
                  <div>
                    <p className="text-base font-display font-bold text-brand-400">{formatCurrency(t.asking_price)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Asking price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: margin > 0 ? '#4ade80' : '#ef4444' }}>
                      {margin >= 0 ? '+' : ''}{formatCurrency(margin)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Margin</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-400">{t.days_on_lot}d</p>
                    <p className="text-[10px] text-[var(--text-muted)]">On lot</p>
                  </div>
                </div>

                {/* AI Description */}
                {t.ai_description && (
                  <div className="flex items-start gap-2 group">
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 italic flex-1">"{t.ai_description}"</p>
                    <button onClick={() => copyListing(t.ai_description)} title="Copy listing"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Copy size={11} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                )}

                {/* Urgency */}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: urgency.color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: urgency.color }} />
                  {urgency.label} Priority
                  {t.urgency_score >= 70 && <span className="text-[var(--text-muted)] ml-1">— Start buyer outreach</span>}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1.5 pt-2 border-t border-[var(--border)]">
                  <Button variant="secondary" size="sm" icon={<Users size={11} />}
                    onClick={() => setCallBuyersModal({ open: true, tractor: t })} className="flex-1">
                    Call Buyers
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Sparkles size={11} />}
                    onClick={() => generateDescription(t)} className="flex-1">
                    AI Listing
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Camera size={11} />}
                    onClick={() => openPhotos(t)} className="flex-1">
                    Photos {photos.length > 0 && `(${photos.length})`}
                  </Button>
                </div>
              </Card>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div className="col-span-3 py-16 text-center text-[var(--text-muted)] text-sm">
              {usedTractors.length === 0 ? 'No tractors in inventory — add your first one!' : `No tractors with status "${filterStatus}"`}
            </div>
          )}
        </div>

        {/* ── ADD TRACTOR MODAL ───────────────────────────────── */}
        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Used Tractor" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Select label="Make" options={TRACTOR_MAKES.map((m: string) => ({ value: m, label: m }))}
                value={form.make} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, make: e.target.value }))} />
              <Input label="Model" placeholder="e.g. 575 DI"
                value={form.model} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, model: e.target.value }))} />
              <Input label="Year" type="number" placeholder="2019"
                value={form.year} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, year: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Hours Used" type="number" placeholder="2800"
                value={form.hours} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, hours: e.target.value }))} />
              <Input label="Asking Price (₹)" type="number" placeholder="420000"
                value={form.asking_price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, asking_price: e.target.value }))} />
              <Input label="Cost Price (₹)" type="number" placeholder="350000"
                value={form.cost_price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, cost_price: e.target.value }))} />
            </div>
            <Select label="Condition" options={[
              { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor (for parts)' },
            ]} value={form.condition} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, condition: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button icon={<Sparkles size={13} />} onClick={handleAddTractor} disabled={addLoading}>
                {addLoading ? 'Saving...' : 'Save & Generate AI Listing'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── EDIT TRACTOR MODAL ──────────────────────────────── */}
        <Modal open={editModal.open} onClose={() => setEditModal({ open: false })} title={`Edit · ${editModal.tractor?.make} ${editModal.tractor?.model}`} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Asking Price (₹)" type="number"
                value={editForm.asking_price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, asking_price: e.target.value }))} />
              <Input label="Hours Used" type="number"
                value={editForm.hours} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <Select label="Condition" options={[
              { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor (for parts)' },
            ]} value={editForm.condition} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(f => ({ ...f, condition: e.target.value }))} />
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description (optional)</label>
              <textarea rows={3} value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Any notes about this tractor..."
                className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-brand-400/50" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditModal({ open: false })}>Cancel</Button>
              <Button onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── PHOTOS MODAL ────────────────────────────────────── */}
        <Modal open={photoModal.open} onClose={() => setPhotoModal({ open: false, photos: [] })}
          title={`Photos · ${photoModal.tractor?.make} ${photoModal.tractor?.model}`} size="md">
          <div className="space-y-4">
            {/* Photo Grid */}
            {photoModal.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoModal.photos.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-square group">
                    <img src={src} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ))}
                {photoModal.photos.length < 4 && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-brand-400/50 transition-colors">
                    <Plus size={18} className="text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)]">Add</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-10 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center gap-2 hover:border-brand-400/50 transition-colors">
                <Upload size={28} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">Click to upload photos</p>
                <p className="text-xs text-[var(--text-muted)]">JPG, PNG — up to 4 photos</p>
              </button>
            )}
            <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e => handlePhotoFiles(e.target.files)} />
            <p className="text-xs text-[var(--text-muted)]">{4 - photoModal.photos.length} slot{4 - photoModal.photos.length !== 1 ? 's' : ''} remaining · Photos are compressed automatically</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPhotoModal({ open: false, photos: [] })}>Cancel</Button>
              {photoModal.photos.length > 0 && (
                <Button onClick={savePhotos} disabled={photoUploading}>
                  {photoUploading ? 'Saving...' : `Save ${photoModal.photos.length} Photo${photoModal.photos.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* ── DELETE CONFIRM ───────────────────────────────────── */}
        <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false })} title="Mark as Sold?" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              This will mark <strong className="text-[var(--text-primary)]">{deleteModal.tractor?.make} {deleteModal.tractor?.model}</strong> as <strong>Sold</strong> and remove it from active inventory.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteModal({ open: false })}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Updating...' : 'Mark as Sold'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── AI DESCRIPTION MODAL ────────────────────────────── */}
        <Modal open={genDesc.open} onClose={() => setGenDesc({ open: false })} title="AI Listing Description" size="md">
          {loadingDesc ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Sparkles size={16} className="text-brand-400 animate-pulse" />
              <span className="text-sm text-[var(--text-secondary)]">Generating listing description...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{aiDesc}</p>
              </div>
              <div className="flex gap-2">
                <Button icon={<Sparkles size={13} />} onClick={() => genDesc.tractor && generateDescription(genDesc.tractor)}>Regenerate</Button>
                <Button variant="secondary" icon={<Copy size={13} />} onClick={() => copyListing(aiDesc)}>Copy & Share</Button>
                <Button variant="ghost" onClick={() => setGenDesc({ open: false })}>Close</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── CALL BUYERS MODAL ───────────────────────────────── */}
        <Modal open={callBuyersModal.open} onClose={() => setCallBuyersModal({ open: false })}
          title={`Call Buyers · ${callBuyersModal.tractor?.make} ${callBuyersModal.tractor?.model}`} size="lg">
          <div className="space-y-4">
            {/* Tractor Summary */}
            {callBuyersModal.tractor && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--border)]">
                <div className="w-10 h-10 rounded-full bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                  <Truck size={16} className="text-brand-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {callBuyersModal.tractor.make} {callBuyersModal.tractor.model} {callBuyersModal.tractor.year}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatCurrency(callBuyersModal.tractor.asking_price)} · {callBuyersModal.tractor.condition} · {callBuyersModal.tractor.hours.toLocaleString()} hrs
                  </p>
                </div>
                <Button size="sm" icon={<Sparkles size={11} />}
                  onClick={() => { setCallBuyersModal({ open: false }); openScriptModal('cold_call_used', { tractor: callBuyersModal.tractor }); }}>
                  Generate Script
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--text-muted)]" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">Your Contacts ({buyers.length})</p>
              <span className="text-xs text-[var(--text-muted)]">— Call or WhatsApp each buyer</span>
            </div>

            {buyers.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)] text-sm">No contacts found — add buyers in the Contacts section</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {buyers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] hover:border-brand-400/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[rgba(74,222,128,0.1)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-400">{c.name?.[0] ?? '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{c.phone} · {c.village ?? c.district ?? 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {c.lead_status === 'interested' && (
                        <Star size={11} className="text-amber-400" fill="currentColor" />
                      )}
                      <button
                        onClick={() => { setCallBuyersModal({ open: false }); openScriptModal('cold_call_used', { tractor: callBuyersModal.tractor, contact: c }); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-400/10 hover:bg-brand-400/20 transition-colors">
                        <Phone size={12} className="text-brand-400" />
                      </button>
                      <button
                        onClick={() => { setCallBuyersModal({ open: false }); openScriptModal('whatsapp_offer', { tractor: callBuyersModal.tractor, contact: c }); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.15)] transition-colors">
                        <MessageSquare size={12} className="text-green-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setCallBuyersModal({ open: false })}>Close</Button>
              <Button icon={<Phone size={13} />}
                onClick={() => { setCallBuyersModal({ open: false }); openScriptModal('cold_call_used', { tractor: callBuyersModal.tractor }); }}>
                Generate Call Script
              </Button>
            </div>
          </div>
        </Modal>

      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
