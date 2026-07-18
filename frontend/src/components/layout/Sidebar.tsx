import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import {
  LayoutDashboard, Users, Megaphone, Truck, IndianRupee,
  Phone, Bot, FileText, Settings, ChevronLeft, ChevronRight,
  Zap, BarChart2, LogOut, HelpCircle,
  TrendingUp, Tag, Clock, Mic, Sparkles, Calculator, LifeBuoy, Wrench,
} from 'lucide-react';
import AgroDeskoLogo, { LogoMark } from '../ui/AgroDeskoLogo';

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
  { to: '/support',        icon: LifeBuoy,    label: 'Support Intake', badgeIcon: Wrench,      badgeColor: '#f87171' },
  { section: 'SYSTEM' },
  { to: '/settings', icon: Settings,   label: 'Settings' },
  { to: '/help',     icon: HelpCircle, label: 'Help & Support' },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, dealer, clearAuth, dealerLogo, theme } = useAppStore();
  const isDark = theme !== 'light';
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
        'flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]',
        !sidebarOpen && 'justify-center',
      )}>
        <AnimatePresence mode="wait" initial={false}>
          {sidebarOpen ? (
            <motion.div
              key="full"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="flex-shrink-0"
            >
              <AgroDeskoLogo variant={isDark ? "full-dark" : "full"} height={36} />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="flex-shrink-0"
            >
              <LogoMark height={32} dark={isDark} />
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
              aria-label={item.label}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 border group',
                'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                !sidebarOpen && 'justify-center px-0',
                isActive && 'nav-active',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active-rail"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-brand-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
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
              <circle cx="122" cy="72" r="19" stroke="currentColor" strokeWidth="2.5"/>
              <circle cx="122" cy="72" r="11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
              <circle cx="122" cy="72" r="3" fill="currentColor"/>
              <rect x="44" y="54" width="80" height="9" rx="3" fill="currentColor" opacity="0.5"/>
              <rect x="50" y="24" width="34" height="34" rx="4" fill="currentColor" opacity="0.3"/>
              <rect x="50" y="24" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="2"/>
              <rect x="55" y="28" width="24" height="16" rx="2" fill="currentColor" opacity="0.45"/>
              <rect x="82" y="30" width="30" height="24" rx="3" fill="currentColor" opacity="0.45"/>
              <rect x="108" y="18" width="5" height="17" rx="2.5" fill="currentColor" opacity="0.7"/>
              <circle cx="113" cy="38" r="5" fill="currentColor" opacity="0.6"/>
              <path d="M18 92 Q81 98 148 92" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse + Logout */}
      <div className="p-3 border-t border-[var(--border)] space-y-1">
        <motion.button
          whileHover={{ x: sidebarOpen ? -2 : 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors',
            !sidebarOpen && 'justify-center',
          )}
        >
          {sidebarOpen ? <><ChevronLeft size={14} /><span>Collapse</span></> : <ChevronRight size={14} />}
        </motion.button>
        <motion.button
          whileHover={{ x: 1 }}
          aria-label="Sign out"
          onClick={clearAuth}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.06)] transition-colors',
            !sidebarOpen && 'justify-center',
          )}
        >
          <LogOut size={14} />
          {sidebarOpen && <span>Sign Out</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
};
