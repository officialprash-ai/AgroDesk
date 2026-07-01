import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { enqueueJob } from '../lib/queue.js';
import { isS3Configured, uploadToS3 } from '../lib/s3.js';
import { extractBillData } from '../lib/ocr.js';
import { buildTallyXml } from '../lib/tally.js';

const router = Router();

// Express default JSON body limit is fine for typical bill photos once compressed
// client-side, but bump this route's effective limit via a larger base64 payload
// check (documents.ts inherits the 10mb app-level express.json() limit).
const MAX_BASE64_BYTES = 8 * 1024 * 1024; // ~8MB decoded

// GET /api/documents?period_month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { period_month } = req.query as Record<string, string>;

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

// POST /api/documents
router.post('/', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { category, period_month, filename, file_url } = z.object({
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

// POST /api/documents/upload — real file upload with OCR extraction
//
// Body: { category, period_month, filename, file_base64 (no data: prefix), mime_type }
// Uploads to S3 if configured (AWS_ACCESS_KEY/AWS_SECRET_KEY/AWS_BUCKET), otherwise
// stores the file inline as a data: URL — works either way, S3 is just for scale.
// Runs OCR via Anthropic vision and saves structured fields on the Document row.
router.post('/upload', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { category, period_month, filename, file_base64, mime_type } = z.object({
      category: z.string(),
      period_month: z.string(),
      filename: z.string().optional(),
      file_base64: z.string().optional(),
      mime_type: z.string().optional(),
    }).parse(req.body);

    let file_url: string | null = null;
    let ocr_data: any = null;

    if (file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      if (buffer.byteLength > MAX_BASE64_BYTES) {
        return res.status(413).json({ error: 'File too large (max ~8MB)' });
      }
      const contentType = mime_type ?? 'application/octet-stream';

      if (isS3Configured()) {
        const key = `dealers/${dealer_id}/${period_month}/${category}-${randomUUID()}`;
        file_url = await uploadToS3(buffer, key, contentType);
      } else {
        // Dev/no-S3 fallback: store inline. Fine for MVP volumes (a handful of bills/month).
        file_url = `data:${contentType};base64,${file_base64}`;
      }

      // OCR — only meaningful for images/PDFs
      if (contentType.startsWith('image/') || contentType === 'application/pdf') {
        ocr_data = await extractBillData(file_base64, contentType);
      }
    }

    const doc = await prisma.document.create({
      data: {
        dealer_id,
        category,
        period_month,
        filename: filename ?? null,
        file_url,
        ocr_data,
        uploaded_at: new Date(),
      },
    });
    res.status(201).json({ document: doc, success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('[documents/upload] error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/documents/tally-export?period_month=YYYY-MM
// Generates a Tally-importable XML file from this period's confirmed documents.
// Real Tally XML/ODBC server integration needs the dealer's desktop Tally instance
// reachable, which isn't available here — this produces the same XML a live
// integration would push, for the dealer (or their accountant) to import manually
// via Tally's Gateway of Tally > Import Data > XML.
router.get('/tally-export', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { period_month } = req.query as Record<string, string>;
    if (!period_month) return res.status(400).json({ error: 'period_month is required' });

    const documents = await prisma.document.findMany({
      where: { dealer_id, period_month, confirmed: true },
    });
    if (documents.length === 0) {
      return res.status(404).json({ error: 'No confirmed documents found for this period' });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id } });
    const xml = buildTallyXml(dealer?.name ?? 'AgroDesk Dealer', period_month, documents);

    await prisma.document.updateMany({
      where: { id: { in: documents.map((d: { id: string }) => d.id) } },
      data: { tally_synced: true },
    });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="agrodesk-tally-${period_month}.xml"`);
    res.send(xml);
  } catch (err) {
    console.error('[documents/tally-export] error:', err);
    res.status(500).json({ error: 'Failed to generate Tally export' });
  }
});

// PATCH /api/documents/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { confirmed: true },
    });
    res.json({ document: doc, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.dealer_id !== dealer_id) return res.status(404).json({ error: 'Not found' });
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/send-to-accountant
router.post('/send-to-accountant', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { accountant_id, period_month } = z.object({
      accountant_id: z.string(),
      period_month: z.string(),
    }).parse(req.body);

    const [accountant, documents] = await Promise.all([
      prisma.accountant.findUnique({ where: { id: accountant_id } }),
      prisma.document.findMany({ where: { dealer_id, period_month } }),
    ]);

    if (!accountant || accountant.dealer_id !== dealer_id) return res.status(404).json({ error: 'Accountant not found' });

    const job = await prisma.agentJob.create({
      data: {
        dealer_id,
        agent_type: 'send_to_accountant',
        payload: { accountant_id, period_month, document_ids: documents.map((d: { id: string }) => d.id) },
        idempotency_key: `accountant-${dealer_id}-${period_month}-${accountant_id}-${Date.now()}`,
      },
    });
    // Push to the Bull queue so the worker actually notifies the accountant —
    // without this the job row was previously inert (never dispatched).
    await enqueueJob({
      db_job_id: job.id,
      dealer_id,
      agent_type: 'send_to_accountant',
      payload: { accountant_id, period_month, document_ids: documents.map((d: { id: string }) => d.id) },
    }).catch(err => console.error('[documents/send-to-accountant] Failed to enqueue job:', err));

    res.json({ success: true, sent: documents.length, to: accountant.name });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to queue document send' });
  }
});

// POST /api/documents/accountants
router.post('/accountants', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { name, phone, email, tally_enabled, is_default } = z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string(),
      tally_enabled: z.boolean().default(false),
      is_default: z.boolean().default(false),
    }).parse(req.body);

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

// GET /api/documents/accountants
router.get('/accountants', async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const accountants = await prisma.accountant.findMany({ where: { dealer_id } });
    res.json({ accountants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accountants' });
  }
});

export default router;
