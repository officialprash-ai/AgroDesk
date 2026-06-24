import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import {
  LayoutDashboard, Users, Megaphone, Truck, IndianRupee,
  Phone, Bot, FileText, Settings, ChevronLeft, ChevronRight,
  Tractor, Zap, BarChart2, LogOut, HelpCircle,
  TrendingUp, Tag, Clock, Mic, Sparkles, Calculator,
} from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const NAV: Array<
  | { section: string }
  | { to: string; icon: LucideIcon; label: string; exact?: boolean; badgeIcon?: LucideIcon; badgeColor?: string }
> = [
  { section: 'OVERVIEW' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { section: 'CRM' },
  { to: '/crm/contacts', icon: Users,    label: 'Contacts' },
  { to: '/crm/pipeline', icon: Zap,      label: 'Pipeline' },
  { section: 'AGENTS' },
  { to: '/sales-engine',   icon: Megaphone,  label: 'Sales Engine',   badgeIcon: TrendingUp,  badgeColor: '#4ade80' },
  { to: '/used-tractor',   icon: Truck,       label: 'Used Tractor',   badgeIcon: Tag,         badgeColor: '#60a5fa' },
  { to: '/money-recovery', icon: IndianRupee, label: 'Money Recovery', badgeIcon: Clock,       badgeColor: '#fbbf24' },
  { to: '/cold-calling',   icon: Phone,       label: 'Cold Calling',   badgeIcon: Mic,         badgeColor: '#a78bfa' },
  { to: '/ai-salesman',    icon: Bot,         label: 'AI Salesman',    badgeIcon: Sparkles,    badgeColor: '#34d399' },
  { to: '/ai-accountant',  icon: FileText,    label: 'AI Accountant',  badgeIcon: Calculator,  badgeColor: '#fb923c' },
  { section: 'SYSTEM' },
  { to: '/settings', icon: Settings,   label: 'Settings' },
  { to: '/help',     icon: HelpCircle, label: 'Help & Support' },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, dealer, clearAuth, dealerLogo } = useAppStore();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen sticky top-0 flex-shrink-0 z-40 border-r border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]',
        !sidebarOpen && 'justify-center',
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center shadow-[0_0_18px_rgba(74,222,128,0.38)]">
            <Tractor size={15} className="text-surface-900" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse-slow border border-[var(--sidebar-bg)]" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
            >
              <h1 className="font-display font-bold text-base text-[var(--text-primary)] leading-none whitespace-nowrap">
                AgroDesk
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">Dealer Intelligence</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dealer info pill */}
      <AnimatePresence>
        {sidebarOpen && dealer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] flex items-center gap-2.5">
              {dealerLogo ? (
                <img
                  src={dealerLogo} alt="logo"
                  className="w-7 h-7 rounded-lg object-contain bg-white/5 flex-shrink-0 p-0.5"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-brand-400/12 border border-brand-400/22 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-400">
                  {dealer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{dealer.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {[dealer.city, dealer.district].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map((item, i) => {
          if ('section' in item) {
            return sidebarOpen ? (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[9px] font-bold tracking-[0.14em] text-[var(--text-muted)] px-3 pt-4 pb-1.5 uppercase whitespace-nowrap"
              >
                {item.section}
              </motion.p>
            ) : (
              <div key={i} className="my-2 h-px bg-[var(--border)] mx-2" />
            );
          }

          const Icon = item.icon;
          const BadgeIcon = 'badgeIcon' in item ? item.badgeIcon : undefined;
          const badgeColor = 'badgeColor' in item ? item.badgeColor : undefined;
          const isActive = 'exact' in item && item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 border group',
                'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                !sidebarOpen && 'justify-center px-0',
                isActive && 'nav-active',
              )}
            >
              {/* Hover bg */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[rgba(255,255,255,0.04)]" />
              )}

              <Icon size={15} className="flex-shrink-0 relative z-10" />

              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 truncate text-sm relative z-10 whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {sidebarOpen && BadgeIcon && badgeColor && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 relative z-10"
                  style={{
                    backgroundColor: `${badgeColor}16`,
                    border: `1px solid ${badgeColor}32`,
                    color: badgeColor,
                  }}
                  title={item.label}
                >
                  <BadgeIcon size={10} />
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Floating tractor watermark */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none select-none flex justify-center pb-2"
            aria-hidden="true"
          >
            <svg
              className="w-24 h-auto text-brand-400 tractor-float opacity-[0.06]"
              viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="44" cy="64" r="28" stroke="currentColor" strokeWidth="3"/>
              <circle cx="44" cy="64" r="19" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 5"/>
              <circle cx="44" cy="64" r="4" fill="currentColor"/>
              <line x1="44" y1="36" x2="44" y2="92" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="16" y1="64" x2="72" y2="64" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="24" y1="44" x2="64" y2="84" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="64" y1="44" x2="24" y2="84" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="122" cy="72" r="19"