import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import {
  LayoutDashboard, Users, Megaphone, Truck, IndianRupee,
  Phone, Bot, FileText, Settings, ChevronLeft, ChevronRight,
  Tractor, Zap, BarChart2, LogOut, HelpCircle
} from 'lucide-react';

const NAV = [
  { section: 'OVERVIEW' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { section: 'CRM' },
  { to: '/crm/contacts', icon: Users, label: 'Contacts' },
  { to: '/crm/pipeline', icon: Zap, label: 'Pipeline' },
  { section: 'AGENTS' },
  { to: '/sales-engine', icon: Megaphone, label: 'Sales Engine', badge: 'A' },
  { to: '/used-tractor', icon: Truck, label: 'Used Tractor', badge: 'B' },
  { to: '/money-recovery', icon: IndianRupee, label: 'Money Recovery', badge: 'C' },
  { to: '/cold-calling', icon: Phone, label: 'Cold Calling', badge: 'D' },
  { to: '/ai-salesman', icon: Bot, label: 'AI Salesman', badge: 'E' },
  { to: '/ai-accountant', icon: FileText, label: 'AI Accountant', badge: 'F' },
  { section: 'SYSTEM' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/help', icon: HelpCircle, label: 'Help & Support' },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, dealer, clearAuth, dealerLogo } = useAppStore();
  const location = useLocation();

  return (
    <aside className={cn(
      'relative flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0 z-40',
      'border-r border-[var(--border)]',
      'bg-[var(--bg-mid)]',
      sidebarOpen ? 'w-60' : 'w-16'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]', !sidebarOpen && 'justify-center')}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center shadow-[0_0_16px_rgba(74,222,128,0.4)]">
            <Tractor size={16} className="text-surface-900" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse-slow" />
        </div>
        {sidebarOpen && (
          <div>
            <h1 className="font-display font-bold text-base text-[var(--text-primary)] leading-none">AgroDesk</h1>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">Dealer Intelligence</p>
          </div>
        )}
      </div>

      {/* Dealer info */}
      {sidebarOpen && dealer && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] flex items-center gap-2.5">
          {dealerLogo ? (
            <img src={dealerLogo} alt="logo" className="w-8 h-8 rounded-lg object-contain bg-white/5 flex-shrink-0 p-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-brand-400/10 border border-brand-400/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-400">
              {dealer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{dealer.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{[dealer.city, dealer.district].filter(Boolean).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map((item, i) => {
          if ('section' in item) {
            return sidebarOpen ? (
              <p key={i} className="text-[9px] font-bold tracking-[0.12em] text-[var(--text-muted)] px-3 pt-4 pb-1.5 uppercase">{item.section}</p>
            ) : <div key={i} className="my-2 h-px bg-[var(--border)] mx-2" />;
          }
          const Icon = item.icon;
          const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <NavLink key={item.to} to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
                'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]',
                isActive && 'nav-active',
                !sidebarOpen && 'justify-center px-0'
              )}>
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[rgba(74,222,128,0.12)] text-brand-400 border border-[rgba(74,222,128,0.2)]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Tractor watermark — agro decorative element */}
      {sidebarOpen && (
        <div className="pointer-events-none select-none flex justify-center pb-2 opacity-[0.07]" aria-hidden="true">
          <svg className="w-28 h-auto text-brand-400 tractor-float" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Large rear wheel */}
            <circle cx="44" cy="64" r="28" stroke="currentColor" strokeWidth="3"/>
            <circle cx="44" cy="64" r="19" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 5"/>
            <circle cx="44" cy="64" r="4" fill="currentColor"/>
            {/* Spokes */}
            <line x1="44" y1="36" x2="44" y2="92" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="16" y1="64" x2="72" y2="64" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="24" y1="44" x2="64" y2="84" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="64" y1="44" x2="24" y2="84" stroke="currentColor" strokeWidth="1.2"/>
            {/* Small front wheel */}
            <circle cx="122" cy="72" r="19" stroke="currentColor" strokeWidth="2.5"/>
            <circle cx="122" cy="72" r="11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle cx="122" cy="72" r="3" fill="currentColor"/>
            {/* Axle bar */}
            <rect x="44" y="54" width="80" height="9" rx="3" fill="currentColor" opacity="0.5"/>
            {/* Cab body */}
            <rect x="50" y="24" width="34" height="34" rx="4" fill="currentColor" opacity="0.3"/>
            <rect x="50" y="24" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="2"/>
            {/* Cab window */}
            <rect x="55" y="28" width="24" height="16" rx="2" fill="currentColor" opacity="0.45"/>
            {/* Engine hood */}
            <rect x="82" y="30" width="30" height="24" rx="3" fill="currentColor" opacity="0.45"/>
            {/* Exhaust */}
            <rect x="108" y="18" width="5" height="17" rx="2.5" fill="currentColor" opacity="0.7"/>
            {/* Headlamp */}
            <circle cx="113" cy="38" r="5" fill="currentColor" opacity="0.6"/>
            {/* Ground shadow line */}
            <path d="M18 92 Q81 98 148 92" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
          </svg>
        </div>
      )}

      {/* Collapse toggle + Logout */}
      <div className="p-3 border-t border-[var(--border)] space-y-1">
        <button onClick={toggleSidebar}
          className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-all', !sidebarOpen && 'justify-center')}>
          {sidebarOpen ? <><ChevronLeft size={14} /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>
        <button onClick={clearAuth}
          className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.06)] transition-all', !sidebarOpen && 'justify-center')}>
          <LogOut size={14} />{sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
