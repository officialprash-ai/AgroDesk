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

// PATCH /api/campaigns/:id — edit campaign details (name/goal/channels/language/scripts)
router.patch('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const data = z.object({
      name: z.string().min(1).optional(),
      goal: z.string().optional(),
      channels: z.array(z.string()).optional(),
      language: z.string().optional(),
      script_voice: z.string().optional().nullable(),
      script_whatsapp: z.string().optional().nullable(),
      script_sms: z.string().optional().nullable(),
    }).parse(req.body);

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { ...data, updated_at: new Date() },
    });
    res.json({ campaign, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// GET /api/campaigns/:id/contacts — contacts explicitly attached to this campaign
router.get('/:id/contacts', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const links = await prisma.campaignContact.findMany({
      where: { campaign_id: req.params.id },
      include: { contact: true },
      orderBy: { created_at: 'desc' },
    });
    res.json({ contacts: links.map((l: any) => l.contact), total: links.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign contacts' });
  }
});

// POST /api/campaigns/:id/contacts — attach one or more existing contacts (dedupes)
router.post('/:id/contacts', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const { contact_ids } = z.object({ contact_ids: z.array(z.string()).min(1).max(500) }).parse(req.body);

    // Only attach contacts that actually belong to this dealer
    const validContacts = await prisma.contact.findMany({
      where: { id: { in: contact_ids }, dealer_id },
      select: { id: true },
    });
    const validIds = validContacts.map((c: { id: string }) => c.id);

    await Promise.all(validIds.map((contact_id: string) =>
      prisma.campaignContact.upsert({
        where: { campaign_id_contact_id: { campaign_id: req.params.id, contact_id } },
        update: {},
        create: { campaign_id: req.params.id, contact_id },
      }).catch(() => null),
    ));

    const total = await prisma.campaignContact.count({ where: { campaign_id: req.params.id } });
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { total_contacts: total, updated_at: new Date() },
    });
    res.json({ campaign, added: validIds.length, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to add contacts to campaign' });
  }
});

// DELETE /api/campaigns/:id/contacts/:contact_id — detach a single contact
router.delete('/:id/contacts/:contact_id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    await prisma.campaignContact.deleteMany({
      where: { campaign_id: req.params.id, contact_id: req.params.contact_id },
    });

    const total = await prisma.campaignContact.count({ where: { campaign_id: req.params.id } });
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { total_contacts: total, updated_at: new Date() },
    });
    res.json({ campaign, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove contact from campaign' });
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
