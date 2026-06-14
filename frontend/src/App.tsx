import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/auth/Login';
import { useAppStore } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { AIScriptModal } from './components/shared/AIScriptModal';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Contacts } from './pages/crm/Contacts';
import { Pipeline } from './pages/crm/Pipeline';
import { SalesEngine } from './pages/sales-engine/SalesEngine';
import { UsedTractor } from './pages/used-tractor/UsedTractor';
import { MoneyRecovery } from './pages/money-recovery/MoneyRecovery';
import { ColdCalling } from './pages/cold-calling/ColdCalling';
import { AISalesman } from './pages/ai-salesman/AISalesman';
import { AIAccountant } from './pages/ai-accountant/AIAccountant';
import { Settings } from './pages/settings/Settings';
import { Help } from './pages/help/Help';
import { Header } from './components/layout/Header';
import { Card, MetricCard } from './components/ui';
import { TrendingUp, Users, Megaphone, IndianRupee } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

const Analytics: React.FC = () => {
  const data = [
    { week: 'W1', calls: 180, whatsapp: 320, sms: 150, leads: 42 },
    { week: 'W2', calls: 220, whatsapp: 410, sms: 180, leads: 58 },
    { week: 'W3', calls: 195, whatsapp: 380, sms: 160, leads: 51 },
    { week: 'W4', calls: 260, whatsapp: 490, sms: 210, leads: 71 },
  ];
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Analytics" subtitle="Performance across all agents — January 2024" />
      <div className="p-6 space-y-6 page-enter">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Outreach" value="4,820" sub="All channels" icon={<Megaphone size={16} />} accent="#4ade80" trend={{ value: 22, label: 'vs last month' }} />
          <MetricCard label="Leads Generated" value="222" sub="From campaigns" icon={<Users size={16} />} accent="#60a5fa" />
          <MetricCard label="Recovery Rate" value="68%" sub="₹8.4L collected" icon={<IndianRupee size={16} />} accent="#fbbf24" />
          <MetricCard label="Conversion" value="18.4%" sub="Enquiry to sale" icon={<TrendingUp size={16} />} accent="#a78bfa" />
        </div>
        <Card>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-4">Weekly Outreach Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="calls" name="Voice Calls" fill="#60a5fa" radius={[4,4,0,0]} />
              <Bar dataKey="whatsapp" name="WhatsApp" fill="#4ade80" radius={[4,4,0,0]} />
              <Bar dataKey="sms" name="SMS" fill="#fbbf24" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-4">Weekly Lead Generation</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(240,253,244,0.4)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#4ade80" strokeWidth={2} fill="url(#leadGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

const DemoBanner: React.FC = () => (
  <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-400/15 border-b border-amber-400/30 text-amber-300 text-xs font-medium">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    Demo Mode — explore freely. Outbound calls &amp; messages are simulated, and data resets on each login.
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

function App() {
  const { token, theme } = useAppStore();

  // Sync theme attribute to <html> so CSS variables apply globally
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme ?? 'dark');
  }, [theme]);

  if (!token) return <Login />;

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/crm/contacts" element={<Contacts />} />
          <Route path="/crm/pipeline" element={<Pipeline />} />
          <Route path="/sales-engine" element={<SalesEngine />} />
          <Route path="/used-tractor" element={<UsedTractor />} />
          <Route path="/money-recovery" element={<MoneyRecovery />} />
          <Route path="/cold-calling" element={<ColdCalling />} />
          <Route path="/ai-salesman" element={<AISalesman />} />
          <Route path="/ai-accountant" element={<AIAccountant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
