import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './lib/prisma.js';

import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import recoveryRouter from './routes/recovery.js';
import tractorsRouter from './routes/tractors.js';
import dashboardRouter from './routes/dashboard.js';
import documentsRouter from './routes/documents.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frontend-sepia-five-70.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HEALTH ─────────────────────────────────────────────────
app.get('/api/health', async (_, res) => {
  let db = 'ok';
  try { await prisma.$queryRaw`SELECT 1`; } catch { db = 'error'; }
  res.json({ status: 'ok', service: 'AgroDesk API', version: '1.0.0', db, timestamp: new Date() });
});

// ─── AUTH (public) ──────────────────────────────────────────
app.use('/api/auth', authRouter);

// ─── DOMAIN ROUTES (protected) ──────────────────────────────
app.use('/api/contacts', authMiddleware, contactsRouter);
app.use('/api/campaigns', authMiddleware, campaignsRouter);
app.use('/api/recovery', authMiddleware, recoveryRouter);
app.use('/api/tractors', authMiddleware, tractorsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/documents', authMiddleware, documentsRouter);

// ─── AI — SCRIPT GENERATOR (protected) ─────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/ai/script', authMiddleware, async (req, res) => {
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
app.post('/api/ai/listing', authMiddleware, async (req, res) => {
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

    // Persist to DB if tractor_id provided
    if (tractor.id) {
      await prisma.usedTractor.update({
        where: { id: tractor.id },
        data: { ai_description: description, updated_at: new Date() },
      }).catch(() => {}); // non-fatal
    }

    res.json({ description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate listing' });
  }
});

// ─── AI — INBOUND SALESMAN ──────────────────────────────────
app.post('/api/ai/respond', authMiddleware, async (req, res) => {
  const { message, history, context, language } = req.body;
  const langNames: Record<string, string> = { mr: 'Marathi', hi: 'Hindi', en: 'English' };
  const langName = langNames[language || 'mr'] || 'Marathi';

  const systemPrompt = `You are AgroDesk AI Salesman for a tractor dealership in Maharashtra, India.
You help farmers with tractor enquiries, pricing, EMI information, and booking visits.
Respond in ${langName}. Be helpful, warm, and knowledgeable about tractors and farm equipment.
Keep responses concise (2-4 sentences). Use Indian currency (₹).
Never make up prices — say you'll check and confirm.
Scope: tractor sales only. Escalate complex legal/financial questions to human agent.`;

  try {
    const messages = [
      ...(history || []).map((h: { role: string; content: string }) => ({
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
    res.json({ reply, language });
  } catch (err) {
    res.status(500).json({ error: 'AI response failed' });
  }
});

// ─── AGENT JOBS ──────────────────────────────────────────────
app.post('/api/jobs', async (req, res) => {
  try {
    const { dealer_id, agent_type, payload, scheduled_for } = req.body;
    const job = await prisma.agentJob.create({
      data: {
        dealer_id,
        agent_type,
        payload: payload || {},
        scheduled_for: scheduled_for ? new Date(scheduled_for) : new Date(),
        idempotency_key: `job-${dealer_id}-${agent_type}-${Date.now()}`,
      },
    });
    res.json({ job, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const { dealer_id, status, agent_type } = req.query as Record<string, string>;
    if (!dealer_id) return res.status(400).json({ error: 'dealer_id required' });
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

// ─── WEBHOOKS ────────────────────────────────────────────────
app.post('/webhooks/exotel/call-status', async (req, res) => {
  const { CallSid, Status, Direction, From, To, RecordingUrl } = req.body;
  console.log('Exotel webhook:', { CallSid, Status, Direction, From, To });

  try {
    // Update the matching agent job
    await prisma.agentJob.updateMany({
      where: { payload: { path: ['call_sid'], equals: CallSid } },
      data: {
        status: Status === 'completed' ? 'completed' : Status === 'failed' ? 'failed' : 'pending',
        completed_at: Status === 'completed' ? new Date() : undefined,
      },
    });
  } catch (err) {
    console.error('Exotel webhook error:', err);
  }
  res.sendStatus(200);
});

app.post('/webhooks/whatsapp', async (req, res) => {
  const { entry } = req.body;
  console.log('WhatsApp webhook:', JSON.stringify(entry, null, 2));
  // Route to AI Salesman agent — TODO: implement inbound routing
  res.sendStatus(200);
});

// ─── ERROR HANDLER ───────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── GRACEFUL SHUTDOWN ───────────────────────────────────────
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on