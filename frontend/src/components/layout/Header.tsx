import React, { useState } from 'react';
import { Bell, Search, Globe, Mic, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '../../store';
import { cn, LANGUAGES } from '../../lib/utils';

export const Header: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { notifications, removeNotification, dealer } = useAppStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [lang, setLang] = useState(dealer?.language ?? 'mr');
  const initials = dealer?.name
    ? dealer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[rgba(2,12,7,0.85)] backdrop-blur-xl">
        <div>
          <h1 className="font-display font-semibold text-xl text-[var(--text-primary)]">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              placeholder="Search contacts, tractors..."
              className="ag-input pl-8 py-2 text-xs w-56 rounded-xl"
            />
          </div>

          {/* Language switcher */}
          <div className="relative">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-bright)] transition-all">
              <Globe size={13} />
              <span className="hidden sm:block">{LANGUAGES.find(l => l.code === lang)?.label}</span>
            </button>
          </div>

          {/* Voice indicator */}
          <button aria-label="Voice input" className="relative p-2 rounded-xl glass border border-[var(--border)] hover:border-[var(--border-bright)] transition-all group">
            <Mic size={15} className="text-[var(--text-secondary)] group-hover:text-brand-400 transition-colors" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl glass border border-[var(--border)] hover:border-[var(--border-bright)] transition-all">
              <Bell size={15} className="text-[var(--text-secondary)]" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-400 text-surface-900 text-[9px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl border border-[var(--border)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden z-50">
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
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-400/20 border border-brand-400/30 flex items-center justify-center cursor-pointer">
            <span className="text-xs font-bold text-brand-400">{initials}</span>
          </div>
        </div>
      </header>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.slice(-3).map(n => (
          <div key={n.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl glass pointer-events-auto border', 'page-enter',
            n.type === 'success' ? 'border-brand-400/30' : n.type === 'error' ? 'border-red-400/30' : 'border-blue-400/30')}>
            {n.type === 'success' ? <CheckCircle size={14} className="text-brand-400" /> :
             n.type === 'error' ? <AlertCircle size={14} className="text-red-400" /> :
             <Info size={14} className="text-blue-400" />}
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{n.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{n.message}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={12} /></button>
          </div>
        ))}
      </div>
    </>
  );
};
