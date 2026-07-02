import * as Sentry from '@sentry/node';

// Sentry MUST be initialised before any other imports touch the network/DB
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,   // 10 % of requests — keep cost low
    integrations: [Sentry.httpIntegration()],
  });
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { prisma as _prisma } from './lib/prisma.js';
const prisma = _prisma as any;

import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import recoveryRouter from './routes/recovery.js';
import tractorsRouter from './routes/tractors.js';
import dashboardRouter from './routes/dashboard.js';
import documentsRouter from './routes/documents.js';
import authRouter from './routes/auth.js';
import webhooksRouter from './routes/webhooks.js';
import conversationsRouter from './routes/conversations.js';
import onboardingRouter from './routes/onboarding.js';
import { authMiddleware } from './middleware/auth.js';
import type { AuthRequest } from './middleware/auth.js';
import { demoGuard } from './middleware/demoGuard.js';
import { resetDemoData } from './lib/demoSeed.js';
import { enqueueJob } from './lib/queue.js';
import { getAudio } from './lib/audioStore.js';
import { buildExoML } from './lib/exotel.js';

// ─── ENV VALIDATION (fail fast) ─────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'ANTHROPIC_API_KEY'] as const;
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required env vars: ${missing.join(', ')}. Refusing to start.`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
// Allow any *.vercel.app subdomain (covers preview + prod deployments)
const VERCEL_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || VERCEL_RE.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── RATE LIMITING ───────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 login/register attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10, // 10 AI calls per min per IP — protects Anthropic spend
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached, please wait a moment.' },
});

app.use(globalLimiter);

// ─── WEBHOOK SIGNATURE VALIDATION ───────────────────────────
/**
 * Twilio signature validation middleware.
 * Twilio signs every request with HMAC-SHA1 over (url + sorted params).
 * Docs: https://www.twilio.com/docs/usage/security#validating-signatures
 */
function twilioWebhookAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // If no token configured, skip validation (dev mode) but log a warning
    console.warn('[webhook] TWILIO_AUTH_TOKEN not set — skipping signature validation');
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    return res.status(403).json({ error: 'Missing Twilio signature' });
  }

  // Reconstruct the URL Twilio used
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  const url = `${proto}://${req.headers.host}${req.originalUrl}`;

  // Build the string to sign: url + sorted POST params concatenated
  const params: Record<string, string> = req.body ?? {};
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map(k => `${k}${params[k]}`).join('');
  const toSign = url + paramString;

  const expectedSig = crypto
    .createHmac('sha1', authToken)
    .update(toSign, 'utf8')
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(expectedSig))) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }

  next();
}

/**
 * Exotel webhook token validation.
 * Exotel passes a configurable token as a query param: ?token=<EXOTEL_WEBHOOK_TOKEN>
 */
function exotelWebhookAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expectedToken = process.env.EXOTEL_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.warn('[webhook/exotel] EXOTEL_WEBHOOK_TOKEN not set — skipping validation');
    return next();
  }
  const providedToken = req.query.token as string;
  if (!providedToken || providedToken !== expectedToken) {
    return res.status(403).json({ error: 'Invalid webhook token' });
  }
  next();
}

// ─── HEALTH ─────────────────────────────────────────────────
app.get('/api/health', async (_, res) => {
  let db = 'ok';
  try { await prisma.$queryRaw`SELECT 1`; } catch { db = 'error'; }
  res.json({ status: 'ok', service: 'AgroDesk API', version: '1.0.0', db, timestamp: new Date() });
});

// ─── AUTH (public, stricter rate limit) ─────────────────────
app.use('/api/auth', authLimiter, authRouter);

// ─── DOMAIN ROUTES (protected) ──────────────────────────────
app.use('/api/contacts', authMiddleware, demoGuard, contactsRouter);
app.use('/api/campaigns', authMiddleware, demoGuard, campaignsRouter);
app.use('/api/recovery', authMiddleware, demoGuard, recoveryRouter);
app.use('/api/tractors', authMiddleware, demoGuard, tractorsRouter);
app.use('/api/dashboard', authMiddleware, demoGuard, dashboardRouter);
app.use('/api/documents', authMiddleware, demoGuard, documentsRouter);
app.use('/api/conversations', authMiddleware, conversationsRouter);
app.use('/api/onboarding', authMiddleware, onboardingRouter);

// ─── WEBHOOKS (Twilio-signed, no JWT) ───────────────────────
app.use('/api/webhooks', twilioWebhookAuth, webhooksRouter);

