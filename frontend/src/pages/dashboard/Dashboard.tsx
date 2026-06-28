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
import { useChartTheme } from '../../lib/useChartTheme';
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
  const chart = useChartTheme();

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
  const location = [dealer?.city, dealer?.district].filter(Boolean).join(', ');

  // ── Time-aware greeting config ──────────────────────────────────────────────
  const greetingConfig = (() => {
    if (hour >= 5 && hour < 12) return {
      label: 'Good morning',
      emoji: '☀️',
      quips: ['Rise and harvest! 🚜', 'Fields are calling!', 'A fresh day, a full pipeline 🌱', 'Time to sow some leads!'],
      gradient: 'from-[rgba(251,191,36,0.08)] via-[rgba(74,222,128,0.05)] to-transparent',
      accent: '#fbbf24',
      tag: 'Morning shift',
    };
    if (hour >= 12 && hour < 17) return {
      label: 'Good afternoon',
      emoji: '🌤️',
      quips: ["Tractors don't take lunch breaks 🚜", 'Half the day, double the hustle!', 'Keeping the momentum going 💪', 'Stay sharp, the harvest waits!'],
      gradient: 'from-[rgba(96,165,250,0.08)] via-[rgba(74,222,128,0.04)] to-transparent',
      accent: '#60a5fa',
      tag: 'Afternoon push',
    };
    if (hour >= 17 && hour < 21) return {
      label: 'Good evening',
      emoji: '🌆',
      quips: ["Great work today, farmer! 🌾", 'Wrapping up the day\'s harvest', 'The sun sets on a productive day ✨', 'Evening glow, pipeline grows 🌿'],
      gradient: 'from-[rgba(167,139,250,0.08)] via-[rgba(74,222,128,0.04)] to-transparent',
      accent: '#a78bfa',
      tag: 'Evening review',
    };
    return {
      label: 'Good night',
      emoji: '🌙',
      quips: ["Tomorrow's seeds are today's dreams ⭐", 'Rest well, the fields will wait', 'Night owl or early bird — you grind! 💤', "Stars and sales don't sleep 🌟"],
      gradient: 'from-[rgba(148,163,184,0.08)] via-[rgba(74,222,128,0.03)] to-transparent',
      accent: '#94a3b8',
      tag: 'Late session',
    };
  })();

  const randomQuip = greetingConfig.quips[Math.floor(Date.now() / 1000 / 3600) % greetingConfig.quips.length];
  const subtitle = [`${greetingConfig.label}, ${dealer?.name ?? 'Dealer'}`, location].filter(Boolean).join(' · ');

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" subtitle={subtitle} />
      <div className="p-6 space-y-5">

        {/* ── Greeting Banner ───────────────────────────────────────────── */}
        <FadeUp delay={0}>
          <div className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r ${greetingConfig.gradient} px-5 py-3`}>
            {/* Left glow blob */}
            <div
              className="absolute -left-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
              style={{ background: greetingConfig.accent }}
              aria-hidden="true"
            />

            <div className="relative flex items-center justify-between gap-4">
              {/* Emoji + greeting */}
              <div className="flex items-center gap-3 min-w-0">
                <motion.span
                  key={greetingConfig.emoji}
                  initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="text-2xl select-none flex-shrink-0"
                  aria-hidden="true"
                >
                  {greetingConfig.emoji}
                </motion.span>

                <div className="min-w-0">
                  <p className="text-sm font-display font-semibold text-[var(--text-primary)] leading-tight">
                    {greetingConfig.label},{' '}
                    <span style={{ color: greetingConfig.accent }}>
                      {dealer?.name ?? 'Farmer'}!
                    </span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{randomQuip}</p>
                </div>
              </div>

              {/* Right: tag + location */}
              <div className="flex-shrink-0 text-right hidden sm:block">
                <span
                  className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${greetingConfig.accent}18`, color: greetingConfig.accent }}
                >
                  {greetingConfig.tag}
                </span>
                {location && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">{location}</p>
                )}
              </div>
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
                  <XAxis dataKey="month" tick={chart.tick} axisLine={false} tickLine={false} />
                  <YAxis tick={chart.tickSm} axisLine={false} tickLine={false} width={28} />
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
                        <div
                          className="text-xs font-bold tabular-nums"
                          style={{ color: c.score >= 90 ? '#ef4444' : c.score >= 70 ? '#fbbf24' : '#4ade80' }}
                        >
                          {c.score}
                        </div>
                        <p className="text-[9px] text-[var(--text-muted)]">score</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </FadeUp>

        {/* ── Bottom Row ────────────────────────────────────────────────── */}
        <FadeUp delay={0.16}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recovery Status */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Recovery Status</h3>
                <Link to="/money-recovery" className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                  View →
                </Link>
              </div>
              {topCases.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">No active cases</p>
              ) : (
                <div className="space-y-3">
                  {topCases.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          r.escalation_stage === 'legal' ? 'bg-red-500' :
                          r.escalation_stage === 'stern' ? 'bg-orange-500' :
                          r.escalation_stage === 'firm' ? 'bg-yellow-500' : 'bg-brand-400'
                        }`} />
                        <span className="text-xs text-[var(--text-primary)] truncate">{r.customer_name}</span>
                      </div>
                      <span className="text-xs font-semibold text-amber-400 flex-shrink-0 tabular-nums">
                        {formatCurrency(r.amount_due)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <ProgressBar
                  value={0}
                  max={Math.max(m?.pending_recovery ?? 1, 1)}
                  label="Resolved this month"
                  color="#4ade80"
                />
              </div>
            </Card>

            {/* Active Campaigns */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Active Campaigns</h3>
                <Link to="/sales-engine" className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                  View →
                </Link>
              </div>
              {runningCampaigns.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">No active campaigns</p>
              ) : (
                <div className="space-y-4">
                  {runningCampaigns.slice(0, 3).map((c: any) => (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[var(--text-primary)] truncate flex-1">{c.name}</span>
                        <Badge variant="active" className="ml-2 text-[10px]">Live</Badge>
                      </div>
                      <ProgressBar
                        value={c.sent ?? 0}
                        max={Math.max(c.total_contacts ?? 1, 1)}
                        color="#60a5fa"
                        label={`${c.sent ?? 0}/${c.total_contacts ?? 0} sent`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Urgent Inventory */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Urgent Inventory</h3>
                <Link to="/used-tractor" className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                  View →
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Truck size={24} className="text-[var(--text-muted)] opacity-40" />
                <p className="text-xs text-[var(--text-muted)] text-center">Open Used Tractor page<br />to view urgency scores</p>
              </div>
            </Card>
          </div>
        </FadeUp>
      </div>
    </div>
  );
};
