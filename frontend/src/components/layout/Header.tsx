import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Search, Globe, Mic, X, CheckCircle, AlertCircle, Info,
  Sun, Moon, LayoutDashboard, Users, Megaphone, Truck,
  IndianRupee, Phone, Bot, FileText, Settings, HelpCircle,
  BarChart2, Zap, BookOpen, ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { cn, LANGUAGES } from '../../lib/utils';

// ── Searchable routes ────────────────────────────────────────────────────────
const ROUTES = [
  { path: '/',                icon: LayoutDashboard, label: 'Dashboard',       section: 'Page' },
  { path: '/analytics',       icon: BarChart2,       label: 'Analytics',       section: 'Page' },
  { path: '/crm/contacts',    icon: Users,           label: 'Contacts',        section: 'Page' },
  { path: '/crm/pipeline',    icon: Zap,             label: 'Pipeline',        section: 'Page' },
  { path: '/sales-engine',    icon: Megaphone,       label: 'Sales Engine',    section: 'Page' },
  { path: '/used-tractor',    icon: Truck,           label: 'Used Tractor',    section: 'Page' },
  { path: '/money-recovery',  icon: IndianRupee,     label: 'Money Recovery',  section: 'Page' },
  { path: '/cold-calling',    icon: Phone,           label: 'Cold Calling',    section: 'Page' },
  { path: '/ai-salesman',     icon: Bot,             label: 'AI Salesman',     section: 'Page' },
  { path: '/ai-accountant',   icon: FileText,        label: 'AI Accountant',   section: 'Page' },
  { path: '/settings',        icon: Settings,        label: 'Settings',        section: 'Page' },
  { path: '/help',            icon: HelpCircle,      label: 'Help & Support',  section: 'Page' },
];

interface Result {
  type: 'route' | 'contact' | 'kb';
  label: string;
  sub?: string;
  path?: string;
  icon: React.ReactNode;
  action?: () => void;
}

