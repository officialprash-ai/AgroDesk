import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const ContactSchema = z.object({
  dealer_id: z.string(),
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
    const { dealer_id, status, search, limit = '50', offset = '0' } = req.query as Record<string, string>;

    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });

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
    const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!contact) return res.status(404).json({ error: 'Not found' });
    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    const data = ContactSchema.parse(req.body);
    const contact = await prisma.contact.create({ data });
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
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
