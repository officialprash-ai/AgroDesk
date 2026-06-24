import { Router } from 'express';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── helpers ───────────────────────────────────────────────────────────────────

/** Find a contact by phone number under a dealer. Normalise +91 prefix. */
async function findContact(dealerId: string, phone: string) {
  const normalised = phone.replace(/\D/g, '').replace(/^91/, '');
  return prisma.contact.findFirst({
    where: {
      dealer_id: dealerId,
      phone: { endsWith: normalised },
    },
  });
}

/** Quick AI label: sentiment + intent from a short text. */
async function labelMessage(text: string): Promise<{ sentiment: string; intent: string }> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `Classify this customer reply in JSON with keys "sentiment" (positive/neutral/negative) and "intent" (interested/not_interested/callback/info_request/complaint/other). Reply ONLY with JSON.\n\nMessage: "${text}"`,
      }],
    });
    const raw = (msg.content[0] as { text: string }).text.trim();
    return JSON.parse(raw);
  } catch {
    return { sentiment: 'neutral', intent: 'other' };
  }
}

// ── POST /api/webhooks/whatsapp ───────────────────────────────────────────────
// Twilio sends: From, To, Body, MessageSid, NumMedia, MediaUrl0…
router.post('/whatsapp', async (req, res) => {
  try {
    const {
      From, To, Body, MessageSid, WaId,
      NumMedia, MediaUrl0, MediaContentType0,
    } = req.body as Record<string, string>;

    // Find dealer by their Twilio WhatsApp number (To looks like whatsapp:+91XXXXXXXXXX)
    const dealerPhone = (To ?? '').replace('whatsapp:', '').replace(/\D/g, '').replace(/^91/, '');
    const dealer = await prisma.dealer.findFirst({ where: { phone: { endsWith: dealerPhone } } });
    if (!dealer) {
      console.warn('[webhook/whatsapp] No dealer found for:', To);
      return res.status(200).send('<Response/>');
    }

    // Find or note the contact
    const fromPhone = (From ?? '').replace('whatsapp:', '');
    const contact = await findContact(dealer.id, fromPhone);

    // Label sentiment + intent with AI (async, don't await for reply speed)
    const labels = await labelMessage(Body ?? '');

    // Write conversation row
    const conv = await prisma.conversation.create({
      data: {
        dealer_id: dealer.id,
        contact_id: contact?.id ?? '',   // empty if unknown sender — still store it
        channel: 'whatsapp',
        direction: 'inbound',
        content: Body ?? '',
        status: 'delivered',
        sentiment: labels.sentiment,
        intent: labels.intent,
        media_url: NumMedia && parseInt(NumMedia) > 0 ? MediaUrl0 : undefined,
        twilio_sid: MessageSid,
      },
    });

    // Update contact's last_contact + score if found
    if (contact) {
      const scoreBoost = labels.intent === 'interested' ? 15
        : labels.intent === 'callback' ? 10
        : labels.intent === 'info_request' ? 5 : 0;

      const leadStatus = labels.intent === 'interested' ? 'hot'
        : labels.intent === 'callback' ? 'warm'
        : contact.lead_status;

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          last_contact: new Date(),
          score: { increment: scoreBoost },
          lead_status: leadStatus,
        },
      });
    }

    console.log(`[webhook/whatsapp] ${labels.intent}/${labels.sentiment} from ${fromPhone} → conv ${conv.id}`);

    // Reply with empty TwiML (agent responds separately via campaign)
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response/>');
  } catch (err) {
    console.error('[webhook/whatsapp]', err);
    res.status(200).send('<Response/>'); // always 200 to Twilio
  }
});

// ── POST /api/webhooks/voice ──────────────────────────────────────────────────
// Twilio sends status callbacks: CallSid, CallStatus, From, To, Duration
router.post('/voice', async (req, res) => {
  try {
    const { CallSid, CallStatus, From, To, Duration, TranscriptionText } = req.body as Record<string, string>;

    const dealerPhone = (To ?? '').replace(/\D/g, '').replace(/^91/, '');
    const dealer = await prisma.dealer.findFirst({ where: { phone: { endsWith: dealerPhone } } });
    if (!dealer) return res.status(200).send('<Response/>');

    const contact = await findContact(dealer.id, From ?? '');

    // Map Twilio call status → our status
    const statusMap: Record<string, string> = {
      completed: 'answered', 'no-answer': 'missed',
      busy: 'missed', failed: 'failed', canceled: 'missed',
    };
    const status = statusMap[CallStatus ?? ''] ?? 'answered';

    // Only create a row for terminal statuses (completed/no-answer/busy/failed)
    const terminalStatuses = ['completed', 'no-answer', 'busy', 'failed', 'canceled'];
    if (!terminalStatuses.includes(CallStatus ?? '')) {
      return res.status(200).send('<Response/>');
    }

    const content = TranscriptionText
      ? `Call transcript: ${TranscriptionText}`
      : `Voice call — status: ${CallStatus}, duration: ${Duration ?? 0}s`;

    const labels = TranscriptionText ? await labelMessage(TranscriptionText) : { sentiment: 'neutral', intent: 'other' };

    await prisma.conversation.create({
      data: {
        dealer_id: dealer.id,
        contact_id: contact?.id ?? '',
        channel: 'voice',
        direction: 'outbound',
        content,
        status,
        sentiment: labels.sentiment,
        intent: labels.intent,
        duration_sec: Duration ? parseInt(Duration) : undefined,
        twilio_sid: CallSid,
      },
    });

    if (contact && status === 'answered') {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { last_contact: new Date(), score: { increment: 5 } },
      });
    }

    console.log(`[webhook/voice] ${CallStatus} call from ${From} → dealer ${dealer.id}`);
    res.status(200).send('<Response/>');
  } catch (err) {
    console.error('[webhook/voice]', err);
    res.status(200).send('<Response/>');
  }
});

// ── POST /api/webhooks/sms ────────────────────────────────────────────────────
router.post('/sms', async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body as Record<string, string>;

    const dealerPhone = (To ?? '').replace(/\D/g, '').replace(/^91/, '');
    const dealer = await prisma.dealer.findFirst({ where: { phone: { endsWith: dealerPhone } } });
    if (!dealer) return res.status(200).send('<Response/>');

    const contact = await findContact(dealer.id, From ?? '');
    const labels = await labelMessage(Body ?? '');

    await prisma.conversation.create({
      data: {
        dealer_id: dealer.id,
        contact_id: contact?.id ?? '',
        channel: 'sms',
        direction: 'inbound',
        content: Body ?? '',
        status: 'delivered',
        sentiment: labels.sentiment,
        intent: labels.intent,
        twilio_sid: MessageSid,
      },
    });

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { last_contact: new Date(), score: { increment: labels.intent === 'interested' ? 10 : 3 } },
      });
    }

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response/>');
  } catch (err) {
    console.error('[webhook/sms]', err);
    res.status(200).send('<Response/>');
  }
});

export default router;
