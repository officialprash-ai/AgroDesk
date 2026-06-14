import React from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Header } from '../../components/layout/Header';
import { MetricCard, Card, Badge, Avatar, ProgressBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatCurrency, formatRelative } from '../../lib/utils';
import {
  Users, Megaphone, IndianRupee, Phone, Truck,
  ArrowRight, TrendingUp, Sparkles, CheckCircle, Activity
} from 'lucide-react';

const salesData = [
  { month: 'Aug', sales: 22, enquiries: 145 }, { month: 'Sep', sales: 28, enquiries: 178 },
  { month: 'Oct', sales: 31, enquiries: 210 }, { month: 'Nov', sales: 27, enquiries: 192 },
  { month: 'Dec', sales: 34, enquiries: 234 }, { month: 'Jan', sales: 38, enquiries: 267 },
];
const channelData = [
  { name: 'WhatsApp', value: 45, color: '#4ade80' }, { name: 'Voice', value: 28, color: '#60a5fa' },
  { name: 'SMS', value: 18, color: '#fbbf24' }, { name: 'Walk-in', value: 9, color: '#a78bfa' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-[var(--border)] text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

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

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" subtitle={[`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${dealer?.name ?? 'Dealer'}`, [dealer?.city, dealer?.district].filter(Boolean).join(', ')].filter(Boolean).join(' · ')} />
      <div className="p-6 space-y-6 page-enter">

        {/* Agro season banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-brand)] bg-[rgba(34,197,94,0.04)] px-6 py-4">
          {/* Wheat stalks — left */}
          <div className="absolute left-4 top-0 bottom-0 flex items-end gap-2 opacity-[0.18] pointer-events-none select-none" aria-hidden="true">
            {[0,1,2].map(i => (
              <svg key={i} className="h-14 w-5 text-brand-400" style={{ transform: `rotate(${[-4,0,5][i]}deg)` }} viewBox="0 0 20 56" fill="none">
                <line x1="10" y1="56" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="15" cy="10" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 10)"/>
                <ellipse cx="5" cy="18" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 18)"/>
                <ellipse cx="15" cy="26" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 26)"/>
                <ellipse cx="5" cy="34" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 34)"/>
                <ellipse cx="10" cy="4" rx="3" ry="1.8" fill="currentColor"/>
              </svg>
            ))}
          </div>

          {/* Center text */}
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-0.5">Kharif Season 2024 · Maharashtra</p>
            <p className="text-sm font-display font-medium text-[var(--text-secondary)]">Your dealership intelligence is live and tracking <span className="text-brand-400 font-semibold">{[dealer?.city, dealer?.district].filter(Boolean).join(', ') || 'your region'}</span></p>
          </div>

          {/* Tractor — right */}
          <div className="absolute right-5 top-0 bottom-0 flex items-center opacity-[0.14] pointer-events-none select-none" aria-hidden="true">
            <svg className="h-14 w-auto text-brand-400 tractor-float" viewBox="0 0 110 70" fill="none">
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Total Leads" value={mLoading ? '...' : (m?.total_leads ?? 0).toLocaleString()} sub={`+${m?.new_leads_today ?? 0} today`}
            icon={<Users size={18} />} accent="#4ade80" trend={{ value: 12, label: 'vs last month' }} />
          <MetricCard label="Active Campaigns" value={mLoading ? '...' : (m?.active_campaigns ?? 0)} sub="Across all channels"
            icon={<Megaphone size={18} />} accent="#60a5fa" />
          <MetricCard label="Recovery Due" value={mLoading ? '...' : formatCurrency(m?.recovery_amount ?? 0)} sub={`${m?.pending_recovery ?? 0} cases`}
            icon={<IndianRupee size={18} />} accent="#fbbf24" trend={{ value: -8, label: 'resolved' }} />
          <MetricCard label="Used Tractors" value={mLoading ? '...' : (m?.used_tractors ?? 0)} sub="In inventory"
            icon={<Truck size={18} />} accent="#a78bfa" />
          <MetricCard label="Monthly Sales" value={mLoading ? '...' : (m?.monthly_sales ?? 0)} sub={`${m?.conversion_rate ?? 0}% conversion`}
            icon={<TrendingUp size={18} />} accent="#34d399" trend={{ value: 18, label: 'vs last month' }} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Sales & Enquiries</h3>
                <p className="text-xs text-[var(--text-muted)]">Last 6 months</p>
              </div>
              <Badge variant="active">Live</Badge>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="enquiryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="enquiries" name="Enquiries" stroke="#60a5fa" strokeWidth={2} fill="url(#enquiryGrad)" />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#4ade80" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-1">Lead Sources</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">By channel this month</p>
            <div className="flex justify-center mb-4">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {channelData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {channelData.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-xs text-[var(--text-secondary)]">{c.name}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{c.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent Activity — live from DB */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Agent Activity</h3>
              <div className="flex items-center gap-1.5">
                <span className="voice-bar h-3" /><span className="voice-bar h-4" /><span className="voice-bar h-2" />
                <span className="voice-bar h-4" /><span className="voice-bar h-3" />
                <span className="text-xs text-brand-400 ml-2">{activity.length} recent jobs</span>
              </div>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No agent activity yet</p>
            ) : (
              <div className="space-y-0">
                {activity.map((job: any) => {
                  const Icon = agentTypeIcon[job.agent_type] ?? Activity;
                  return (
                    <div key={job.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                        <Icon size={12} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate capitalize">{job.agent_type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{agentTypeLabel[job.agent_type] ?? job.agent_type}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant={job.status === 'completed' ? 'active' : job.status === 'running' ? 'pending' : 'info'} className="text-[10px]">{job.status}</Badge>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatRelative(job.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Hot Leads — live */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Hot Leads</h3>
              <Link to="/crm/contacts" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {hotLeads.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No hot leads yet</p>
            ) : (
              <div className="space-y-3">
                {hotLeads.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <Avatar name={c.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{c.village ?? ''}{c.district ? `, ${c.district}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: c.score >= 90 ? '#ef4444' : c.score >= 70 ? '#fbbf24' : '#4ade80' }}>
                        {c.score}
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)]">score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recovery Summary — live */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Recovery Status</h3>
              <Link to="/money-recovery" className="text-xs text-brand-400">View &rarr;</Link>
            </div>
            {topCases.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2 text-center">No active recovery cases</p>
            ) : (
              <div className="space-y-3">
                {topCases.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.escalation_stage === 'legal' ? 'bg-red-500' : r.escalation_stage === 'stern' ? 'bg-orange-500' : r.escalation_stage === 'firm' ? 'bg-yellow-500' : 'bg-brand-400'}`} />
                      <span className="text-xs text-[var(--text-primary)] truncate">{r.customer_name}</span>
                    </div>
                    <span className="text-xs font-semibold text-amber-400 flex-shrink-0 ml-2">{formatCurrency(r.amount_due)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <ProgressBar value={0} max={Math.max(m?.pending_recovery ?? 1, 1)} label="Resolved this month" color="#4ade80" />
            </div>
          </Card>

          {/* Campaigns — live */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Active Campaigns</h3>
              <Link to="/sales-engine" className="text-xs text-brand-400">View &rarr;</Link>
            </div>
            {runningCampaigns.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2 text-center">No active campaigns</p>
            ) : (
              <div className="space-y-3">
                {runningCampaigns.slice(0, 3).map((c: any) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">{c.name}</span>
                      <Badge variant="active" className="ml-2 text-[10px]">Live</Badge>
                    </div>
                    <ProgressBar value={c.sent ?? 0} max={Math.max(c.total_contacts ?? 1, 1)} color="#60a5fa" label={`${c.sent ?? 0}/${c.total_contacts ?? 0} sent`} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Urgent Inventory — static placeholder until tractors loaded */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Urgent Inventory</h3>
              <Link to="/used-tractor" className="text-xs text-brand-400">View &rarr;</Link>
            </div>
            <p className="text-xs text-[var(--text-muted)] py-2 text-center">Open Used Tractor page to view urgency scores</p>
          </Card>
        </div>

      </div>
    </div>
  );
};
