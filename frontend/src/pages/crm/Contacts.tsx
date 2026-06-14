import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, Avatar, SearchInput, TabBar, Modal, Input, Select } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatRelative, LANGUAGES } from '../../lib/utils';
import { UserPlus, Phone, MessageSquare, Sparkles, Filter, Download, ChevronUp, ChevronDown } from 'lucide-react';

const STAGE_TABS = [
  { id: 'all', label: 'All', count: 0 },
  { id: 'new', label: 'New' }, { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' }, { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' }, { id: 'lost', label: 'Lost' },
];

export const Contacts: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'score' | 'last_contact'>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', village: '', district: '',
    language: 'hi', lead_status: 'new',
    opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: true,
  });

  const handleSaveContact = async () => {
    if (!form.name || !form.phone) return;
    setAddLoading(true);
    try {
      await api.contacts.create({
        dealer_id: dealerId,
        name: form.name,
        phone: form.phone,
        village: form.village,
        district: form.district,
        language: form.language,
        lead_status: form.lead_status,
        opt_in_whatsapp: form.opt_in_whatsapp,
        opt_in_sms: form.opt_in_sms,
        opt_in_call: form.opt_in_call,
      });
      setShowAdd(false);
      setForm({ name: '', phone: '', village: '', district: '', language: 'hi', lead_status: 'new',
        opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: true });
      refetch();
    } catch (e) {
      console.error(e);
    }
    setAddLoading(false);
  };

  const { data, loading, error, refetch } = useApi(() => api.contacts.list(dealerId, { limit: 200 }), [dealerId]);
  const contacts = data?.contacts ?? [];

  const tabs = STAGE_TABS.map(t => ({ ...t, count: t.id === 'all' ? contacts.length : contacts.filter(c => c.lead_status === t.id).length }));

  const filtered = contacts
    .filter(c => stage === 'all' || c.lead_status === stage)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.village?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va: any = a[sortField]; let vb: any = b[sortField];
      if (sortField === 'last_contact') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0; }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const toggleSort = (f: typeof sortField) => { if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(false); } };
  const SortIcon = ({ f }: { f: typeof sortField }) => sortField === f ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  return (
    <div className="flex-1 overflow-auto">
      <Header title="CRM · Contacts" subtitle={`${contacts.length} contacts across Maharashtra`} />
      <div className="p-6 space-y-4 page-enter">

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Hot Leads', value: contacts.filter(c => c.score >= 80).length, color: '#ef4444' },
            { label: 'Qualified', value: contacts.filter(c => c.lead_status === 'qualified').length, color: '#4ade80' },
            { label: 'Opt-in WhatsApp', value: contacts.filter(c => c.opt_in_whatsapp).length, color: '#60a5fa' },
            { label: 'Won This Month', value: contacts.filter(c => c.lead_status === 'won').length, color: '#a78bfa' },
          ].map(s => (
            <Card key={s.label} className="border-l-[3px] py-3" style={{ borderLeftColor: s.color } as React.CSSProperties}>
              <p className="text-xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabBar tabs={tabs} active={stage} onChange={setStage} />
          <div className="flex gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search contacts..." />
            <Button variant="secondary" size="sm" icon={<Filter size={13} />}>Filter</Button>
            <Button variant="secondary" size="sm" icon={<Download size={13} />}>Export</Button>
            <Button size="sm" icon={<UserPlus size={13} />} onClick={() => setShowAdd(true)}>Add Contact</Button>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Language</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">Stage <SortIcon f="name" /></span>
                  </th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('score')}>
                    <span className="flex items-center gap-1">Score <SortIcon f="score" /></span>
                  </th>
                  <th>Channels</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('last_contact')}>
                    <span className="flex items-center gap-1">Last Contact <SortIcon f="last_contact" /></span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={`sk-${i}`}><td colSpan={8}><div className="skeleton h-9 rounded-lg my-1" /></td></tr>
                  ))
                ) : error ? (
                  <tr><td colSpan={8} className="text-center py-10 text-sm text-red-400">Couldn't load contacts — <button onClick={refetch} className="underline hover:text-red-300">retry</button></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-sm text-[var(--text-muted)]">{contacts.length === 0 ? 'No contacts yet — add your first contact to get started.' : 'No contacts match your filters.'}</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={34} />
                        <div>
                          <p className="font-medium text-sm text-[var(--text-primary)]">{c.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">{c.village}, {c.district}</td>
                    <td>
                      <span className="text-xs px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]">
                        {LANGUAGES.find(l => l.code === c.language)?.label || c.language}
                      </span>
                    </td>
                    <td>
                      <Badge variant={c.lead_status === 'won' ? 'active' : c.lead_status === 'lost' ? 'overdue' : c.lead_status === 'qualified' || c.lead_status === 'proposal' ? 'pending' : 'info'}>
                        {c.lead_status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 80 ? '#ef4444' : c.score >= 60 ? '#fbbf24' : '#4ade80' }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: c.score >= 80 ? '#ef4444' : c.score >= 60 ? '#fbbf24' : '#4ade80' }}>{c.score}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {c.opt_in_whatsapp && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.1)] text-brand-400">WA</span>}
                        {c.opt_in_sms && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(96,165,250,0.1)] text-blue-400">SMS</span>}
                        {c.opt_in_call && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(251,191,36,0.1)] text-amber-400">Call</span>}
                      </div>
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">{c.last_contact ? formatRelative(c.last_contact) : '—'}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.1)] text-[var(--text-muted)] hover:text-brand-400 transition-colors" title="Call">
                          <Phone size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-[rgba(96,165,250,0.1)] text-[var(--text-muted)] hover:text-blue-400 transition-colors" title="WhatsApp">
                          <MessageSquare size={13} />
                        </button>
                        <button onClick={() => openScriptModal('cold_call_new', { contact: c })}
                          className="p-1.5 rounded-lg hover:bg-[rgba(167,139,250,0.1)] text-[var(--text-muted)] hover:text-purple-400 transition-colors" title="AI Script">
                          <Sparkles size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">No contacts found</div>
            )}
          </div>
        </Card>

        {/* Add Contact Modal */}
        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Contact">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name" placeholder="Ramesh Patil" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Village" placeholder="Sinnar" value={form.village} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, village: e.target.value }))} />
              <Input label="District" placeholder="Nashik" value={form.district} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, district: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Language" options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} value={form.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, language: e.target.value }))} />
              <Select label="Lead Stage" options={[
                { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' },
                { value: 'qualified', label: 'Qualified' },
              ]} value={form.lead_status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, lead_status: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" className="accent-brand-400" checked={form.opt_in_whatsapp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, opt_in_whatsapp: e.target.checked }))} /> WhatsApp opt-in
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" className="accent-brand-400" checked={form.opt_in_sms} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, opt_in_sms: e.target.checked }))} /> SMS opt-in
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" className="accent-brand-400" checked={form.opt_in_call} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, opt_in_call: e.target.checked }))} /> Call opt-in
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleSaveContact} disabled={addLoading}>{addLoading ? 'Saving...' : 'Save Contact'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