export const Header: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const {
    notifications, removeNotification, toasts, dismissToast,
    dealer, setLanguage, theme, setTheme,
    contacts, knowledgeBase,
  } = useAppStore();

  // ── theme ──────────────────────────────────────────────────────────────────
  const THEMES = [
    { key: 'dark'  as const, icon: <Moon size={13} />,  label: 'Dark' },
    { key: 'light' as const, icon: <Sun size={13} />,   label: 'Light' },
  ];
  const nextTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  const currentTheme = THEMES.find(t => t.key === (theme ?? 'dark')) ?? THEMES[0];

  // ── notifications ──────────────────────────────────────────────────────────
  const [showNotifs, setShowNotifs] = useState(false);

  // ── language ───────────────────────────────────────────────────────────────
  const [showLangMenu, setShowLangMenu] = useState(false);
  const lang = dealer?.language ?? 'mr';
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const initials = dealer?.name
    ? dealer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  // ── search ─────────────────────────────────────────────────────────────────
  const [query, setQuery]       = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx]   = useState(0);
  const searchRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus()); }, []);
  const closeSearch = useCallback(() => { setSearchOpen(false); setQuery(''); setActiveIdx(0); inputRef.current?.blur(); }, []);

  // keyboard shortcut: / or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && e.metaKey)) && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openSearch, closeSearch]);

  // close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) closeSearch();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [closeSearch]);

  // build results
  const results = React.useMemo((): Result[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const routeResults: Result[] = ROUTES
      .filter(r => r.label.toLowerCase().includes(q))
      .map(r => ({
        type: 'route' as const,
        label: r.label,
        sub: r.section,
        path: r.path,
        icon: <r.icon size={14} />,
        action: () => { navigate(r.path); closeSearch(); },
      }));

    const contactResults: Result[] = (contacts ?? [])
      .filter(c => (c.name?.toLowerCase().includes(q) || c.phone?.includes(q)))
      .slice(0, 4)
      .map(c => ({
        type: 'contact' as const,
        label: c.name ?? 'Unknown',
        sub: c.phone ?? c.village ?? '',
        icon: <Users size={14} />,
        action: () => { navigate('/crm/contacts'); closeSearch(); },
      }));

    const kbResults: Result[] = [];
    for (const [cat, entries] of Object.entries(knowledgeBase ?? {})) {
      for (const e of entries) {
        if (e.text.toLowerCase().includes(q)) {
          kbResults.push({
            type: 'kb' as const,
            label: e.text.slice(0, 60) + (e.text.length > 60 ? '…' : ''),
            sub: cat,
            icon: <BookOpen size={14} />,
            action: () => { navigate('/ai-salesman'); closeSearch(); },
          });
          if (kbResults.length >= 3) break;
        }
      }
      if (kbResults.length >= 3) break;
    }

    return [...routeResults.slice(0, 4), ...contactResults, ...kbResults];
  }, [query, contacts, knowledgeBase, navigate, closeSearch]);

  // keyboard nav inside results
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); results[activeIdx]?.action?.(); }
    if (e.key === 'Escape')    closeSearch();
  };

  useEffect(() => { setActiveIdx(0); }, [results.length]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div>
          <h1 className="font-display font-semibold text-xl text-[var(--text-primary)] leading-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">

          {/* ── Search bar ──────────────────────────────────────────────────── */}
          <div ref={searchRef} className="relative hidden md:block">
            {/* Input */}
            <div
              className={cn(
                'flex items-center gap-2 h-9 rounded-xl border transition-all duration-200',
                searchOpen
                  ? 'w-72 border-[var(--border-brand)] bg-[var(--bg-mid)] shadow-[0_0_0_3px_rgba(74,222,128,0.08)]'
                  : 'w-56 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-bright)] cursor-text',
              )}
              onClick={openSearch}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openSearch(); }}
            >
              <Search
                size={13}
                className={cn(
                  'ml-3 flex-shrink-0 transition-colors duration-200',
                  searchOpen ? 'text-brand-400' : 'text-[var(--text-muted)]',
                )}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleSearchKey}
                placeholder={searchOpen ? 'Search pages, contacts, KB…' : 'Search  /'}
                className={cn(
                  'flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                  'outline-none border-none py-0',
                )}
              />
              {query && (
                <button
                  onClick={e => { e.stopPropagation(); setQuery(''); inputRef.current?.focus(); }}
                  className="mr-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={12} />
                </button>
              )}
              {!query && !searchOpen && (
                <kbd className="mr-2 text-[9px] h-4 px-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-sans flex-shrink-0">/</kbd>
              )}
            </div>

            {/* Results dropdown */}
            <AnimatePresence>
            {searchOpen && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-mid)] shadow-[var(--shadow-xl)] overflow-hidden z-50 py-1.5"
              >
                {/* Group by type */}
                {(['route', 'contact', 'kb'] as const).map(type => {
                  const group = results.filter(r => r.type === type);
                  if (!group.length) return null;
                  const groupLabel = type === 'route' ? 'Pages' : type === 'contact' ? 'Contacts' : 'Knowledge Base';
                  return (
                    <div key={type}>
                      <p className="text-[9px] font-bold tracking-widest uppercase text-[var(--text-muted)] px-3 pt-2 pb-1">{groupLabel}</p>
                      {group.map((r, i) => {
                        const globalIdx = results.indexOf(r);
                        return (
                          <button
                            key={i}
                            onClick={r.action}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 text-left transition-all',
                              activeIdx === globalIdx
                                ? 'bg-[rgba(74,222,128,0.08)] text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)]',
                            )}
                          >
                            <span className={cn(
                              'flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                              activeIdx === globalIdx ? 'text-brand-400 bg-[rgba(74,222,128,0.12)]' : 'text-[var(--text-muted)] bg-[rgba(255,255,255,0.04)]',
                            )}>
                              {r.icon}
                            </span>
                            <span className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{r.label}</p>
                              {r.sub && <p className="text-[10px] text-[var(--text-muted)] truncate">{r.sub}</p>}
                            </span>
                            {activeIdx === globalIdx && <ArrowRight size={11} className="text-brand-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Hint */}
                <div className="flex items-center gap-3 px-3 pt-2 pb-1.5 mt-1 border-t border-[var(--border)]">
                  {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1">
                      <kbd className="text-[9px] h-4 px-1 rounded border border-[var(--border)] text-[var(--text-muted)] font-sans">{k}</kbd>
                      <span className="text-[9px] text-[var(--text-muted)]">{v}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* No results state */}
            <AnimatePresence>
            {searchOpen && query.trim() && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-mid)] shadow-[var(--shadow-xl)] z-50 px-4 py-6 text-center"
              >
                <Search size={20} className="mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
                <p className="text-xs text-[var(--text-muted)]">No results for "<span className="text-[var(--text-primary)]">{query}</span>"</p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Language switcher ─────────────────────────────────────────── */}
          <div className="relative">
            <button aria-label="Change language" aria-haspopup="true" aria-expanded={showLangMenu}
              onClick={() => setShowLangMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-bright)] transition-all">
              <Globe size={13} />
              <span className="hidden sm:block">{LANGUAGES.find(l => l.code === lang)?.label}</span>
            </button>
            <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute right-0 top-full mt-2 w-44 glass rounded-xl border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden z-50 py-1 max-h-72 overflow-y-auto"
              >
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLanguage(l.code); setShowLangMenu(false); }}
                    className={cn('w-full text-left px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-between',
                      l.code === lang ? 'text-brand-400' : 'text-[var(--text-secondary)]')}>
                    <span>{l.label}</span><span className="text-[10px] text-[var(--text-muted)]">{l.english}</span>
                  </button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Voice (coming soon) ───────────────────────────────────────── */}
          <button aria-label="Voice input (coming soon)" disabled title="Voice input — coming soon"
            className="relative p-2 rounded-xl glass border border-[var(--border)] opacity-50 cursor-not-allowed transition-all">
            <Mic size={15} className="text-[var(--text-secondary)]" />
          </button>

          {/* ── Theme toggle ──────────────────────────────────────────────── */}
          <button
            aria-label={`Switch theme (current: ${currentTheme.label})`}
            title={`Theme: ${currentTheme.label} — click to switch`}
            onClick={nextTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-all"
          >
            {currentTheme.icon}
            <span className="hidden sm:block">{currentTheme.label}</span>
          </button>

          {/* ── Notifications ─────────────────────────────────────────────── */}
          <div className="relative">
            <button aria-label="Notifications" onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl glass border border-[var(--border)] hover:border-[var(--border-bright)] transition-all">
              <Bell size={15} className="text-[var(--text-secondary)]" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-400 text-surface-900 text-[9px] font-bold flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
                  <button onClick={() => setShowNotifs(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No new notifications</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.03)] border-b border-[var(--border)] last:border-0">
                        {n.type === 'success' ? <CheckCircle size={14} className="text-brand-400 mt-0.5 flex-shrink-0" /> :
                         n.type === 'error' ? <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" /> :
                         <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.message}</p>
                        </div>
                        <button onClick={() => removeNotification(n.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Avatar ───────────────────────────────────────────────────── */}
          <div className="w-8 h-8 rounded-full bg-brand-400/20 border border-brand-400/30 flex items-center justify-center cursor-pointer">
            <span className="text-xs font-bold text-brand-400">{initials}</span>
          </div>
        </div>
      </header>

      {/* Toast notifications */}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.slice(-3).map(n => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl shadow-[var(--shadow-lg)] glass pointer-events-auto border',
                n.type === 'success' ? 'border-brand-400/30' : n.type === 'error' ? 'border-red-400/30' : 'border-blue-400/30',
              )}
            >
              {n.type === 'success' ? <CheckCircle size={14} className="text-brand-400 flex-shrink-0" /> :
               n.type === 'error' ? <AlertCircle size={14} className="text-red-400 flex-shrink-0" /> :
               <Info size={14} className="text-blue-400 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{n.message}</p>
              </div>
              <button aria-label="Dismiss" onClick={() => dismissToast(n.id)} className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0 transition-colors">
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};
