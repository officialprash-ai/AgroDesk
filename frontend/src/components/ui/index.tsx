import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { cn } from '../../lib/utils';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// ─── BUTTON ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}) => {
  const base = 'inline-flex items-center gap-2 font-body font-medium rounded-xl transition-colors duration-150 cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants: Record<string, string> = {
    primary:   'bg-brand-400 text-surface-900 border-brand-400 hover:bg-brand-300',
    secondary: 'bg-[rgba(255,255,255,0.05)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand-400/30 hover:bg-[rgba(255,255,255,0.08)]',
    ghost:     'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]',
    danger:    'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
    outline:   'bg-transparent border-[var(--border-bright)] text-brand-400 hover:bg-[rgba(74,222,128,0.08)]',
  };
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      whileHover={!disabled && !loading && variant === 'primary' ? { boxShadow: '0 0 20px rgba(74,222,128,0.28)' } : {}}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </motion.button>
  );
};

// ─── CARD ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: string;
  animate?: boolean;
}
export const Card: React.FC<CardProps> = ({
  children, className, hover, accent, style, animate = false, ...props
}) => {
  const el = (
    <div
      className={cn(
        'glass rounded-2xl p-5 relative overflow-hidden transition-shadow duration-200',
        hover && 'cursor-pointer hover:shadow-[var(--shadow-md)]',
        className,
      )}
      style={{ ...(accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}), ...style }}
      {...props}
    >
      {children}
    </div>
  );
  if (!hover && !animate) return el;
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: 'var(--shadow-md)' } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'glass rounded-2xl p-5 relative overflow-hidden',
        hover && 'cursor-pointer',
        className,
      )}
      style={{ ...(accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}), ...style }}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
};

// ─── BADGE ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'pending' | 'overdue' | 'info' | 'purple';
  className?: string;
}
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className }) => (
  <span className={cn(
    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    `status-${variant}`, className,
  )}>
    {children}
  </span>
);

// ─── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}
export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 select-none">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">{icon}</div>}
      <input className={cn('ag-input', icon && 'pl-9', className)} {...props} />
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-red-400 mt-1.5"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

// ─── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}
export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 select-none">
        {label}
      </label>
    )}
    <select className={cn('ag-input appearance-none', className)} {...props}>
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: 'var(--bg-deep)' }}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus first focusable input inside modal, not the panel div itself
    setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button');
      first?.focus();
    }, 80);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]); // onClose via ref — no new ref on every render

  const sizes: Record<string, string> = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'glass rounded-2xl w-full relative z-10 flex flex-col max-h-[90vh] outline-none',
              sizes[size],
            )}
            style={{ boxShadow: 'var(--shadow-modal)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="font-display font-semibold text-base text-[var(--text-primary)]">{title}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
              >
                <X size={17} />
              </motion.button>
            </div>
            <div className="p-5 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── METRIC CARD ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: { value: number; label: string };
}
export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, sub, icon, accent = '#4ade80', trend,
}) => (
  <motion.div
    whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    className="glass rounded-2xl p-5 relative overflow-hidden"
    style={{ borderLeft: `3px solid ${accent}` }}
  >
    {/* Subtle accent glow in corner */}
    <div
      className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl pointer-events-none"
      style={{ background: `${accent}0d`, transform: 'translate(30%, -30%)' }}
    />

    <div className="flex items-start justify-between relative">
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 truncate">
          {label}
        </p>
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="font-display font-bold text-[1.6rem] leading-none text-[var(--text-primary)] tabular-nums"
        >
          {value}
        </motion.p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-1.5">{sub}</p>}
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold', trend.value >= 0 ? 'text-brand-400' : 'text-red-400')}>
            {trend.value >= 0
              ? <TrendingUp size={11} />
              : <TrendingDown size={11} />}
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
      <div
        className="p-2.5 rounded-xl flex-shrink-0 ml-3"
        style={{ background: `${accent}18` }}
      >
        <div style={{ color: accent }}>{icon}</div>
      </div>
    </div>
  </motion.div>
);

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="p-4 rounded-2xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] mb-4 text-[var(--text-muted)]">
      {icon}
    </div>
    <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">{title}</h3>
    <p className="text-[var(--text-secondary)] text-sm max-w-xs mb-4 leading-relaxed">{message}</p>
    {action}
  </motion.div>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{
  value: number;
  max: number;
  color?: string;
  label?: string;
}> = ({ value, max, color = '#4ade80', label }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
          <span>{label}</span>
          <span className="tabular-nums font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#34d399'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-bold flex-shrink-0"
      style={{
        width: size, height: size,
        background: `${color}1e`,
        color,
        fontSize: size * 0.36,
        border: `1.5px solid ${color}38`,
      }}
    >
      {initials}
    </div>
  );
};

// ─── TAB BAR ──────────────────────────────────────────────────────────────────
interface TabBarProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  layoutId?: string;
}
export const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange, layoutId = 'tabbar' }) => (
  <div className="flex gap-0.5 p-1 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
    <LayoutGroup id={layoutId}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
            active === tab.id
              ? 'text-surface-900'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]',
          )}
        >
          {active === tab.id && (
            <motion.div
              layoutId={`${layoutId}-pill`}
              className="absolute inset-0 bg-brand-400 rounded-lg"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full tabular-nums',
                active === tab.id ? 'bg-[rgba(2,12,7,0.25)]' : 'bg-[rgba(255,255,255,0.08)]',
              )}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </LayoutGroup>
  </div>
);

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <input
      value={value}      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="ag-input pl-8 text-sm py-2"
    />
  </div>
);

