import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import {
  LayoutDashboard, Users, Megaphone, Truck, IndianRupee,
  Phone, Bot, FileText, Settings, ChevronLeft, ChevronRight,
  Tractor, Zap, BarChart2, MessageSquare, LogOut
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
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, dealer, clearAuth } = useAppStore();
  const location = useLocation();

  return (
    <aside className={cn(
      'flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0 z-40',
      'border-r border-[var(--border)]',
      'bg-[linear-gradient(180deg,rgba(6,26,12,0.95)_0%,rgba(2,12,7,0.98)_100%)]',
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
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{dealer.name}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{dealer.city}, {dealer.state}</p>
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
