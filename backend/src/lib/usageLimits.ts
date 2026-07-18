/**
 * Plan-limit enforcement.
 *
 * Limits are set in the Sovereign Vault (platform_config → plan_limits) and
 * enforced here against per-dealer monthly counters in `usage_counter`.
 *
 * Two families of metric:
 *  - MONTHLY: consumption that accrues over a calendar month (AI calls,
 *    WhatsApp, SMS, AI scripts). Tracked in usage_counter.
 *  - POINT_IN_TIME: current-state caps (contacts, active campaigns). Counted
 *    from the source tables — a counter would drift as records are deleted.
 *
 * Policy: FAIL OPEN. If limits can't be read or a metric is unknown, the
 * action is allowed. Blocking a dealer's outbound calls because a config
 * lookup failed is worse than briefly exceeding a quota.
 */
import { prisma } from './prisma.js';
import { getLimit } from './platformConfig.js';

/** Monthly consumption metrics, keyed to the plan_limits field names. */
export const MONTHLY_METRICS = {
  ai_calls: 'ai_calls_per_month',
  whatsapp_msgs: 'whatsapp_msgs_per_month',
  sms: 'sms_per_month',
  ai_scripts: 'ai_scripts_per_month',
} as const;

export type MonthlyMetric = keyof typeof MONTHLY_METRICS;

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number | null; // null = not configured, therefore not enforced
  metric: string;
  remaining: number | null;
}

/** Current period key, 'YYYY-MM'. */
export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getDealerPlan(dealerId: string): Promise<string | null> {
  try {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { plan: true },
    });
    return dealer?.plan ?? null;
  } catch (err) {
    console.error('[usageLimits] could not resolve dealer plan:', err);
    return null;
  }
}

async function getUsed(dealerId: string, metric: MonthlyMetric): Promise<number> {
  try {
    const row = await prisma.usageCounter.findUnique({
      where: {
        dealer_id_metric_period: {
          dealer_id: dealerId,
          metric,
          period: currentPeriod(),
        },
      },
      select: { count: true },
    });
    return row?.count ?? 0;
  } catch (err) {
    console.error('[usageLimits] could not read usage counter:', err);
    return 0;
  }
}

/**
 * Check a monthly metric without consuming quota.
 * Returns allowed:true when the limit is unset or unreadable (fail open).
 */
export async function checkLimit(dealerId: string, metric: MonthlyMetric): Promise<LimitCheck> {
  const limitKey = MONTHLY_METRICS[metric];
  const plan = await getDealerPlan(dealerId);

  if (!plan) {
    return { allowed: true, used: 0, limit: null, metric: limitKey, remaining: null };
  }

  const [limit, used] = await Promise.all([getLimit(plan, limitKey), getUsed(dealerId, metric)]);

  if (limit === null) {
    return { allowed: true, used, limit: null, metric: limitKey, remaining: null };
  }

  return {
    allowed: used < limit,
    used,
    limit,
    metric: limitKey,
    remaining: Math.max(0, limit - used),
  };
}

/**
 * Increment usage for the current month. Atomic upsert, so concurrent calls
 * cannot lose increments. Never throws — metering must not break the action
 * it is measuring.
 */
export async function recordUsage(dealerId: string, metric: MonthlyMetric, by = 1): Promise<void> {
  const period = currentPeriod();
  try {
    await prisma.usageCounter.upsert({
      where: { dealer_id_metric_period: { dealer_id: dealerId, metric, period } },
      create: { dealer_id: dealerId, metric, period, count: by },
      update: { count: { increment: by } },
    });
  } catch (err) {
    console.error(`[usageLimits] failed to record ${metric} for ${dealerId}:`, err);
  }
}

/**
 * Check then consume, in one call. Returns the check result; only increments
 * when allowed. Use immediately before performing the billable action.
 */
export async function consumeQuota(dealerId: string, metric: MonthlyMetric): Promise<LimitCheck> {
  const check = await checkLimit(dealerId, metric);
  if (check.allowed) await recordUsage(dealerId, metric);
  return check;
}

/** Point-in-time caps, counted from source tables rather than counters. */
export async function checkPointInTime(
  dealerId: string,
  metric: 'contacts_per_dealer' | 'campaigns_active',
): Promise<LimitCheck> {
  const plan = await getDealerPlan(dealerId);
  if (!plan) return { allowed: true, used: 0, limit: null, metric, remaining: null };

  const limit = await getLimit(plan, metric);
  if (limit === null) return { allowed: true, used: 0, limit: null, metric, remaining: null };

  let used = 0;
  try {
    used =
      metric === 'contacts_per_dealer'
        ? await prisma.contact.count({ where: { dealer_id: dealerId } })
        : // "Active" is anything not parked or finished. Campaign statuses in
          // use are 'idle' and 'running'; excluding terminal states rather than
          // matching 'running' keeps this correct if new states are added.
          await prisma.campaign.count({
            where: { dealer_id: dealerId, status: { notIn: ['idle', 'completed', 'failed', 'cancelled'] } },
          });
  } catch (err) {
    console.error(`[usageLimits] could not count ${metric}:`, err);
    return { allowed: true, used: 0, limit, metric, remaining: null };
  }

  return { allowed: used < limit, used, limit, metric, remaining: Math.max(0, limit - used) };
}

/** Express middleware factory: blocks with 429 when a monthly quota is spent. */
export function enforceQuota(metric: MonthlyMetric, getDealerId: (req: any) => string | undefined) {
  return async (req: any, res: any, next: any) => {
    const dealerId = getDealerId(req);
    if (!dealerId) return next(); // no dealer context — nothing to meter against

    const check = await checkLimit(dealerId, metric);
    if (check.allowed) return next();

    res.status(429).json({
      error: 'Plan limit reached',
      metric: check.metric,
      used: check.used,
      limit: check.limit,
      message: `Your plan allows ${check.limit} per month. Upgrade to continue.`,
    });
  };
}
