import React from 'react';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatRelative } from '../../lib/utils';
import { Phone, MessageSquare, Sparkles, Plus } from 'lucide-react';
import { useAppStore } from '../../store';

const STAGES = [
  { id: 'new', label: 'New Leads', color: '#60a5fa', accent: 'rgba(96,165,250,0.1)' },
  { id: 'contacted', label: 'Contacted', color: '#a78bfa', accent: 'rgba(167,139,250,0.1)' },
  { id: 'qualified', label: 'Qualified', color: '#4ade80', accent: 'rgba(74,222,128,0.1)' },
  { id: 'proposal', label: 'Proposal', color: '#fbbf24', accent: 'rgba(251,191,36,0.1)' },
  { id: 'negotiation', label: 'Negotiation', color: '#f97316', accent: 'rgba(249,115,22,0.1)' },
  { id: 'won', label: 'Won', color: '#34d399', accent: 'rgba(52,211,153,0.1)' },
];

export const Pipeline: React.FC = () => {
  const { dealer, openScriptModal } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data } = useApi(() => api.contacts.list(dealerId, { limit: 500 }), [dealerId]);
  const contacts = data?.contacts ?? [];

  return (
    <div className="flex-1 overflow-auto">
      <Header title="CRM · Pipeline" subtitle="Drag leads across stages · Maharashtra region" />
      <div className="p-6 ">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageContacts = contacts.filter(c => c.lead_status === stage.id);
            const total = stageContacts.reduce((a, _) => a + 1, 0);
            return (
              <div key={stage.id} className="flex-shrink-0 w-64">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: stage.accent, color: stage.color }}>{total}</span>
                  </div>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]">
                    <Plus size={13} />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[400px]">
                  {stageContacts.map(c => (
                    <div key={c.id} className="glass rounded-xl p-3 border border-[var(--border)] hover:border-[var(--border-bright)] transition-all cursor-grab active:cursor-grabbing group"
                      style={{ borderTopColor: `${stage.color}30`, borderTopWidth: 2 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar name={c.name} size={28} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{c.village}</p>
                        </div>
                        <div className="text-xs font-bold" style={{ color: c.score >= 80 ? '#ef4444' : c.score >= 60 ? '#fbbf24' : '#4ade80' }}>{c.score}</div>
                      </div>

                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {c.tags.slice(0, 2).map((t: string) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">{t}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-muted)]">{c.last_contact ? formatRelative(c.last_contact) : 'No contact'}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 rounded hover:bg-[rgba(74,222,128,0.1)] text-[var(--text-muted)] hover:text-brand-400 transition-colors">
                            <Phone size={10} />
                          </button>
                          <button className="p-1 rounded hover:bg-[rgba(96,165,250,0.1)] text-[var(--text-muted)] hover:text-blue-400 transition-colors">
                            <MessageSquare size={10} />
                          </button>
                          <button onClick={() => openScriptModal('follow_up', { contact: c })}
                            className="p-1 rounded hover:bg-[rgba(167,139,250,0.1)] text-[var(--text-muted)] hover:text-purple-400 transition-colors">
                            <Sparkles size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageContacts.length === 0 && (
                    <div className="h-24 rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                      <p className="text-xs text-[var(--text-muted)]">Drop leads here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
