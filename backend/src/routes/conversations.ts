import { Router } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/conversations?contact_id=&limit=
router.get('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { contact_id, campaign_id, channel, limit = '50' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { dealer_id };
    if (contact_id) where.contact_id = contact_id;
    if (campaign_id) where.campaign_id = campaign_id;
    if (channel) where.channel = channel;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
    });

    res.json({ conversations, total: conversations.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/context/:contact_id — last 10 for AI context injection
router.get('/context/:contact_id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;

    const conversations = await prisma.conversation.findMany({
      where: { contact_id: req.params.contact_id, dealer_id },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const summary = conversations.reverse().map((c: any) => {
      const who = c.direction === 'inbound' ? 'Customer' : 'Agent';
      const when = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return `[${when} · ${c.channel.toUpperCase()} · ${who}]: ${c.content}${c.intent ? ` (intent: ${c.intent})` : ''}`;
    }).join('\n');

    res.json({ conversations, summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch context' });
  }
});

// POST /api/conversations — record an outbound message
const ConvSchema = z.object({
  contact_id: z.string(),
  campaign_id: z.string().optional(),
  channel: z.enum(['whatsapp', 'voice', 'sms', 'email']),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  content: z.string(),
  status: z.string().default('sent'),
  twilio_sid: z.string().optional(),
  duration_sec: z.number().optional(),
  media_url: z.string().optional(),
});

router.post('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const data = ConvSchema.parse(req.body);
    const conv = await prisma.conversation.create({ data: { ...data, dealer_id } });

    await prisma.contact.update({
      where: { id: data.contact_id },
      data: { last_contact: new Date() },
    });

    res.status(201).json({ conversation: conv, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to record conversation' });
  }
});

// GET /api/conversations/stats — aggregate for dashboard (last 30 days)
router.get('/stats', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, byChannel, byIntent, byDay] = await Promise.all([
      prisma.conversation.count({ where: { dealer_id, created_at: { gte: since } } }),
      prisma.conversation.groupBy({
        by: ['channel'],
        where: { dealer_id, created_at: { gte: since } },
        _count: true,
      }),
      prisma.conversation.groupBy({
        by: ['intent'],
        where: { dealer_id, direction: 'inbound', created_at: { gte: since } },
        _count: true,
      }),
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE(created_at) as day, COUNT(*)::int as count
        FROM conversations
        WHERE dealer_id = ${dealer_id}
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `,
    ]);

    res.json({
      total,
      byChannel: Object.fromEntries(byChannel.map((r: any) => [r.channel, r._count])),
      byIntent: Object.fromEntries(byIntent.map((r: any) => [r.intent ?? 'unknown', r._count])),
      byDay: byDay.map((r: any) => ({ day: r.day, count: Number(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation stats' });
  }
});

export default router;
