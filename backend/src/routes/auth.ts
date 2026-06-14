import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { resetDemoData } from '../lib/demoSeed.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'agrodesk-dev-secret-change-in-prod';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = z.object({
      phone: z.string().min(1),
      password: z.string().min(1),
    }).parse(req.body);

    const dealer = await prisma.dealer.findFirst({ where: { phone } });
    if (!dealer) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = dealer.password_hash === ''
      ? true
      : await bcrypt.compare(password, dealer.password_hash);

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (dealer.is_demo) {
      try { await resetDemoData(prisma); } catch (e) { console.error('Demo reset failed:', e); }
    }

    const token = jwt.sign(
      { dealer_id: dealer.id, phone: dealer.phone, is_demo: dealer.is_demo },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      token,
      dealer: {
        id: dealer.id, name: dealer.name, city: dealer.city, district: dealer.district,
        phone: dealer.phone, email: dealer.email, language: dealer.language,
        plan: dealer.plan, is_demo: dealer.is_demo,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, city, district } = z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      password: z.string().min(6),
      city: z.string().default(''),
      district: z.string().default(''),
    }).parse(req.body);

    const existing = await prisma.dealer.findFirst({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'Phone already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const dealer = await prisma.dealer.create({
      data: { name, phone, city, district, password_hash },
    });

    const token = jwt.sign(
      { dealer_id: dealer.id, phone: dealer.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      dealer: { id: dealer.id, name: dealer.name, city: dealer.city, phone: dealer.phone, plan: dealer.plan },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = z.object({ credential: z.string().min(1) }).parse(req.body);

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google auth not configured' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const gPayload = ticket.getPayload();
    if (!gPayload?.sub) return res.status(401).json({ error: 'Invalid Google token' });

    const { sub: google_id, email, name: googleName } = gPayload;

    let dealer = await prisma.dealer.findFirst({
      where: { OR: [{ google_id }, ...(email ? [{ email }] : [])] },
    });

    if (!dealer) {
      dealer = await prisma.dealer.create({
        data: {
          google_id,
          email: email ?? null,
          name: googleName ?? email ?? 'New Dealer',
          phone: 'google-' + google_id,
          city: '',
          district: '',
          password_hash: '',
        },
      });
    } else if (!dealer.google_id) {
      dealer = await prisma.dealer.update({ where: { id: dealer.id }, data: { google_id } });
    }

    const token = jwt.sign(
      { dealer_id: dealer.id, phone: dealer.phone, is_demo: dealer.is_demo },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      token,
      dealer: {
        id: dealer.id, name: dealer.name, city: dealer.city, district: dealer.district,
        phone: dealer.phone, email: dealer.email, language: dealer.language,
        plan: dealer.plan, is_demo: dealer.is_demo,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Google auth error:', err);
    return res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { dealer_id: string };
    const dealer = await prisma.dealer.findUnique({ where: { id: payload.dealer_id } });
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
    return res.json({
      dealer: {
        id: dealer.id, name: dealer.name, city: dealer.city, district: dealer.district,
        phone: dealer.phone, email: dealer.email, language: dealer.language,
        plan: dealer.plan, is_demo: dealer.is_demo,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { dealer_id: string };

    const data = z.object({
      name: z.string().min(1).optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      gst_number: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      language: z.string().optional(),
    }).parse(req.body);

    const dealer = await prisma.dealer.update({
      where: { id: payload.dealer_id },
      data: { ...data, updated_at: new Date() },
    });

    return res.json({
      dealer: {
        id: dealer.id, name: dealer.name, city: dealer.city, district: dealer.district,
        phone: dealer.phone, email: dealer.email, language: dealer.language, plan: dealer.plan,
      },
      success: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;
