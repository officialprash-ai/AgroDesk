import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { authMiddleware } from './middleware/auth.js';
import { demoGuard } from './middleware/demoGuard.js';
import { resetDemoData, DEMO_PHONE, DEMO_PASSWORD } from './lib/demoSeed.js';

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
// demoGuard runs after auth: for demo accounts it simulates real-outbound
// and destructive actions instead of executing them.
app.use('/api/contacts', authMiddleware, demoGuard, contactsRouter);
app.use('/api/campaigns', authMiddleware, demoGuard, campaignsRouter);
app.use('/api/recovery', authMiddleware, demoGuard, recoveryRouter);
app.use('/api/tractors', authMiddleware, demoGuard, tractorsRouter);
app.use('/api/dashboard', authMiddleware, demoGuard, dashboardRouter);
app.use('/api/documents', authMiddleware, demoGuard, documentsRouter);
app.use('/api/conversations', authMiddleware, conversationsRouter);

// ─── TWILIO WEBHOOKS (public — Twilio calls these, no JWT) ───
// Verify in prod with Twilio signature validation middleware
app.use('/api/webhooks', webhooksRouter);

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

// ─── AI — INBOUND SALESMAN (context-aware) ──────────────────
app.post('/api/ai/respond', authMiddleware, async (req, res) => {
  const { message, history, context, language, contact_id, dealer_id } = req.body;
  const langNames: Record<string, string> = { mr: 'Marathi', hi: 'Hindi', en: 'English' };
  const langName = langNames[language || 'mr'] || 'Marathi';

  // Fetch cross-channel history for this contact so the AI has full context
  let contactHistory = '';
  if (contact_id && dealer_id) {
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
If the customer has interacted before (see history below), acknowledge continuity naturally — don't repeat what was already discussed.${contactHistory}`;

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

    // Persist this exchange to conversations table
    if (contact_id && dealer_id) {
      await prisma.conversation.create({
        data: {
          dealer_id, contact_id,
          channel: 'whatsapp', direction: 'inbound',
          content: message, status: 'delivered',
        },
      }).catch(() => {});
      await prisma.conversation.create({
        data: {
          dealer_id, contact_id,
          channel: 'whatsapp', direction: 'outbound',
          content: reply, status: 'sent',
        },
      }).catch(() => {});
    }

    res.json({ reply, language });
  } catch (err) {
    res.status(500).json({ error: 'AI response failed' });
  }
});

// ─── AGENT JOBS ──────────────────────────────────────────────
app.post('/api/jobs', async (req, res) => {
  try {
    const { dealer_id, agent_type, payload, scheduled_for } = req.body;

    // Demo accounts never queue real agent jobs (which would place calls /
    // send messages). Return a simulated success so the UI flows normally.
    if (dealer_id) {
      const dealer = await prisma.dealer.findUnique({ where: { id: dealer_id }, select: { is_demo: true } });
      if (dealer?.is_demo) {
        return res.json({ success: true, demo: true, simulated: true, message: 'Demo mode: agent job simulated — no real calls or messages were sent.' });
      }
    }

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