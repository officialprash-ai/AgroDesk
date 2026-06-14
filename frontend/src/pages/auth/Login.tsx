import React, { useState, useEffect, useRef } from 'react';
import { Tractor, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../lib/api';
import { useAppStore } from '../../store';

// ─── Pupil (bare dark circle, tracks mouse) ────────────────────────
interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}
const Pupil: React.FC<PupilProps> = ({
  size = 12, maxDistance = 5, pupilColor = '#1a1a1a',
  forceLookX, forceLookY,
}) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (forceLookX !== undefined && forceLookY !== undefined) return;
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.min(Math.hypot(dx, dy), maxDistance);
      const angle = Math.atan2(dy, dx);
      setPos({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [maxDistance, forceLookX, forceLookY]);

  const x = forceLookX !== undefined ? forceLookX : pos.x;
  const y = forceLookY !== undefined ? forceLookY : pos.y;

  return (
    <div ref={ref} className="rounded-full"
      style={{ width: size, height: size, backgroundColor: pupilColor,
        transform: `translate(${x}px,${y}px)`, transition: 'transform 0.1s ease-out' }} />
  );
};

// ─── EyeBall (white circle with pupil inside, can blink) ───────────
interface EyeBallProps {
  size?: number; pupilSize?: number; maxDistance?: number;
  eyeColor?: string; pupilColor?: string; isBlinking?: boolean;
  forceLookX?: number; forceLookY?: number;
}
const EyeBall: React.FC<EyeBallProps> = ({
  size = 48, pupilSize = 16, maxDistance = 10,
  eyeColor = 'white', pupilColor = '#1a1a1a', isBlinking = false,
  forceLookX, forceLookY,
}) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (forceLookX !== undefined && forceLookY !== undefined) return;
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.min(Math.hypot(dx, dy), maxDistance);
      const angle = Math.atan2(dy, dx);
      setPos({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [maxDistance, forceLookX, forceLookY]);

  const x = forceLookX !== undefined ? forceLookX : pos.x;
  const y = forceLookY !== undefined ? forceLookY : pos.y;

  return (
    <div ref={ref} className="rounded-full flex items-center justify-center"
      style={{ width: size, height: isBlinking ? 2 : size,
        backgroundColor: eyeColor, overflow: 'hidden', transition: 'height 0.15s ease' }}>
      {!isBlinking && (
        <div className="rounded-full"
          style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor,
            transform: `translate(${x}px,${y}px)`, transition: 'transform 0.1s ease-out' }} />
      )}
    </div>
  );
};

