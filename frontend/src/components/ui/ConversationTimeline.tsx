import React, { useEffect, useState } from 'react';
import { Phone, MessageSquare, Zap, Mail, ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

// ── types ─────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  channel: 'whatsapp' | 'voice' | 'sms' | 'email';
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  sentiment?: string | null;
  intent?: string | null;
  duration_sec?: number | null;
  created_at: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare size={12} />,
  voice:    <Phone size={12} />,
  sms:      <Zap size={12} />,
  email:    <Mail size={12} />,
};
const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: '#4ade80', voice: '#fbbf24', sms: '#60a5fa', email: '#a78bfa',
};
const INTENT_BADGE: Record<string, { label: string; color: string }> = {
  interested:     { label: 'Interested 🔥', color: '#4ade80' },
  not_interested: { label: 'Not interested', color: '#f87171' },
  callback:       { label: 'Callback requested', color: '#fbbf24' },
  info_request:   { label: 'Info request', color: '#60a5fa' },
  complaint:      { label: 'Complaint', color: '#f87171' },
  other:          { label: 'Other', color: '#6b7280' },
};
const SENTIMENT_DOT: Record<string, string> = {
  positive: '#4ade80', neutral: '#94a3b8', negative: '#f87171',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  contactId: string;
  dealerId: string;
  /** If true, renders as a compact feed (no header, smaller padding) */
  compact?: boolean;
}

export const ConversationTimeline: React.FC<Props> = ({ contactId, dealerId, compact = false }) => {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.conversations.list(dealerId, { contact_id: contactId, limit: 30 });
      setConvs((res as { conversations: Conversation[] }).conversations ?? []);
    } catch {
      setError('Could not load conversation history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [contactId, dealerId]);

  if (loading) return (
    <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
      <Loader2 size={14} className="animate-spin" /><span className="text-xs">Loading history…</span>
    </div>
  );

  if (error) return (
    <div className="text-xs text-red-400 text-center py-4">{error}</div>
  );

  if (convs.length === 0) return (
    <div className="text-center py-8">
      <MessageSquare size={24} className="mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
      <p className="text-xs text-[var(--text-muted)]">No conversations yet</p>
      <p className="text-[10px] text-[var(--text-muted)] opacity-60 mt-1">Messages will appear here once outreach begins</p>
    </div>
  );

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Conversation History · {convs.length}
          </p>
          <button onClick={load} className="text-[var(--text-muted)] hover:text-brand-400 transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[var(--border)]" />

        <div className="space-y-3">
          {convs.map((c) => {
            const color = CHANNEL_COLOR[c.channel] ?? '#888';
            const intent = c.intent ? INTENT_BADGE[c.intent] : null;
            const isOut = c.direction === 'outbound';

            return (
              <div key={c.id} className="flex gap-3 pl-1 relative">
                {/* channel dot */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 z-10"
                  style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
                >
                  {CHANNEL_ICON[c.channel]}
                </div>

                {/* bubble */}
                <div className={`flex-1 min-w-0 p-3 rounded-xl border text-xs leading-relaxed ${
                  isOut
                    ? 'bg-[rgba(74,222,128,0.04)] border-[rgba(74,222,128,0.15)]'
                    : 'bg-[var(--surface)] border-[var(--border)]'
                }`}>
                  {/* top row */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-medium" style={{ color }}>{c.channel}</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-0.5">
                      {isOut ? <ArrowUpRight size={10} className="text-brand-400" /> : <ArrowDownLeft size={10} className="text-blue-400" />}
                      {isOut ? 'sent' : 'received'}
                    </span>
                    <span className="text-[var(--text-muted)] ml-auto">{relativeTime(c.created_at)}</span>
                    {c.sentiment && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        title={`Sentiment: ${c.sentiment}`}
                        style={{ background: SENTIMENT_DOT[c.sentiment] ?? '#888' }}
                      />
                    )}
                  </div>

                  {/* message */}
                  <p className="text-[var(--text-secondary)] leading-relaxed">{c.content}</p>

                  {/* footer */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {intent && (
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${intent.color}18`, color: intent.color, border: `1px solid ${intent.color}30` }}>
                        {intent.label}
                      </span>
                    )}
                    {c.duration_sec != null && (
                      <span className="text-[10px] text-[var(--text-muted)]">⏱ {c.duration_sec}s</span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] capitalize ml-auto">{c.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConversationTimeline;
