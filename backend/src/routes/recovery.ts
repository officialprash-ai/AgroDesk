import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const RecoverySchema = z.object({
  dealer_id: z.string(),
  customer_name: z.string().min(1),
  phone: z.string().min(10),
  amount_due: z.number().int().positive(),
  due_date: z.string().transform(s => new Date(s)),
  escalation_stage: z.enum(['gentle', 'firm', 'stern', 'legal']).default('gentle'),
  ptp_date: z.string().transform(s => new Date(s)).optional().nullable(),
  ptp_amount: z.number().int().optional().nullable(),
});

router.get('/', async (req, res) => {
  try {
    const { dealer_id, stage, status = 'active' } = req.query as Record<string, string>;
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });
    const where: any = { dealer_id, status };
    if (stage) where.escalation_stage = stage;
    const cases = await prisma.recoveryCase.findMany({
      where,
      orderBy: [{ amount_due: 'desc' }, { due_date: 'asc' }],
    });
    const total_due = cases.reduce((sum: number, c: { amount_due: number }) => sum + c.amount_due, 0);
    res.json({ cases, total: cases.length, total_due });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recovery cases' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = RecoverySchema.parse(req.body);
    const recoveryCase = await prisma.recoveryCase.create({ data });
    res.status(201).json({ case: recoveryCase, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create recovery case' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const UpdateSchema = z.object({
      escalation_stage: z.enum(['gentle', 'firm', 'stern', 'legal']).optional(),
      ptp_date: z.string().transform(s => new Date(s)).optional().nullable(),
      ptp_amount: z.number().int().optional().nullable(),
      status: z.enum(['active', 'resolved', 'written_off']).optional(),
    });
    const data = UpdateSchema.parse(req.body);
    const updated = await prisma.recoveryCase.update({
      where: { id: req.params.id },
      data: { ...data, updated_at: new Date() },
    });
    res.json({ case: updated, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update recovery case' });
  }
});

router.post('/:id/contact', async (req, res) => {
  try {
    const { channel, outcome } = z.object({
      channel: z.enum(['voice', 'whatsapp', 'sms', 'email']),
      outcome: z.string().default(''),
      script: z.string().optional(),
    }).parse(req.body);
    const existing = await prisma.recoveryCase.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Case not found' });
    const history = Array.isArray(existing.channel_history) ? (existing.channel_history as any[]) : [];
    const newEntry = { channel, outcome, date: new Date().toISOString() };
    const updated = await prisma.recoveryCase.update({
      where: { id: req.params.id },
      data: { channel_history: [...history, newEntry], last_contact: new Date(), updated_at: new Date() },
    });
    res.json({ success: true, case: updated, queued: channel === 'voice' || channel === 'whatsapp' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to log contact' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { dealer_id, channels } = z.object({
      dealer_id: z.string(),
      channels: z.array(z.string()).default(['voice', 'whatsapp']),
    }).parse(req.body);
    const activeCases = await prisma.recoveryCase.findMany({
      where: { dealer_id, status: 'active', escalation_stage: { not: 'legal' } },
    });
    const jobs = await Promise.all(
      activeCases.map((c: { id: string; escalation_stage: string }) =>
        prisma.agentJob.create({
          data: {
            dealer_id,
            agent_type: 'money_recovery',
            payload: { case_id: c.id, channels, escalation_stage: c.escalation_stage },
            idempotency_key: `recovery-${c.id}-${Date.now()}`,
          },
        })
      )
    );
    res.json({ success: true, queued: jobs.length, cases: activeCases.length });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to queue bulk recovery' });
  }
});

export default router;
