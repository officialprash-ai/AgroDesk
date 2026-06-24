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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const sizes: Record<string, string> = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
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

    <div className="flex items-start 