import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Header } from '../../components/layout/Header';
import { MetricCard, Card, Badge, Avatar, ProgressBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatRelative } from '../../lib/utils';
import {
  Users, Megaphone, IndianRupee, Phone, Truck,
  ArrowRight, TrendingUp, Sparkles, CheckCircle, Activity,
} from 'lucide-react';

// ─── Static chart data ────────────────────────────────────────────────────────
const salesData = [
  { month: 'Aug', sales: 22, enquiries: 145 }, { month: 'Sep', sales: 28, enquiries: 178 },
  { month: 'Oct', sales: 31, enquiries: 210 }, { month: 'Nov', sales: 27, enquiries: 192 },
  { month: 'Dec', sales: 34, enquiries: 234 }, { month: 'Jan', sales: 38, enquiries: 267 },
];
const channelData = [
  { name: 'WhatsApp', value: 45, color: '#4ade80' },
  { name: 'Voice',    value: 28, color: '#60a5fa' },
  { name: 'SMS',      value: 18, color: '#fbbf24' },
  { name: 'Walk-in',  value: 9,  color: '#a78bfa' },
];

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-[var(--border)] text-xs shadow-[var(--shadow-lg)]">
      <p className="text-[var(--text-muted)] mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          {p.name}: <strong className="ml-auto pl-2 tabular-nums">{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Fade-up stagger helper ───────────────────────────────────────────────────
