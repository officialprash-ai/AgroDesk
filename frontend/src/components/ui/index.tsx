import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { X, Loader2 } from 'lucide-react';

// BUTTON
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }) => {
  const base = 'inline-flex items-center gap-2 font-body font-medium rounded-xl transition-all duration-200 cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-400 text-surface-900 border-brand-400 hover:bg-brand-300 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] active:scale-[0.98]',
    secondary: 'bg-glass border-[var(--border)] text-text-primary hover:border-brand-400/30 hover:bg-[rgba(255,255,255,0.07)]',
    ghost: 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
    outline: 'bg-transparent border-[var(--border-bright)] text-brand-400 hover:bg-[rgba(74,222,128,0.08)]',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

// CARD
interface CardProps extends React.HTMLAttributes<HTMLDivElement> { children: React.ReactNode; className?: string; hover?: boolean; accent?: string; }
export const Card: React.FC<CardProps> = ({ children, className, hover, accent, style, ...props }) => (
  <div className={cn('glass rounded-2xl p-5 relative overflow-hidden transition-all duration-200', hover && 'glass-hover cursor-pointer', accent && `border-l-[3px]`, className)} style={{ ...(accent ? { borderLeftColor: accent } : {}), ...style }} {...props}>
    {children}
  </div>
);

// BADGE / STATUS
interface BadgeProps { children: React.ReactNode; variant?: 'active' | 'pending' | 'overdue' | 'info' | 'purple'; className?: string; }
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className }) => (
  <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', `status-${variant}`, className)}>
    {children}
  </span>
);

// INPUT
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: React.ReactNode; }
export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</div>}
      <input className={cn('ag-input', icon && 'pl-9', className)} {...props} />
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

// SELECT
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[]; }
export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>}
    <select className={cn('ag-input appearance-none', className)} {...props}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#061a0c' }}>{o.label}</option>)}
    </select>
  </div>
);

// MODAL
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cn('glass rounded-2xl w-full relative z-10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] outline-none', sizes[size])} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="font-display font-semibold text-lg text-[var(--text-primary)]">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// METRIC CARD
interface MetricCardProps { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: string; trend?: { value: number; label: string }; }
export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, accent = '#4ade80', trend }) => (
  <Card className={`border-l-[3px]`} style={{ borderLeftColor: accent } as React.CSSProperties}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
        <p className="font-display font-bold text-2xl text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-brand-400' : 'text-red-400')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-xl" style={{ background: `${accent}15` }}>
        <div style={{ color: accent }}>{icon}</div>
      </div>
    </div>
  </Card>
);

// EMPTY STATE
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; message: string; action?: React.ReactNode }> = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-2xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] mb-4 text-[var(--text-muted)]">{icon}</div>
    <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">{title}</h3>
    <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-4">{message}</p>
    {action}
  </div>
);

// PROGRESS BAR
export const ProgressBar: React.FC<{ value: number; max: number; color?: string; label?: string }> = ({ value, max, color = '#4ade80', label }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

// AVATAR
export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#34d399'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center font-display font-bold flex-shrink-0" style={{ width: size, height: size, background: `${color}20`, color, fontSize: size * 0.36, border: `1.5px solid ${color}30` }}>
      {initials}
    </div>
  );
};

// TAB BAR
interface TabBarProps { tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[]; active: string; onChange: (id: string) => void; }
export const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)}
        className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          active === tab.id ? 'bg-brand-400 text-surface-900 font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]')}>
        {tab.icon}{tab.label}
        {tab.count !== undefined && <span className={cn('text-xs px-1.5 py-0.5 rounded-full', active === tab.id ? 'bg-[rgba(2,12,7,0.3)]' : 'bg-[rgba(255,255,255,0.08)]')}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

// SEARCH INPUT
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="ag-input pl-8 text-sm py-2" />
  </div>
);
