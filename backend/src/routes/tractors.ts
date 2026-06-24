import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const TractorSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  hours: z.number().int().min(0),
  asking_price: z.number().int().positive(),
  cost_price: z.number().int().positive(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  photos: z.array(z.string()).default([]),
});

function calcUrgencyScore(days: number, hours: number, condition: string): number {
  let score = 0;
  score += Math.min(50, Math.floor(days / 2));
  if (hours > 4000) score += 30;
  else if (hours > 3000) score += 20;
  else if (hours > 2000) score += 10;
  if (condition === 'poor') score += 20;
  else if (condition === 'fair') score += 10;
  return Math.min(99, score);
}

// GET /api/tractors
router.get('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { status } = req.query as Record<string, string>;

    const where: any = { dealer_id };
    if (status) where.status = status;

    const tractors = await prisma.usedTractor.findMany({
      where,
      orderBy: { urgency_score: 'desc' },
    });
    res.json({ tractors, total: tractors.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tractors' });
  }
});

// GET /api/tractors/:id
router.get('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const tractor = await prisma.usedTractor.findUnique({ where: { id: req.params.id } });
    if (!tractor || tractor.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    res.json({ tractor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tractor' });
  }
});

// POST /api/tractors
router.post('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const data = TractorSchema.parse(req.body);
    const urgency_score = calcUrgencyScore(0, data.hours, data.condition);
    const tractor = await prisma.usedTractor.create({
      data: { ...data, dealer_id, urgency_score, days_on_lot: 0 },
    });
    res.status(201).json({ tractor, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create tractor listing' });
  }
});

// PATCH /api/tractors/:id
router.patch('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.usedTractor.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const data = TractorSchema.partial().parse(req.body);
    const urgency_score = calcUrgencyScore(
      existing.days_on_lot,
      data.hours ?? existing.hours,
      data.condition ?? existing.condition,
    );

    const tractor = await prisma.usedTractor.update({
      where: { id: req.params.id },
      data: { ...data, urgency_score, updated_at: new Date() },
    });
    res.json({ tractor, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update tractor' });
  }
});

// PATCH /api/tractors/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.usedTractor.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const { status } = z.object({
      status: z.enum(['available', 'reserved', 'sold']),
    }).parse(req.body);
    const tractor = await prisma.usedTractor.update({
      where: { id: req.params.id },
      data: { status, updated_at: new Date() },
    });
    res.json({ tractor, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /api/tractors/:id/description — save AI-generated listing description
router.patch('/:id/description', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.usedTractor.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const { description } = z.object({ description: z.string() }).parse(req.body);
    const tractor = await prisma.usedTractor.update({
      where: { id: req.params.id },
      data: { ai_description: description, updated_at: new Date() },
    });
    res.json({ tractor, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save description' });
  }
});

// POST /api/tractors/urgency-refresh — daily cron: increment days_on_lot + recalc scores
router.post('/urgency-refresh', async (req, res) => {
  try {
    const tractors = await prisma.usedTractor.findMany({ where: { status: 'available' } });
    let updated = 0;
    for (const t of tractors) {
      const newDays = t.days_on_lot + 1;
      const urgency_score = calcUrgencyScore(newDays, t.hours, t.condition);
      await prisma.usedTractor.update({
        where: { id: t.id },
        data: { days_on_lot: newDays, urgency_score, updated_at: new Date() },
      });
      updated++;
    }
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: 'Urgency refresh failed' });
  }
});

export default router;
