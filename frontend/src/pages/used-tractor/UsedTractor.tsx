import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, Modal, Input, Select } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, TRACTOR_MAKES } from '../../lib/utils';
import { Truck, Plus, Sparkles, Phone, Camera, ArrowUpDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

function getUrgencyLabel(score: number) {
  if (score >= 85) return { label: 'Critical', color: '#ef4444' };
  if (score >= 65) return { label: 'High', color: '#fbbf24' };
  if (score >= 40) return { label: 'Medium', color: '#60a5fa' };
  return { label: 'Low', color: '#4ade80' };
}

export const UsedTractor: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data, loading, refetch } = useApi(() => api.tractors.list(dealerId), [dealerId]);
  const usedTractors = data?.tractors ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [genDesc, setGenDesc] = useState<{ open: boolean; tractor?: any }>({ open: false });
  const [aiDesc, setAiDesc] = useState('');
  const [loadingDesc, setLoadingDesc] = useState(false);

  // Add tractor form state
  const [form, setForm] = useState({
    make: '', model: '', year: '', hours: '', asking_price: '', cost_price: '', condition: 'good',
  });

  const sorted = [...usedTractors].sort((a: any, b: any) => b.urgency_score - a.urgency_score);

  const handleAddTractor = async () => {
    if (!form.make || !form.model || !form.year) return;
    setAddLoading(true);
    try {
      const res = await api.tractors.create({
        dealer_id: dealerId,
        make: form.make,
        model: form.model,
        year: parseInt(form.year),
        hours: parseInt(form.hours) || 0,
        asking_price: parseInt(form.asking_price) || 0,
        cost_price: parseInt(form.cost_price) || 0,
        condition: form.condition,
      });
      setShowAdd(false);
      setForm({ make: '', model: '', year: '', hours: '', asking_price: '', cost_price: '', condition: 'good' });
      // Auto-generate AI listing
      if (res?.tractor) generateDescription(res.tractor);
      refetch();
    } catch (e) {
      console.error(e);
    }
    setAddLoading(false);
  };

  const generateDescription = async (t: any) => {
    setGenDesc({ open: true, tractor: t });
    setAiDesc('');
    setLoadingDesc(true);
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${BASE}/api/ai/listing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tractor: t }),
      });
      const d = await res.json();
      setAiDesc(d.description || t.ai_description || '');
    } catch {
      setAiDesc(t.ai_description || `${t.make} ${t.model} ${t.year}, ${t.hours} hours. Condition: ${t.condition}. Asking ₹${(t.asking_price / 100000).toFixed(1)}L.`);
    }
    setLoadingDesc(false);
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Used Tractor Agent" subtitle="Module B · Smart inventory management & buyer matching" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Inventory" value={usedTractors.length} icon={<Truck size={16} />} accent="#a78bfa" />
          <MetricCard label="Critical (Sell Now)" value={usedTractors.filter((t: any) => t.urgency_score >= 85).length} icon={<AlertTriangle size={16} />} accent="#ef4444" />
          <MetricCard label="Avg Days on Lot" value={Math.round(usedTractors.reduce((a: number, t: any) => a + t.days_on_lot, 0) / usedTractors.length || 0)} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Total Value" value={formatCurrency(usedTractors.reduce((a: number, t: any) => a + t.asking_price, 0))} icon={<CheckCircle size={16} />} accent="#4ade80" />
        </div>

        {/* Priority Banner */}
        {usedTractors.some((t: any) => t.urgency_score >= 85) && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {usedTractors.filter((t: any) => t.urgency_score >= 85).length} tractors need urgent attention
              </p>
              <p className="text-xs text-[var(--text-muted)]">High carrying cost — activate buyer outreach now</p>
            </div>
            <Button size="sm" variant="danger" icon={<Phone size={12} />}
              onClick={() => openScriptModal('cold_call_used')}>
              Start Outreach
            </Button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-secondary)]">Sorted by urgency (highest first)</span>
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>Add Tractor</Button>
        </div>

        {/* Tractor Grid */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={`sk-${i}`} className="skeleton h-56 rounded-2xl" />)}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((t: any) => {
            const urgency = getUrgencyLabel(t.urgency_score);
            const margin = t.asking_price - t.cost_price;
            return (
              <Card key={t.id} className="space-y-4" hover>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                        {t.make} {t.model}
                      </h3>
                      <Badge variant={t.status === 'available' ? 'active' : t.status === 'reserved' ? 'pending' : 'info'}>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{t.year} · {t.hours.toLocaleString()} hrs · {t.condition}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-sm"
                    style={{ background: `${urgency.color}15`, color: urgency.color, border: `2px solid ${urgency.color}30` }}>
                    {t.urgency_score}
                  </div>
                </div>

                <div className="h-28 rounded-xl bg-[rgba(255,255,255,0.03)] border border-dashed border-[var(--border)] flex items-center justify-center">
                  {t.photos && t.photos.length > 0 ? (
                    <img src={t.photos[0]} className="w-full h-full object-cover rounded-xl" alt={t.model} />
                  ) : (
                    <div className="text-center">
                      <Truck size={24} className="text-[var(--text-muted)] mx-auto mb-1" />
                      <p className="text-xs text-[var(--text-muted)]">No photos</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.03)]">
                  <div>
                    <p className="text-lg font-display font-bold text-brand-400">{formatCurrency(t.asking_price)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Asking price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: margin > 0 ? '#4ade80' : '#ef4444' }}>
                      +{formatCurrency(margin)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Margin</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-400">{t.days_on_lot}d</p>
                    <p className="text-[10px] text-[var(--text-muted)]">On lot</p>
                  </div>
                </div>

                {t.ai_description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 italic">"{t.ai_description}"</p>
                )}

                <div className="flex items-center gap-1.5 text-xs" style={{ color: urgency.color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: urgency.color }} />
                  {urgency.label} Priority
                  {t.urgency_score >= 70 && <span className="text-[var(--text-muted)] ml-1">— Start buyer outreach</span>}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                  <Button variant="secondary" size="sm" icon={<Phone size={12} />}
                    onClick={() => openScriptModal('cold_call_used', { tractor: t })}>
                    Call Buyers
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Sparkles size={12} />}
                    onClick={() => generateDescription(t)}>
                    AI Listing
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Camera size={12} />}>
                    Photos
                  </Button>
                </div>
              </Card>
            );
          })}
          {usedTractors.length === 0 && !loading && (
            <div className="col-span-3 py-16 text-center text-[var(--text-muted)] text-sm">No tractors in inventory</div>
          )}
        </div>

        {/* Add Tractor Modal */}
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
            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] flex items-start gap-2">
              <Camera size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">Upload Photos</p>
                <p className="text-xs text-[var(--text-muted)]">Click to upload from phone or drag & drop</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button icon={<Sparkles size={13} />} onClick={handleAddTractor} disabled={addLoading}>
                {addLoading ? 'Saving...' : 'Save & Generate AI Listing'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* AI Description Modal */}
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
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(aiDesc)}>Copy & Share</Button>
                <Button variant="ghost" onClick={() => setGenDesc({ open: false })}>Close</Button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </div>
  );
};
