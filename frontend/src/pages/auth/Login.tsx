import React, { useState } from 'react';
import { authApi } from '../../lib/api';
import { useAppStore } from '../../store';

export const Login: React.FC = () => {
  const { setAuth } = useAppStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regDistrict, setRegDistrict] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      setAuth(res.token, res.dealer);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register({
        name: regName, phone: regPhone, password: regPassword,
        city: regCity, district: regDistrict,
      });
      setAuth(res.token, res.dealer);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-900)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-400 flex items-center justify-center text-2xl font-display font-black text-surface-900">
              A
            </div>
            <div>
              <h1 className="text-2xl font-display font-black text-[var(--text-primary)]">AgroDesk</h1>
              <p className="text-xs text-brand-400 font-medium">AI-Powered Tractor Dealership</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Maharashtra's smartest dealer platform</p>
        </div>

        {/* Card */}
        <div className="ag-card p-8 space-y-6">
          {/* Tab Switch */}
          <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.04)]">
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-brand-400 text-surface-900' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]' }`}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Phone Number</label>
                <input className="ag-input w-full" type="tel" placeholder="+91 98765 43210"
                  value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                <input className="ag-input w-full" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-400 text-surface-900 font-semibold text-sm hover:bg-brand-300 transition-colors disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-center text-xs text-[var(--text-muted)]">
                Demo: phone <span className="text-brand-400 font-mono">any</span> · password <span className="text-brand-400 font-mono">any</span> (seed dealer has no password)
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Dealership Name</label>
                <input className="ag-input w-full" placeholder="Rajesh Tractor Agency"
                  value={regName} onChange={e => setRegName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Phone</label>
                  <input className="ag-input w-full" type="tel" placeholder="+91 98765 43210"
                    value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                  <input className="ag-input w-full" type="password" placeholder="min 6 chars"
                    value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">City</label>
                  <input className="ag-input w-full" placeholder="Nashik"
                    value={regCity} onChange={e => setRegCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">District</label>
                  <input className="ag-input w-full" placeholder="Nashik"
                    value={regDistrict} onChange={e => setRegDistrict(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-400 text-surface-900 font-semibold text-sm hover:bg-brand-300 transition-colors disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
