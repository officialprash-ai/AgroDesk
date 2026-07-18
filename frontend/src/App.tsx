import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/onboarding/Onboarding';
import { useAppStore } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { AIScriptModal } from './components/shared/AIScriptModal';
import { Header } from './components/layout/Header';
import { Card, MetricCard } from './components/ui';
import { TrendingUp, Users, Megaphone, IndianRupee } from 'lucide-react';
import { useChartTheme } from './lib/useChartTheme';
import { api } from './lib/api';
import { useApi } from './lib/useApi';
import { formatCurrency } from './lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

// ─── Lazy-loaded pages ────────────────────────────────────────
const Dashboard     = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const Contacts      = lazy(() => import('./pages/crm/Contacts').then(m => ({ default: m.Contacts })));
const Pipeline      = lazy(() => import('./pages/crm/Pipeline').then(m => ({ default: m.Pipeline })));
const SalesEngine   = lazy(() => import('./pages/sales-engine/SalesEngine').then(m => ({ default: m.SalesEngine })));
const UsedTractor   = lazy(() => import('./pages/used-tractor/UsedTractor').then(m => ({ default: m.UsedTractor })));
const MoneyRecovery = lazy(() => import('./pages/money-recovery/MoneyRecovery').then(m => ({ default: m.MoneyRecovery })));
const Support       = lazy(() => import('./pages/support/Support').then(m => ({ default: m.Support })));
const ColdCalling   = lazy(() => import('./pages/cold-calling/ColdCalling').then(m => ({ default: m.ColdCalling })));
const AISalesman    = lazy(() => import('./pages/ai-salesman/AISalesman').then(m => ({ default: m.AISalesman })));
const AIAccountant  = lazy(() => import('./pages/ai-accountant/AIAccountant').then(m => ({ default: m.AIAccountant })));
const Settings      = lazy(() => import('./pages/settings/Settings').then(m => ({ default: m.Settings })));
const Help          = lazy(() => import('./pages/help/Help').then(m => ({ default: m.Help })));

// ─── Page skeleton ────────────────────────────────────────────
const PageSkeleton: React.FC = () => (
  <div className="flex-1 overflow-auto p-6 space-y-4 animate-pulse">
    <div className="skeleton h-8 w-48 rounded-lg" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
    <div className="skeleton h-64 rounded-2xl" />
  </div>
);

// ─── Error boundary ───────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey?: string }) {
    // Recover automatically when the route changes, so a crash on one page
    // doesn't persist onto every other page.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-2xl">⚠️</p>
        <p className="font-display font-semibold text-[var(--text-primary)]">Something went wrong</p>
        <p className="text-sm text-[var(--text-muted)]">{(this.state.error as Error).message}</p>
        <button className="ag-btn ag-btn-primary text-sm" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ─── Analytics (inline — recharts already in bundle) ─────────
const TOOLTIP_STYLE = { background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 };

const Analytics: React.FC = () => {
  const chart = useChartTheme();
  const { dealer } = useAppStore();
  const dealerId = dealer?.id ?? 'd1';
  const { data: chartsData } = useApi(() => api.dashboard.charts(dealerId), [dealerId]);
  const { data: metricsData } = useApi(() => api.dashboard.metrics(dealerId), [dealerId]);
  const data = chartsData?.weekly ?? [];
  const hasWeekly = data.some((d: any) => d.calls || d.whatsapp || d.sms || d.leads);
  const totalOutreach = data.reduce((a: number, d: any) => a + d.calls + d.whatsapp + d.sms, 0);
  const leadsGen = data.reduce((a: number, d: any) => a + d.leads, 0);
  const m = metricsData;
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Analytics" subtitle="Performance across your agents — last 4 weeks" />
      <div className="p-6 space-y-6 page-enter">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Outreach" value={totalOutreach.toLocaleString()} sub="All channels · 4 weeks" icon={<Megaphone size={16} />} accent="#4ade80" />
          <MetricCard label="Leads Generated" value={leadsGen.toLocaleString()} sub="New contacts · 4 weeks" icon={<Users size={16} />} accent="#60a5fa" />
          <MetricCard label="Recovery Due" value={formatCurrency(m?.recovery_amount ?? 0)} sub={`${m?.pending_recovery ?? 0} cases`} icon={<IndianRupee size={16} />} accent="#fbbf24" />
          <MetricCard label="Conversion" value={`${m?.conversion_rate ?? 0}%`} sub="Enquiry to sale" icon={<TrendingUp size={16} />} accent="#a78bfa" />
        </div>
        <Card>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-4">Weekly Outreach Performance</h3>
          {hasWeekly ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="week" tick={chart.tick} axisLine={false} tickLine={false} />
              <YAxis tick={chart.tickSm} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="calls" name="Voice Calls" fill="#60a5fa" radius={[4,4,0,0]} />
              <Bar dataKey="whatsapp" name="WhatsApp" fill="#4ade80" radius={[4,4,0,0]} />
              <Bar dataKey="sms" name="SMS" fill="#fbbf24" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-center text-xs text-[var(--text-muted)]">No outreach activity in the last 4 weeks</div>
          )}
        </Card>
        <Card>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-4">Weekly Lead Generation</h3>
          {hasWeekly ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={chart.tick} axisLine={false} tickLine={false} />
              <YAxis tick={chart.tickSm} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#4ade80" strokeWidth={2} fill="url(#leadGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-center text-xs text-[var(--text-muted)]">No lead data in the last 4 weeks</div>
          )}
        </Card>
      </div>
    </div>
  );
};

const DemoBanner: React.FC = () => (
  <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-400/15 border-b border-amber-400/30 text-amber-300 text-xs font-medium">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    Demo Mode — explore freely. Outbound calls & messages are simulated, and data resets on each login.
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dealer } = useAppStore();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {dealer?.is_demo && <DemoBanner />}
        {children}
      </main>
      <AIScriptModal />
    </div>
  );
};

const RoutedErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
};

function App() {
  const { token, dealer, theme } = useAppStore();

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme ?? 'dark');
  }, [theme]);

  if (!token) return <Login />;
  if (dealer?.onboarding_status === 'draft') return <Onboarding />;

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppLayout>
          <RoutedErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/crm/contacts" element={<Contacts />} />
                <Route path="/crm/pipeline" element={<Pipeline />} />
                <Route path="/sales-engine" element={<SalesEngine />} />
                <Route path="/used-tractor" element={<UsedTractor />} />
                <Route path="/money-recovery" element={<MoneyRecovery />} />
                <Route path="/support" element={<Support />} />
                <Route path="/cold-calling" element={<ColdCalling />} />
                <Route path="/ai-salesman" element={<AISalesman />} />
                <Route path="/ai-accountant" element={<AIAccountant />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </RoutedErrorBoundary>
        </AppLayout>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
