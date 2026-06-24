import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const CampaignSchema = z.object({
  name: z.string().min(1),
  goal: z.string().default(''),
  channels: z.array(z.string()).default(['voice']),
  language: z.string().default('mr'),
  total_contacts: z.number().int().default(0),
  script_voice: z.string().optional().nullable(),
  script_whatsapp: z.string().optional().nullable(),
  script_sms: z.string().optional().nullable(),
});

// GET /api/campaigns
router.get('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { status } = req.query as Record<string, string>;

    const where: any = { dealer_id };
    if (status) where.status = status;

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    res.json({ campaigns, total: campaigns.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign || campaign.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns
router.post('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const data = CampaignSchema.parse(req.body);
    const campaign = await prisma.campaign.create({ data: { ...data, dealer_id } });
    res.status(201).json({ campaign, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PATCH /api/campaigns/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const { status } = z.object({ status: z.enum(['idle', 'running', 'paused', 'completed']) }).parse(req.body);
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status, updated_at: new Date() },
    });
    res.json({ campaign, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// PATCH /api/campaigns/:id/progress — internal: increment sent/responses/interested
router.patch('/:id/progress', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const { sent = 0, responses = 0, interested = 0 } = req.body as Record<string, number>;
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        sent: { increment: sent },
        responses: { increment: responses },
        interested: { increment: interested },
        updated_at: new Date(),
      },
    });
    res.json({ campaign, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign progress' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
