/**
 * Support Intake — REST API
 *
 * All endpoints are dealer-scoped: dealer_id comes from the verified JWT
 * (authMiddleware), never from the body/query. Mutations verify ownership
 * before touching a row — same tenant-isolation pattern as the rest of the app.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../lib/prisma.js';
// `as any` for the new Support Intake models (see intake.ts note).
const prisma = _prisma as any;
import type { AuthRequest } from '../middleware/auth.js';
import { resolveRoute } from '../services/support/router.js';

const router = Router();

const TYPES = ['SERVICE', 'REPAIR', 'OTHER', 'UNSURE'] as const;
const STATUSES = ['NEW', 'SEEN', 'IN_PROGRESS', 'DONE'] as const;
const PAGE_SIZE = 20;

// ─── GET /api/support/requests?status=&type=&page= ───────────
router.get('/requests', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { status, type } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);

    const where: any = { dealer_id };
    if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;
    if (type && (TYPES as readonly string[]).includes(type)) where.type = type;

    const [requests, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        orderBy: { created_at: 'desc' }, // newest first
        include: { contact: { select: { id: true, name: true } }, machine: true },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.supportRequest.count({ where }),
    ]);

    res.json({ requests, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error('[support/list]', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ─── GET /api/support/requests/:id ───────────────────────────
router.get('/requests/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const request = await prisma.supportRequest.findUnique({
      where: { id: req.params.id },
      include: { contact: true, machine: true },
    });
    if (!request || request.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ─── PATCH /api/support/requests/:id { status, machineId, type } ──
router.patch('/requests/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.supportRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });

    const body = z
      .object({
        status: z.enum(STATUSES).optional(),
        machineId: z.string().nullable().optional(),
        type: z.enum(TYPES).optional(),
      })
      .parse(req.body);

    const data: any = { updated_at: new Date() };

    if (body.status) {
      data.status = body.status;
      // SEEN stamps seen_at once; DONE stamps closed_at.
      if (body.status === 'SEEN' && !existing.seen_at) data.seen_at = new Date();
      if (body.status === 'DONE') data.closed_at = new Date();
    }

    if (body.machineId !== undefined) data.machine_id = body.machineId;

    if (body.type) {
      data.type = body.type;
      // Re-route when the dealer reclassifies the ticket.
      const routing = await prisma.supportRouting.findUnique({ where: { dealer_id } }).catch(() => null);
      const route = resolveRoute(body.type, routing);
      data.routed_to = route.target;
      data.routed_to_phone = route.phone;
    }

    const updated = await prisma.supportRequest.update({ where: { id: req.params.id }, data });
    res.json({ request: updated, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('[support/patch]', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ─── POST /api/support/requests — manual entry by dealer ─────
router.post('/requests', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const body = z
      .object({
        phone: z.string().min(6),
        note: z.string().min(1),
        type: z.enum(TYPES).default('OTHER'),
        note_en: z.string().optional(),
        caller_name: z.string().optional(),
        contact_id: z.string().optional().nullable(),
        machine_id: z.string().optional().nullable(),
      })
      .parse(req.body);

    // Manual entries are dealer-typed, so no triage. Just route + persist.
    const routing = await prisma.supportRouting.findUnique({ where: { dealer_id } }).catch(() => null);
    const route = resolveRoute(body.type, routing);

    const request = await prisma.supportRequest.create({
      data: {
        dealer_id,
        contact_id: body.contact_id ?? null,
        machine_id: body.machine_id ?? null,
        phone: body.phone,
        caller_name: body.caller_name ?? null,
        type: body.type,
        status: 'NEW',
        channel: 'MANUAL',
        note: body.note,
        note_en: body.note_en ?? null,
        routed_to: route.target,
        routed_to_phone: route.phone,
        transferred: false,
      },
    });

    res.status(201).json({ request, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('[support/create]', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// ─── GET /api/support/summary ────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const [newCount, untransferredCount, oldestNew] = await Promise.all([
      prisma.supportRequest.count({ where: { dealer_id, status: 'NEW' } }),
      // "Call not connected": inbound CALL tickets never handed off, still open.
      prisma.supportRequest.count({
        where: { dealer_id, channel: 'CALL', transferred: false, status: { not: 'DONE' } },
      }),
      prisma.supportRequest.findFirst({
        where: { dealer_id, status: 'NEW' },
        orderBy: { created_at: 'asc' },
        select: { created_at: true },
      }),
    ]);
    res.json({ newCount, untransferredCount, oldestNewAt: oldestNew?.created_at ?? null });
  } catch (err) {
    console.error('[support/summary]', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ─── GET /api/support/routing ────────────────────────────────
router.get('/routing', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    let routing = await prisma.supportRouting.findUnique({ where: { dealer_id } });
    if (!routing) {
      // Return an unsaved default so the settings form has something to render.
      routing = {
        dealer_id,
        mechanic_phone: null,
        technician_phone: null,
        dealer_phone: null,
        office_hours_start: '09:00',
        office_hours_end: '19:00',
      };
    }
    res.json({ routing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routing' });
  }
});

// ─── PUT /api/support/routing ────────────────────────────────
const PhoneField = z.string().trim().max(20).optional().nullable();
router.put('/routing', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const body = z
      .object({
        mechanic_phone: PhoneField,
        technician_phone: PhoneField,
        dealer_phone: PhoneField,
        office_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        office_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
      .parse(req.body);

    const routing = await prisma.supportRouting.upsert({
      where: { dealer_id },
      update: { ...body, updated_at: new Date() },
      create: { dealer_id, ...body },
    });
    res.json({ routing, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('[support/routing/put]', err);
    res.status(500).json({ error: 'Failed to update routing' });
  }
});

export default router;