// ─── AI — SCRIPT GENERATOR (protected) ─────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30_000, // fail after 30s instead of the SDK's 10-min default (prevents "spins forever")
  maxRetries: 1,
});

app.post('/api/ai/script', authMiddleware, aiLimiter, async (req, res) => {
  const { type, language, context } = req.body;

  const langNames: Record<string, string> = {
    mr: 'Marathi', hi: 'Hindi', en: 'English', gu: 'Gujarati',
    pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali',
  };
  const scriptTypes: Record<string, string> = {
    cold_call_new: 'cold call script to sell a new tractor to a farmer',
    cold_call_used: 'cold call script to sell a used/second-hand tractor',
    follow_up: 'follow-up call script for a warm lead who has shown interest',
    recovery_gentle: 'gentle payment recovery reminder (first reminder, friendly tone)',
    recovery_firm: 'firm payment recovery call (overdue by 30 days, professional but firm)',
    recovery_legal: 'stern legal-notice-tone recovery call (overdue 60+ days)',
    whatsapp_intro: 'WhatsApp introduction message template for new potential customer',
    whatsapp_offer: 'WhatsApp promotional message about tractor offer or discount',
    inbound_response: 'response script for handling an inbound enquiry about tractors',
  };

  const langName = langNames[language] || 'Marathi';
  const scriptDesc = scriptTypes[type] || 'calling script';

  const prompt = `You are an expert sales script writer for Indian tractor dealerships in Maharashtra.
Write a ${scriptDesc} in ${langName} language.

Requirements:
- Use natural, conversational ${langName} as spoken in rural Maharashtra/India
- If Marathi: use standard written Marathi (not overly formal, not slang)
- Include appropriate pauses marked with [रुका] or [pause]
- Include branching cues like [अगर हाँ] or [if yes]
- Keep it 150-250 words
- Start with a greeting appropriate for the region
- End with a clear call-to-action
- Include dealer name placeholder as [डीलरशिप का नाम] / [Dealership Name]
- Include customer name placeholder as [ग्राहक का नाम] / [Customer Name]

Context: ${JSON.stringify(context || {})}

Return ONLY the script text, no explanation, no markdown.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const script = message.content[0].type === 'text' ? message.content[0].text : '';
    res.json({ script, type, language, generated_at: new Date() });
  } catch (err) {
    console.error('AI script error:', err);
    res.status(500).json({ error: 'Failed to generate script' });
  }
});

// ─── AI — LISTING DESCRIPTION ───────────────────────────────
app.post('/api/ai/listing', authMiddleware, aiLimiter, async (req, res) => {
  const { tractor } = req.body;
  const prompt = `Write a compelling used tractor listing description for an Indian tractor marketplace.

Tractor details:
- Make: ${tractor.make}
- Model: ${tractor.model}
- Year: ${tractor.year}
- Hours used: ${tractor.hours}
- Condition: ${tractor.condition}
- Asking price: ₹${(tractor.asking_price / 100000).toFixed(1)} Lakh

Requirements:
- 60-80 words
- Highlight key selling points
- Mention price competitively
- Include condition honestly
- End with urgency (limited offer, call now etc)
- Write in English but can include Indian terms
- No markdown, just plain text`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const description = message.content[0].type === 'text' ? message.content[0].text : '';

    if (tractor.id) {
      await prisma.usedTractor.update({
        where: { id: tractor.id },
        data: { ai_description: description, updated_at: new Date() },
      }).catch(() => {});
    }

    res.json({ description });
  } catch (err) {
    console.error('AI listing error:', err);
    res.status(500).json({
      error: 'Failed to generate listing',
      detail: process.env.NODE_ENV === 'development' ? String((err as Error)?.message ?? err) : undefined,
    });
  }
});

// ─── AI — INBOUND SALESMAN ───────────────────────────────────
app.post('/api/ai/respond', authMiddleware, aiLimiter, async (req, res) => {
  const dealer_id = (req as AuthRequest).dealer_id!;
  const { message, history, context, language, contact_id } = req.body;
  const langNames: Record<string, string> = { mr: 'Marathi', hi: 'Hindi', en: 'English' };
  const langName = langNames[language || 'mr'] || 'Marathi';

  let contactHistory = '';
  if (contact_id) {
    try {
      const pastConvs = await prisma.conversation.findMany({
        where: { contact_id, dealer_id },
        orderBy: { created_at: 'desc' },
        take: 10,
      });
      if (pastConvs.length > 0) {
        contactHistory = '\n\nPrevious interactions with this customer (most recent first):\n' +
          pastConvs.map((c: any) => {
            const who = c.direction === 'inbound' ? 'Customer' : 'Agent';
            const when = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            return `[${when} · ${c.channel.toUpperCase()} · ${who}]: ${c.content}`;
          }).join('\n');
      }
    } catch (e) { /* non-fatal */ }
  }

  const systemPrompt = `You are AgroDesk AI Salesman for a tractor dealership in Maharashtra, India.
You help farmers with tractor enquiries, pricing, EMI information, and booking visits.
Respond in ${langName}. Be helpful, warm, and knowledgeable about tractors and farm equipment.
Keep responses concise (2-4 sentences). Use Indian currency (₹).
Never make up prices — say you'll check and confirm.
Scope: tractor sales only. Escalate complex legal/financial questions to human agent.
If the customer has interacted before (see history below), acknowledge continuity naturally.${contactHistory}`;

  try {
    const messages = [
      ...(history || []).map((h: { role: string; content: string }): { role: 'user' | 'assistant'; content: string } => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';

    if (contact_id) {
      await prisma.conversation.create({
        data: { dealer_id, contact_id, channel: 'whatsapp', direction: 'inbound', content: message, status: 'delivered' },
      }).catch(() => {});
      await prisma.conversation.create({
        data: { dealer_id, contact_id, channel: 'whatsapp', direction: 'outbound', content: reply, status: 'sent' },
      }).catch(() => {});
    }

    res.json({ reply, language });
  } catch (err) {
    console.error('AI respond error:', err);
    res.status(500).json({
      error: 'AI response failed',
      detail: process.env.NODE_ENV === 'development' ? String((err as Error)?.message ?? err) : undefined,
    });
  }
});

// ─── AUDIO + EXOML (public — called by Exotel during a call) ─
app.get('/api/audio/:id', (req, res) => {
  const entry = getAudio(req.params.id);
  if (!entry) return res.status(404).send('Audio not found or expired');
  res.setHeader('Content-Type', entry.contentType);
  res.setHeader('Content-Length', entry.buffer.length);
  res.send(entry.buffer);
});

app.get('/api/exoml/:id', (req, res) => {
  const audioUrl = `${(process.env.BACKEND_URL ?? '').replace(/\/$/, '')}/api/audio/${req.params.id}`;
  res.setHeader('Content-Type', 'text/xml');
  res.send(buildExoML(audioUrl));
});

// ─── AGENT JOBS (protected) ──────────────────────────────────
app.post('/api/jobs', authMiddleware, demoGuard, async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { agent_type, payload, scheduled_for } = req.body;

    const scheduledAt = scheduled_for ? new Date(scheduled_for) : new Date();

    const job = await prisma.agentJob.create({
      data: {
        dealer_id,
        agent_type,
        payload: payload || {},
        scheduled_for: scheduledAt,
        idempotency_key: `job-${dealer_id}-${agent_type}-${Date.now()}`,
      },
    });

    // Push to Bull queue — delay if scheduled in the future
    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
    await enqueueJob(
      { db_job_id: job.id, dealer_id, agent_type, payload: payload || {} },
      delayMs,
    ).catch(err => console.error('[jobs] Failed to enqueue job:', err));
    // Non-fatal: job is in DB and will be picked up on worker restart

    res.json({ job, success: true });
  } catch (err) {
    console.error('[jobs/create] error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.get('/api/jobs', authMiddleware, async (req, res) => {
  try {
    const dealer_id = (req as AuthRequest).dealer_id!;
    const { status, agent_type } = req.query as Record<string, string>;
    const where: any = { dealer_id };
    if (status) where.status = status;
    if (agent_type) where.agent_type = agent_type;
    const jobs = await prisma.agentJob.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ─── EXOTEL WEBHOOK (token-authenticated) ───────────────────
app.post('/webhooks/exotel/call-status', exotelWebhookAuth, async (req, res) => {
  const { CallSid, Status } = req.body;
  console.log('Exotel webhook:', { CallSid, Status });

  try {
    const newStatus = Status === 'completed' ? 'completed' : Status === 'failed' ? 'failed' : 'pending';
    await prisma.agentJob.updateMany({
      where: { idempotency_key: { contains: CallSid } },
      data: { status: newStatus, completed_at: newStatus === 'completed' ? new Date() : undefined },
    });
  } catch (err) {
    console.error('Exotel webhook error:', err);
  }
  res.sendStatus(200);
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────
// Sentry must capture the error before we send a response
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AgroDesk API running on port ${PORT}`);
});

export default app;