// ─── Main Login Component ──────────────────────────────────────────
export const Login: React.FC = () => {
  const { setAuth } = useAppStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign in fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regDistrict, setRegDistrict] = useState('');

  // Character animation state
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef  = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  // Mouse tracking
  useEffect(() => {
    const h = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // Random blink – purple
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => { setIsPurpleBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Random blink – black
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => { setIsBlackBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3500);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Look at each other briefly when typing starts
  useEffect(() => {
    if (!isTyping) { setIsLookingAtEachOther(false); return; }
    setIsLookingAtEachOther(true);
    const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
    return () => clearTimeout(t);
  }, [isTyping]);

  // Purple peeks when password is visible
  useEffect(() => {
    if (!(password.length > 0 && showPassword)) { setIsPurplePeeking(false); return; }
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => { setIsPurplePeeking(false); }, 800);
      }, Math.random() * 3000 + 2000);
    };
    schedule();
    return () => clearTimeout(t);
  }, [password, showPassword, isPurplePeeking]);

  // Calculate body skew and face offset per character
  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const dx = mouseX - cx, dy = mouseY - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };
  const purplePos = calcPos(purpleRef);
  const blackPos  = calcPos(blackRef);
  const yellowPos = calcPos(yellowRef);
  const orangePos = calcPos(orangeRef);

  // Derived flags
  const isPasswordHidden  = password.length > 0 && !showPassword;
  const isPasswordVisible = password.length > 0 && showPassword;

  // ── Handlers ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      setAuth(res.token, res.dealer);
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed');
    }
    setLoading(false);
  };

  const handleDemo = async () => {
    setError(''); setLoading(true);
    try {
      const res = await authApi.login('+919999999999', 'demo1234');
      setAuth(res.token, res.dealer);
    } catch (err: unknown) {
      setError((err as Error).message || 'Demo login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authApi.register({
        name: regName, phone: regPhone, password: regPassword,
        city: regCity, district: regDistrict,
      });
      setAuth(res.token, res.dealer);
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError(''); setLoading(true);
    try {
      const res = await authApi.googleLogin(credentialResponse.credential);
      setAuth(res.token, res.dealer);
    } catch (err: unknown) {
      setError((err as Error).message || 'Google sign-in failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── Left Panel: Characters ─────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 30% 60%, #061a0c 0%, #020c07 70%)' }}>

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center text-xl font-display font-black text-surface-900">
              A
            </div>
            <div>
              <p className="text-lg font-display font-black text-white leading-none">AgroDesk</p>
              <p className="text-[11px] text-brand-400 font-medium">AI-Powered Dealership</p>
            </div>
          </div>
        </div>

        {/* Characters stage */}
        <div className="relative z-10 flex items-end justify-center h-[440px]">
          <div className="relative" style={{ width: 520, height: 380 }}>

            {/* Purple tall pillar – back */}
            <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: 60, width: 170,
                height: isTyping || isPasswordHidden ? 420 : 380,
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transform: isPasswordVisible
                  ? 'skewX(0deg)'
                  : isTyping || isPasswordHidden
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(38px)`
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}>
              <div className="absolute flex gap-7 transition-all duration-700 ease-in-out"
                style={{
                  left: isPasswordVisible ? 18 : isLookingAtEachOther ? 52 : 42 + purplePos.faceX,
                  top:  isPasswordVisible ? 32 : isLookingAtEachOther ? 60 : 38 + purplePos.faceY,
                }}>
                {[0, 1].map(i => (
                  <EyeBall key={i} size={17} pupilSize={6} maxDistance={4}
                    eyeColor="white" pupilColor="#1a1a1a"
                    isBlinking={isPurpleBlinking}
                    forceLookX={isPasswordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                    forceLookY={isPasswordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Dark pillar – middle */}
            <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: 224, width: 115, height: 295,
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform: isPasswordVisible
                  ? 'skewX(0deg)'
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(18px)`
                    : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}>
              <div className="absolute flex gap-5 transition-all duration-700 ease-in-out"
                style={{
                  left: isPasswordVisible ? 10 : isLookingAtEachOther ? 30 : 24 + blackPos.faceX,
                  top:  isPasswordVisible ? 26 : isLookingAtEachOther ? 10 : 30 + blackPos.faceY,
                }}>
                {[0, 1].map(i => (
                  <EyeBall key={i} size={15} pupilSize={5} maxDistance={4}
                    eyeColor="white" pupilColor="#1a1a1a"
                    isBlinking={isBlackBlinking}
                    forceLookX={isPasswordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
                    forceLookY={isPasswordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Orange semi-circle – front left */}
            <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: 0, width: 225, height: 190,
                backgroundColor: '#FF9B6B',
                borderRadius: '115px 115px 0 0',
                zIndex: 3,
                transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}>
              <div className="absolute flex gap-7 transition-all duration-200 ease-out"
                style={{
                  left: isPasswordVisible ? 48 : 78 + (orangePos.faceX || 0),
                  top:  isPasswordVisible ? 82 : 86 + (orangePos.faceY || 0),
                }}>
                <Pupil size={11} maxDistance={4} pupilColor="#1a1a1a"
                  forceLookX={isPasswordVisible ? -5 : undefined}
                  forceLookY={isPasswordVisible ? -4 : undefined} />
                <Pupil size={11} maxDistance={4} pupilColor="#1a1a1a"
                  forceLookX={isPasswordVisible ? -5 : undefined}
                  forceLookY={isPasswordVisible ? -4 : undefined} />
              </div>
            </div>

            {/* Yellow capsule – front right */}
            <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: 292, width: 132, height: 218,
                backgroundColor: '#E8D754',
                borderRadius: '66px 66px 0 0',
                zIndex: 4,
                transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}>
              <div className="absolute flex gap-5 transition-all duration-200 ease-out"
                style={{
                  left: isPasswordVisible ? 18 : 48 + (yellowPos.faceX || 0),
                  top:  isPasswordVisible ? 32 : 38 + (yellowPos.faceY || 0),
                }}>
                <Pupil size={11} maxDistance={4} pupilColor="#1a1a1a"
                  forceLookX={isPasswordVisible ? -5 : undefined}
                  forceLookY={isPasswordVisible ? -4 : undefined} />
                <Pupil size={11} maxDistance={4} pupilColor="#1a1a1a"
                  forceLookX={isPasswordVisible ? -5 : undefined}
                  forceLookY={isPasswordVisible ? -4 : undefined} />
              </div>
              {/* Mouth */}
              <div className="absolute h-[3px] rounded-full bg-[#1a1a1a] transition-all duration-200 ease-out"
                style={{
                  width: 52,
                  left: isPasswordVisible ? 10 : 38 + (yellowPos.faceX || 0),
                  top:  isPasswordVisible ? 84 : 84 + (yellowPos.faceY || 0),
                }} />
            </div>
          </div>
        </div>

        {/* Brand tagline + footer */}
        <div className="relative z-10 p-10">
          <p className="text-sm text-white/40 mb-6 leading-relaxed max-w-xs">
            Maharashtra's smartest tractor dealership platform — powered by AI.
          </p>
          <div className="flex gap-6 text-xs text-white/30">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#" className="hover:text-white/60 transition-colors">{l}</a>
            ))}
          </div>
        </div>

        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-brand-400/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-400/3 blur-3xl" />
        </div>
      </div>

      {/* ── Right Panel: Form ──────────────────────────────────── */}
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] px-4 py-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center text-xl font-display font-black text-surface-900">A</div>
              <div className="text-left">
                <p className="text-xl font-display font-black text-[var(--text-primary)]">AgroDesk</p>
                <p className="text-[11px] text-brand-400">AI-Powered Dealership</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Maharashtra's smartest dealer platform</p>
          </div>

          {/* Card */}
          <div className="ag-card p-8 space-y-6" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(74,222,128,0.1)',
            borderRadius: 16,
          }}>

            {/* Tab switch */}
            <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.04)]">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    tab === t ? 'bg-brand-400 text-surface-900' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Phone Number</label>
                  <input className="ag-input" type="tel" placeholder="+91 98765 43210"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                  <div className="relative">
                    <input className="ag-input pr-10" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] border border-red-400/20 px-3 py-2 rounded-lg" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-400 text-surface-900 font-semibold text-sm hover:bg-brand-300 transition-colors disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">or</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed')}
                    theme="filled_black" shape="rectangular" size="large" width="100%" text="signin_with"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">or</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <button type="button" onClick={handleDemo} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-300 font-semibold text-sm hover:bg-amber-400/20 transition-colors disabled:opacity-50">
                  <Tractor size={16} />{loading ? 'Loading demo…' : 'Try the Live Demo'}
                </button>
                <p className="text-center text-xs text-[var(--text-muted)]">
                  Read-only-safe demo account — data resets each login.
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Dealership Name</label>
                  <input className="ag-input" placeholder="Rajesh Tractor Agency"
                    value={regName} onChange={e => setRegName(e.target.value)}
                    onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Phone</label>
                    <input className="ag-input" type="tel" placeholder="+91 98765 43210"
                      value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                    <input className="ag-input" type="password" placeholder="min 6 chars"
                      value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">City</label>
                    <input className="ag-input" placeholder="Nashik"
                      value={regCity} onChange={e => setRegCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">District</label>
                    <input className="ag-input" placeholder="Nashik"
                      value={regDistrict} onChange={e => setRegDistrict(e.target.value)} />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] border border-red-400/20 px-3 py-2 rounded-lg" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-400 text-surface-900 font-semibold text-sm hover:bg-brand-300 transition-colors disabled:opacity-50">
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">or sign up with</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed')}
                    theme="filled_black" shape="rectangular" size="large" width="100%" text="signup_with"
                  />
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
