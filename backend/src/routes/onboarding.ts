import { Router } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const DEALER_SELECT = {
  id: true, name: true, city: true, district: true, state: true, gst_number: true,
  phone: true, email: true, language: true, plan: true, is_demo: true,
  brand_ids: true, business_type: true, onboarding_status: true, onboarding_step: true,
  gst_verified: true, logo_url: true,
};

const VALID_PLANS = ['starter', 'growth', 'pro'] as const;
const VALID_BUSINESS_TYPES = ['authorized_dealer', 'reseller', 'both'] as const;

async function bumpStep(dealer_id: string, step: number) {
  const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id }, select: { onboarding_step: true } });
  if (dealer && dealer.onboarding_step < step) {
    await prisma.dealer.update({ where: { id: dealer_id }, data: { onboarding_step: step } });
  }
}

// GET /api/onboarding/brands — active brand catalog for the "brands you sell" step
router.get('/brands', async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
    res.json({ brands });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load brand catalog' });
  }
});

// GET /api/onboarding/status — current setup progress + a simple checklist
router.get('/status', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id }, select: DEALER_SELECT });
    if (!dealer) return res.status(404).json({ error: 'Not found' });

    const checklist = {
      profile: !!(dealer.city && dealer.district),
      brands: dealer.brand_ids.length > 0,
      plan: !!dealer.plan,
    };

    res.json({ dealer, checklist, complete: dealer.onboarding_status === 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load onboarding status' });
  }
});

// PATCH /api/onboarding/profile — step 1: organization details
router.patch('/profile', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const data = z.object({
      name: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
      state: z.string().optional(),
      gst_number: z.string().optional().nullable(),
      business_type: z.enum(VALID_BUSINESS_TYPES).optional(),
      logo_url: z.string().optional().nullable(),
      language: z.string().optional(),
    }).parse(req.body);

    const dealer = await prisma.dealer.update({ where: { id: dealer_id }, data, select: DEALER_SELECT });
    await bumpStep(dealer_id, 1);
    res.json({ dealer, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to save organization details' });
  }
});

// PATCH /api/onboarding/brands — step 2: which tractor brands this dealer sells
router.patch('/brands', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { brand_ids } = z.object({ brand_ids: z.array(z.string()).max(50) }).parse(req.body);

    // Only accept IDs that actually exist in the catalog — silently drop the rest
    const valid = await prisma.brand.findMany({ where: { id: { in: brand_ids } }, select: { id: true } });
    const validIds = valid.map((b: { id: string }) => b.id);

    const dealer = await prisma.dealer.update({ where: { id: dealer_id }, data: { brand_ids: validIds }, select: DEALER_SELECT });
    await bumpStep(dealer_id, 2);
    res.json({ dealer, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to save brands' });
  }
});

// PATCH /api/onboarding/plan — step 3: plan selection
router.patch('/plan', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { plan } = z.object({ plan: z.enum(VALID_PLANS) }).parse(req.body);

    const dealer = await prisma.dealer.update({ where: { id: dealer_id }, data: { plan }, select: DEALER_SELECT });
    await bumpStep(dealer_id, 3);
    res.json({ dealer, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

// POST /api/onboarding/complete — step 4: finish setup, unlock the full app
router.post('/complete', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.dealer.findUnique({ where: { id: dealer_id }, select: { city: true, district: true } });
    if (!existing?.city || !existing?.district) {
      return res.status(400).json({ error: 'Organization details are incomplete — finish the profile step first.' });
    }

    const dealer = await prisma.dealer.update({
      where: { id: dealer_id },
      data: { onboarding_status: 'active', onboarding_step: 4 },
      select: DEALER_SELECT,
    });
    res.json({ dealer, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