const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({
  delay = 0, children, className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { dealer } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';

  const { data: metricsData, loading: mLoading } = useApi(() => api.dashboard.metrics(dealerId), [dealerId]);
  const { data: contactsData } = useApi(() => api.contacts.list(dealerId, { limit: 10 }), [dealerId]);
  const { data: recoveryData } = useApi(() => api.recovery.list(dealerId), [dealerId]);
  const { data: campaignsData } = useApi(() => api.campaigns.list(dealerId), [dealerId]);
  const { data: activityData } = useApi(() => api.dashboard.activity(dealerId, 6), [dealerId]);

  const m = metricsData;
  const hotLeads = (contactsData?.contacts ?? []).filter((c: any) => c.score >= 70).slice(0, 4);
  const topCases = (recoveryData?.cases ?? []).slice(0, 3);
  const runningCampaigns = (campaignsData?.campaigns ?? []).filter((c: any) => c.status === 'running');
  const activity = activityData?.activity ?? [];

  const agentTypeLabel: Record<string, string> = {
    cold_calling: 'Cold Calling', money_recovery: 'Money Recovery',
    used_tractor: 'Used Tractor', sales_engine: 'Sales Engine',
    send_to_accountant: 'AI Accountant', ai_salesman: 'AI Salesman',
  };
  const agentTypeIcon: Record<string, React.ElementType> = {
    cold_calling: Phone, money_recovery: IndianRupee, used_tractor: Truck,
    sales_engine: Megaphone, send_to_accountant: CheckCircle, ai_salesman: Sparkles,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const location = [dealer?.city, dealer?.district].filter(Boolean).join(', ');
  const subtitle = [`${greeting}, ${dealer?.name ?? 'Dealer'}`, location].filter(Boolean).join(' · ');

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" subtitle={subtitle} />
      <div className="p-6 space-y-5">

        {/* ── Season Banner ─────────────────────────────────────────────── */}
        <FadeUp delay={0}>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-brand)] bg-gradient-to-r from-[rgba(34,197,94,0.05)] via-[rgba(34,197,94,0.03)] to-transparent px-6 py-3.5">
            {/* Wheat stalks */}
            <div className="absolute left-5 top-0 bottom-0 flex items-end gap-2 opacity-[0.15] pointer-events-none select-none" aria-hidden="true">
              {[-4, 0, 5].map((rot, i) => (
                <svg key={i} className="h-12 w-4 text-brand-400 wheat-sway" style={{ transform: `rotate(${rot}deg)`, animationDelay: `${i * 0.4}s` }} viewBox="0 0 20 56" fill="none">
                  <line x1="10" y1="56" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5"/>
                  <ellipse cx="15" cy="10" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 10)"/>
                  <ellipse cx="5" cy="18" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 18)"/>
                  <ellipse cx="15" cy="26" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 26)"/>
                  <ellipse cx="5" cy="34" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 34)"/>
                  <ellipse cx="10" cy="4" rx="3" ry="1.8" fill="currentColor"/>
                </svg>
              ))}
            </div>

            <div className="text-center">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-brand-400/70 mb-0.5">Kharif Season 2024 · Maharashtra</p>
              <p className="text-sm font-display font-medium text-[var(--text-secondary)]">
                Dealership intelligence active for{' '}
                <span className="text-brand-400 font-semibold">{location || 'your region'}</span>
              </p>
            </div>

            <div className="absolute right-5 top-0 bottom-0 flex items-center opacity-[0.12] pointer-events-none select-none" aria-hidden="true">
              <svg className="h-12 w-auto text-brand-400 tractor-float" viewBox="0 0 110 70" fill="none">
                <circle cx="28" cy="46" r="20" stroke="currentColor" strokeWidth="2.5"/>
                <circle cx="28" cy="46" r="13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4"/>
                <circle cx="28" cy="46" r="3" fill="currentColor"/>
                <line x1="28" y1="26" x2="28" y2="66" stroke="currentColor" strokeWidth="1"/>
                <line x1="8" y1="46" x2="48" y2="46" stroke="currentColor" strokeWidth="1"/>
                <line x1="14" y1="32" x2="42" y2="60" stroke="currentColor" strokeWidth="1"/>
                <line x1="42" y1="32" x2="14" y2="60" stroke="currentColor" strokeWidth="1"/>
                <circle cx="88" cy="52" r="14" stroke="currentColor" strokeWidth="2"/>
                <circle cx="88" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
                <circle cx="88" cy="52" r="2.5" fill="currentColor"/>
                <rect x="30" y="38" width="60" height="7" rx="2.5" fill="currentColor" opacity="0.5"/>
                <rect x="34" y="16" width="24" height="25" rx="3" fill="currentColor" opacity="0.25"/>
                <rect x="34" y="16" width="24" height="25" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="38" y="20" width="16" height="12" rx="2" fill="currentColor" opacity="0.4"/>
                <rect x="57" y="21" width="22" height="18" rx="2" fill="currentColor" opacity="0.35"/>
                <rect x="76" y="12" width="4" height="13" rx="2" fill="currentColor" opacity="0.65"/>
              </svg>
            </div>
          </div>
        </FadeUp>

        {/* ── Metrics Grid ──────────────────────────────────────────────── */}
        <FadeUp delay={0.04}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <MetricCard
              label="Total Leads"
              value={mLoading ? '—' : (m?.total_leads ?? 0).toLocaleString()}
              sub={`+${m?.new_leads_today ?? 0} today`}
              icon={<Users size={16} />}
              accent="#4ade80"
              trend={{ value: 12, label: 'vs last month' }}
            />
            <MetricCard
              label="Active Campaigns"
              value={mLoading ? '—' : (m?.active_campaigns ?? 0)}
              sub="Across all channels"
              icon={<Megaphone size={16} />}
              accent="#60a5fa"
            />
            <MetricCard
              label="Recovery Due"
              value={mLoading ? '—' : formatCurrency(m?.recovery_amount ?? 0)}
              sub={`${m?.pending_recovery ?? 0} cases`}
              icon={<IndianRupee size={16} />}
              accent="#fbbf24"
              trend={{ value: -8, label: 'resolved' }}
            />
            <MetricCard
              label="Used Tractors"
              value={mLoading ? '—' : (m?.used_tractors ?? 0)}
              sub="In inventory"
              icon={<Truck size={16} />}
              accent="#a78bfa"
            />
            <MetricCard
              label="Monthly Sales"
              value={mLoading ? '—' : (m?.monthly_sales ?? 0)}
              sub={`${m?.conversion_rate ?? 0}% conversion`}
              icon={<TrendingUp size={16} />}
              accent="#34d399"
              trend={{ value: 18, label: 'vs last month' }}
            />
          </div>
        </FadeUp>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <FadeUp delay={0.08}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Sales & Enquiries</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Last 6 months</p>
                </div>
                <Badge variant="active">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
                  Live
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={156}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="enquiryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: 'rgba(240,253,244,0.35)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(240,253,244,0.35)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="enquiries" name="Enquiries" stroke="#60a5fa" strokeWidth={1.5} fill="url(#enquiryGrad)" dot={false} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#4ade80" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-0.5">Lead Sources</h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">By channel this month</p>
              <ResponsiveContainer width="100%" height={128}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {channelData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {channelData.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-xs text-[var(--text-secondary)]">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{c.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </FadeUp>

        {/* ── Middle Row ────────────────────────────────────────────────── */}
        <FadeUp delay={0.12}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Agent Activity */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Agent Activity</h3>
                <div className="flex items-center gap-1.5">
                  {[12, 20, 14, 18, 10].map((h, i) => (
                    <div
                      key={i}
                      className="voice-bar"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                  <span className="text-[11px] text-brand-400 ml-1.5 tabular-nums">{activity.length} jobs</span>
                </div>
              </div>
              {activity.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">No agent activity yet</p>
              ) : (
                <div className="space-y-0.5">
                  {activity.map((job: any, idx: number) => {
                    const Icon = agentTypeIcon[job.agent_type] ?? Activity;
                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.14 + idx * 0.04 }}
                        className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.03)] last:border-0"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                          <Icon size={11} className="text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {agentTypeLabel[job.agent_type] ?? job.agent_type}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">{formatRelative(job.created_at)}</p>
                        </div>
                        <Badge
                          variant={job.status === 'completed' ? 'active' : job.status === 'running' ? 'pending' : 'info'}
                          className="text-[10px]"
                        >
                          {job.status}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Hot Leads */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Hot Leads</h3>
                <Link to="/crm/contacts" className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={10} />
                </Link>
              </div>
              {hotLeads.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">No hot leads yet</p>
              ) : (
                <div className="space-y-3">
                  {hotLeads.map((c: any, idx: number) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.16 + idx * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={c.name} size={30} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {c.village ?? ''}{c.district ? `, ${c.district}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                    