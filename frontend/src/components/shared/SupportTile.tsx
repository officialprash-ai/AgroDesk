import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LifeBuoy, PhoneOff, ArrowRight } from 'lucide-react';
import { useSupportStore } from '../../store/support';

/**
 * Dashboard tile for Support Intake. One big number: how many NEW requests are
 * waiting. Red border when the oldest untouched request is > 24h old. A second,
 * smaller line flags calls that never connected. Built to be read in two
 * seconds from across a workshop floor. Clicks through to the Support panel.
 */
export const SupportTile: React.FC = () => {
  const { summary, fetchSummary } = useSupportStore();

  useEffect(() => {
    fetchSummary();
    const t = setInterval(fetchSummary, 30_000); // poll every 30s
    return () => clearInterval(t);
  }, [fetchSummary]);

  const oldestAgeMs = summary.oldestNewAt ? Date.now() - new Date(summary.oldestNewAt).getTime() : 0;
  const stale = oldestAgeMs > 24 * 60 * 60 * 1000;

  return (
    <Link to="/support" className="block">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className={`glass rounded-2xl p-5 flex items-center gap-5 border transition-colors ${
          stale ? 'border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.4)]' : 'border-[var(--border)]'
        } hover:border-brand-400/60`}
      >
        <div className={`p-3 rounded-xl ${stale ? 'bg-red-500/10 text-red-400' : 'bg-[rgba(248,113,113,0.08)] text-[#f87171]'}`}>
          <LifeBuoy size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold tabular-nums text-[var(--text-primary)]">
              {summary.newCount}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">नवीन विनंत्या</span>
          </div>
          {summary.untransferredCount > 0 && (
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-red-400">
              <PhoneOff size={13} />
              {summary.untransferredCount} कॉल जोडला गेला नाही
            </div>
          )}
        </div>

        <ArrowRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
      </motion.div>
    </Link>
  );
};

export default SupportTile;
