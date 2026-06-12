import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/documents?dealer_id=&period_month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const { dealer_id, period_month } = req.query as Record<string, string>;
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });

    const where: any = { dealer_id };
    if (period_month) where.period_month = period_month;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    res.json({ documents, total: documents.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents  (create doc record — used by frontend upload wizard)
router.post('/', async (req, res) => {
  try {
    const { dealer_id, category, period_month, filename, file_url } = z.object({
      dealer_id: z.string(),
      category: z.string(),
      period_month: z.string(),
      filename: z.string().optional(),
      file_url: z.string().optional(),
    }).parse(req.body);

    const doc = await prisma.document.create({
      data: {
        dealer_id,
        category,
        period_month,
        filename: filename ?? null,
        file_url: file_url ?? null,
        uploaded_at: new Date(),
      },
    });
    res.status(201).json({ document: doc, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create document record' });
  }
});

// POST /api/documents/upload (alias, kept for compatibility)
router.post('/upload', async (req, res) => {
  try {
    const { dealer_id, category, period_month, filename, file_url } = z.object({
      dealer_id: z.string(),
      category: z.string(),
      period_month: z.string(), // "2024-01"
      filename: z.string().optional(),
      file_url: z.string().optional(), // S3 URL after upload
    }).parse(req.body);

    const doc = await prisma.document.create({
      data: {
        dealer_id,
        category,
        period_month,
        filename: filename ?? null,
        file_url: file_url ?? null,
        uploaded_at: new Date(),
      },
    });
    res.status(201).json({ document: doc, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create document record' });
  }
});

// PATCH /api/documents/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { confirmed: true },
    });
    res.json({ document: doc, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm document' });
  }
});

// POST /api/documents/send-to-accountant
router.post('/send-to-accountant', async (req, res) => {
  try {
    const { dealer_id, accountant_id, period_month } = z.object({
      dealer_id: z.string(),
      accountant_id: z.string(),
      period_month: z.string(),
    }).parse(req.body);

    const [accountant, documents] = await Promise.all([
      prisma.accountant.findUnique({ where: { id: accountant_id } }),
      prisma.document.findMany({ where: { dealer_id, period_month } }),
    ]);

    if (!accountant) return res.status(404).json({ error: 'Accountant not found' });

    // TODO: send via WhatsApp BSP or email
    // For now, create a job
    await prisma.agentJob.create({
      data: {
        dealer_id,
        agent_type: 'send_to_accountant',
        payload: { accountant_id, period_month, document_ids: documents.map((d: { id: string }) => d.id) },
        idempotency_key: `accountant-${dealer_id}-${period_month}-${accountant_id}`,
      },
    });

    res.json({ success: true, sent: documents.length, to: accountant.name });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to queue document send' });
  }
});

// POST /api/documents/accountants
router.post('/accountants', async (req, res) => {
  try {
    const { dealer_id, name, phone, email, tally_enabled, is_default } = z.object({
      dealer_id: z.string(),
      name: z.string(),
      phone: z.string(),
      email: z.string(),
      tally_enabled: z.boolean().default(false),
      is_default: z.boolean().default(false),
    }).parse(req.body);

    // If setting as default, clear existing default first
    if (is_default) {
      await prisma.accountant.updateMany({ where: { dealer_id }, data: { is_default: false } });
    }

    const accountant = await prisma.accountant.create({
      data: { dealer_id, name, phone, email, tally_enabled, is_default },
    });
    res.status(201).json({ accountant, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create accountant' });
  }
});

// GET /api/documents/accountants?dealer_id=
router.get('/accountants', async (req, res) => {
  try {
    const { dealer_id } = req.query as { dealer_id: string };
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });
    const accountants = await prisma.accountant.findMany({ where: { dealer_id } });
    res.json({ accountants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accountants' });
  }
});

export default router;
