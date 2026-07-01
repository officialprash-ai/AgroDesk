/**
 * MorphPanel — morphing AI input dock for AgroDesk
 * Adapted from the provided ai-input.tsx:
 *   • Removed <style jsx> → CSS lives in index.css (.color-orb)
 *   • Uses AgroDesk CSS tokens + Tailwind
 *   • Uses motion/react for spring animations
 *   • Exposes onSubmit(text) callback
 */
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

// ── ColorOrb ────────────────────────────────────────────────────────────────

interface OrbProps {
  dimension?: string;
  className?: string;
  /** Inline CSS var values, e.g. "oklch(22% 0.18 145)" for green */
  tones?: { base?: string; accent1?: string; accent2?: string; accent3?: string };
  spinDuration?: number;
}

export const ColorOrb: React.FC<OrbProps> = ({
  dimension = '24px',
  className,
  tones,
  spinDuration = 16,
}) => {
  const t = {
    base:    tones?.base    ?? 'oklch(22% 0.18 145)',
    accent1: tones?.accent1 ?? 'oklch(75% 0.22 145)',
    accent2: tones?.accent2 ?? 'oklch(60% 0.18 165)',
    accent3: tones?.accent3 ?? 'oklch(50% 0.15 120)',
  };
  const dim = parseInt(dimension, 10);
  const blur   = Math.max(dim * 0.015, 2);
  const cont   = Math.max(dim * 0.008, 1.5);
  const dot    = Math.max(dim * 0.008, 0.1);
  const shadow = Math.max(dim * 0.008, 1);
  return (
    <div
      className={cn('color-orb', className)}
      style={{
        width: dimension, height: dimension,
        '--orb-base':         t.base,
        '--orb-accent1':      t.accent1,
        '--orb-accent2':      t.accent2,
        '--orb-accent3':      t.accent3,
        '--orb-spin-duration':`${spinDuration}s`,
        '--orb-blur':         `${blur}px`,
        '--orb-contrast':     cont,
        '--orb-dot':          `${dot}px`,
        '--orb-shadow':       `${shadow}px`,
      } as React.CSSProperties}
    />
  );
};

// ── Context ──────────────────────────────────────────────────────────────────

interface Ctx {
  open: boolean;
  triggerOpen: () => void;
  triggerClose: () => void;
}
const Ctx = React.createContext({} as Ctx);
export const useCtx = () => React.useContext(Ctx);

// ── MorphPanel ───────────────────────────────────────────────────────────────

const W = 340;
const H = 192;
const SPRING = { type: 'spring' as const, stiffness: 520, damping: 44, mass: 0.7 };

interface Props {
  /** Called when the user submits a prompt */
  onSubmit?: (text: string) => void;
  /** Placeholder text in the expanded textarea */
  placeholder?: string;
  /** Label on the trigger button */
  label?: string;
}

export const MorphPanel: React.FC<Props> = ({
  onSubmit,
  placeholder = 'Ask AI to draft a response…',
  label = 'AI Draft',
}) => {
  const wrapRef   = React.useRef<HTMLDivElement>(null);
  const taRef     = React.useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = React.useState(false);

  const triggerOpen  = React.useCallback(() => { setOpen(true);  setTimeout(() => taRef.current?.focus()); }, []);
  const triggerClose = React.useCallback(() => { setOpen(false); taRef.current?.blur(); }, []);

  // close on outside click
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) triggerClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, triggerClose]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = taRef.current?.value.trim();
    if (!text) return;
    onSubmit?.(text);
    if (taRef.current) taRef.current.value = '';
    triggerClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') triggerClose();
    if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleSubmit(); }
  };

  const ctx = React.useMemo(() => ({ open, triggerOpen, triggerClose }), [open, triggerOpen, triggerClose]);

  return (
    <Ctx.Provider value={ctx}>
      {/* container keeps layout stable */}
      <div className="relative flex items-end justify-start" style={{ width: open ? W : 'auto', height: 36 }}>
        <motion.div
          ref={wrapRef}
          className={cn(
            'absolute bottom-0 left-0 flex flex-col overflow-hidden',
            'border border-[var(--border)] bg-[var(--bg-mid)]',
          )}
          initial={false}
          animate={{
            width:        open ? W : 'auto',
            height:       open ? H : 36,
            borderRadius: open ? 14 : 20,
          }}
          transition={{ ...SPRING, delay: open ? 0 : 0.06 }}
          style={{ zIndex: 50 }}
        >
          {/* Dock bar — always visible at bottom */}
          <motion.footer
            className="flex h-9 flex-shrink-0 items-center gap-2 px-3 mt-auto select-none"
            animate={{ justifyContent: open ? 'flex-start' : 'center' }}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.span key="blank" className="w-5 h-5 flex-shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} />
              ) : (
                <motion.span key="orb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <ColorOrb dimension="20px" />
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={open ? triggerClose : triggerOpen}
              className="flex-1 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap truncate"
            >
              {open ? 'Close' : label}
            </button>
          </motion.footer>

          {/* Expanded form */}
          <AnimatePresence>
            {open && (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="absolute inset-0 flex flex-col p-2"
                style={{ pointerEvents: open ? 'all' : 'none' }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-1 py-1 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ColorOrb dimension="18px" />
                    <span className="text-[11px] font-semibold text-[var(--text-primary)] select-none">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-60">
                    <kbd className="text-[9px] h-4 px-1 rounded border border-[var(--border)] text-[var(--text-muted)] font-sans">⌘</kbd>
                    <kbd className="text-[9px] h-4 px-1 rounded border border-[var(--border)] text-[var(--text-muted)] font-sans">↵</kbd>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={taRef}
                  placeholder={placeholder}
                  name="message"
                  rows={4}
                  className={cn(
                    'flex-1 w-full resize-none rounded-xl p-3',
                    'text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                    'bg-[rgba(255,255,255,0.03)] border border-[var(--border)]',
                    'focus:outline-none focus:border-[var(--border-brand)] focus:bg-[rgba(74,222,128,0.03)]',
                    'transition-all duration-200',
                  )}
                  onKeyDown={handleKey}
                  spellCheck={false}
                />
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Ctx.Provider>
  );
};

export default MorphPanel;
