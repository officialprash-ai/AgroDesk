import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total_leads,
      new_leads_today,
      active_campaigns,
      recovery_cases,
      used_tractors,
      monthly_sales_raw,
    ] = await Promise.all([
      prisma.contact.count({ where: { dealer_id } }),
      prisma.contact.count({ where: { dealer_id, created_at: { gte: today } } }),
      prisma.campaign.count({ where: { dealer_id, status: 'running' } }),
      prisma.recoveryCase.findMany({ where: { dealer_id, status: 'active' } }),
      prisma.usedTractor.count({ where: { dealer_id, status: 'available' } }),
      prisma.contact.count({
        where: {
          dealer_id,
          lead_status: 'won',
          updated_at: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
      }),
    ]);

    const recovery_amount = recovery_cases.reduce(
      (sum: number, c: { amount_due: number }) => sum + c.amount_due, 0
    );
    const pending_recovery = recovery_cases.length;

    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [won90, lost90] = await Promise.all([
      prisma.contact.count({ where: { dealer_id, lead_status: 'won', updated_at: { gte: since90 } } }),
      prisma.contact.count({ where: { dealer_id, lead_status: 'lost', updated_at: { gte: since90 } } }),
    ]);
    const conversion_rate = won90 + lost90 > 0
      ? Math.round((won90 / (won90 + lost90)) * 1000) / 10
      : 0;

    res.json({
      total_leads, new_leads_today, active_campaigns,
      pending_recovery, recovery_amount, used_tractors,
      monthly_sales: monthly_sales_raw,
      calls_today: 0, whatsapp_today: 0, conversion_rate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const { dealer_id, limit = '20' } = req.query as Record<string, string>;
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });
    const jobs = await prisma.agentJob.findMany({
      where: { dealer_id },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
    });
    res.json({ activity: jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.get('/charts', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id ?? (req.query.dealer_id as string);
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });

    const now = new Date();
    const monthStart = (y: number, m: number) => new Date(y, m, 1);
    const sixAgo = monthStart(now.getFullYear(), now.getMonth() - 5);

    const [createdContacts, wonContacts, convoGroups] = await Promise.all([
      prisma.contact.findMany({ where: { dealer_id, created_at: { gte: sixAgo } }, select: { created_at: true } }),
      prisma.contact.findMany({ where: { dealer_id, lead_status: 'won', updated_at: { gte: sixAgo } }, select: { updated_at: true } }),
      prisma.conversation.groupBy({ by: ['channel'], where: { dealer_id }, _count: { _all: true } }),
    ]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const buckets: { key: string; month: string; sales: number; enquiries: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = monthStart(now.getFullYear(), now.getMonth() - i);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], sales: 0, enquiries: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    for (const c of createdContacts) { const i = idx.get(keyOf(c.created_at)); if (i !== undefined) buckets[i].enquiries++; }
    for (const c of wonContacts) { const i = idx.get(keyOf(c.updated_at)); if (i !== undefined) buckets[i].sales++; }
    const salesTrend = buckets.map(({ month, sales, enquiries }) => ({ month, sales, enquiries }));

    const channels = (convoGroups as Array<{ channel: string; _count: { _all: number } }>)
      .map(c => ({ key: c.channel, value: c._count._all }));

    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const fourAgo = new Date(now.getTime() - 4 * weekMs);
    const [wkConvos, wkContacts] = await Promise.all([
      prisma.conversation.findMany({ where: { dealer_id, created_at: { gte: fourAgo } }, select: { channel: true, created_at: true } }),
      prisma.contact.findMany({ where: { dealer_id, created_at: { gte: fourAgo } }, select: { created_at: true } }),
    ]);
    const weekly = [0,1,2,3].map(w => ({ week: `W${w+1}`, calls: 0, whatsapp: 0, sms: 0, leads: 0 }));
    const weekIndex = (d: Date) => Math.min(3, Math.max(0, Math.floor((d.getTime() - fourAgo.getTime()) / weekMs)));
    for (const c of wkConvos) {
      const wi = weekIndex(c.created_at);
      if (c.channel === 'voice') weekly[wi].calls++;
      else if (c.channel === 'whatsapp') weekly[wi].whatsapp++;
      else if (c.channel === 'sms') weekly[wi].sms++;
    }
    for (const c of wkContacts) { weekly[weekIndex(c.created_at)].leads++; }

    const thisStart = monthStart(now.getFullYear(), now.getMonth());
    const lastStart = monthStart(now.getFullYear(), now.getMonth() - 1);
    const [leadsThis, leadsLast, salesThis, salesLast] = await Promise.all([
      prisma.contact.count({ where: { dealer_id, created_at: { gte: thisStart } } }),
      prisma.contact.count({ where: { dealer_id, created_at: { gte: lastStart, lt: thisStart } } }),
      prisma.contact.count({ where: { dealer_id, lead_status: 'won', updated_at: { gte: thisStart } } }),
      prisma.contact.count({ where: { dealer_id, lead_status: 'won', updated_at: { gte: lastStart, lt: thisStart } } }),
    ]);
    const pct = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);
    const trends = { leads: pct(leadsThis, leadsLast), sales: pct(salesThis, salesLast) };

    res.json({ salesTrend, channels, weekly, trends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch charts' });
  }
});

router.delete('/activity', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id ?? (req.query.dealer_id as string);
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });
    const result = await prisma.agentJob.deleteMany({
      where: { dealer_id, status: { in: ['pending', 'queued', 'failed'] } },
    });
    res.json({ success: true, cleared: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear activity' });
  }
});

export default router;
