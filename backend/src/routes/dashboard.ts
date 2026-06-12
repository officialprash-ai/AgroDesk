import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const { dealer_id } = req.query as { dealer_id: string };
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });

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

export default router;
