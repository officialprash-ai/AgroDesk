import { Router } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const ContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional().nullable(),
  village: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  language: z.string().default('mr'),
  lead_status: z.string().default('new'),
  score: z.number().int().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
  opt_in_whatsapp: z.boolean().default(false),
  opt_in_sms: z.boolean().default(false),
  opt_in_call: z.boolean().default(false),
});

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { status, search, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const where: any = { dealer_id };
    if (status && status !== 'all') where.lead_status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { village: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ score: 'desc' }, { updated_at: 'desc' }],
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({ contacts, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!contact || contact.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const data = ContactSchema.parse(req.body);
    const contact = await prisma.contact.create({ data: { ...data, dealer_id } });
    res.status(201).json({ contact, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PATCH /api/contacts/:id
router.patch('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const data = ContactSchema.partial().parse(req.body);
    const contact = await prisma.contact.update({ where: { id: req.params.id }, data });
    res.json({ contact, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /api/contacts/:id/opt-in — record explicit consent for a channel
router.post('/:id/opt-in', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const { channel, source } = z.object({
      channel: z.enum(['whatsapp', 'sms', 'call']),
      source: z.string().default('manual'),
    }).parse(req.body);

    const fieldMap = { whatsapp: 'opt_in_whatsapp', sms: 'opt_in_sms', call: 'opt_in_call' } as const;
    await prisma.contact.update({ where: { id: req.params.id }, data: { [fieldMap[channel]]: true } });

    await prisma.consent.create({
      data: { dealer_id, contact_id: req.params.id, channel, opt_in_at: new Date(), source },
    });

    res.json({ success: true, channel, opted_in_at: new Date() });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to record opt-in' });
  }
});

// POST /api/contacts/:id/opt-out — revoke consent
router.post('/:id/opt-out', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const { channel } = z.object({ channel: z.enum(['whatsapp', 'sms', 'call']) }).parse(req.body);
    const fieldMap = { whatsapp: 'opt_in_whatsapp', sms: 'opt_in_sms', call: 'opt_in_call' } as const;
    await prisma.contact.update({ where: { id: req.params.id }, data: { [fieldMap[channel]]: false } });

    const latest = await prisma.consent.findFirst({
      where: { contact_id: req.params.id, channel, opt_out_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (latest) {
      await prisma.consent.update({ where: { id: latest.id }, data: { opt_out_at: new Date() } });
    }
    res.json({ success: true, channel, opted_out_at: new Date() });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to record opt-out' });
  }
});

// GET /api/contacts/:id/export — DPDP right to access
router.get('/:id/export', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!contact || contact.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const [conversations, consents] = await Promise.all([
      prisma.conversation.findMany({
        where: { contact_id: req.params.id, dealer_id },
        orderBy: { created_at: 'desc' },
        select: { channel: true, direction: true, content: true, status: true, created_at: true },
      }),
      prisma.consent.findMany({
        where: { contact_id: req.params.id, dealer_id },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    res.json({
      exported_at: new Date(),
      contact: {
        name: contact.name, phone: contact.phone, email: contact.email,
        village: contact.village, district: contact.district,
        language: contact.language, created_at: contact.created_at,
      },
      consent_history: consents,
      communication_history: conversations,
    });
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// POST /api/contacts/:id/erase — DPDP right to erasure
router.post('/:id/erase', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    await prisma.$transaction([
      prisma.contact.update({
        where: { id: req.params.id },
        data: {
          name: '[ERASED]',
          phone: `erased-${req.params.id.slice(0, 8)}`,
          email: null, village: null, district: null, tags: [],
          opt_in_whatsapp: false, opt_in_sms: false, opt_in_call: false,
        },
      }),
      prisma.conversation.updateMany({
        where: { contact_id: req.params.id, dealer_id },
        data: { content: '[ERASED]' },
      }),
      prisma.consent.deleteMany({ where: { contact_id: req.params.id, dealer_id } }),
    ]);

    res.json({ success: true, erased_at: new Date(), contact_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Erasure failed' });
  }
});

export default router;
