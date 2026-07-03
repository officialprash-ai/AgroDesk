import { Router } from 'express';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import { sendWhatsApp } from '../lib/whatsapp.js';

const router = Router();
import { geminiText } from '../lib/llm.js';

const LANG_NAMES: Record<string, string> = { mr: 'Marathi', hi: 'Hindi', en: 'English', gu: 'Gujarati', pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali' };

/**
 * Generate and send the AI Salesman's auto-reply for an inbound WhatsApp message.
 * This is what actually closes the loop for Module E — previously inbound messages
 * were logged/labelled but the customer never got a reply.
 */
async function autoRespondWhatsApp(dealerId: string, contactId: string | null, fromPhone: string, inboundText: string, language: string) {
  try {
    let history = '';
    if (contactId) {
      const past = await prisma.conversation.findMany({
        where: { contact_id: contactId, dealer_id: dealerId },
        orderBy: { created_at: 'desc' },
        take: 10,
      });
      if (past.length > 0) {
        history = '\n\nPrevious interactions with this customer (most recent first):\n' +
          past.map((c: any) => `[${c.channel.toUpperCase()} · ${c.direction === 'inbound' ? 'Customer' : 'Agent'}]: ${c.content}`).join('\n');
      }
    }

    const langName = LANG_NAMES[language] ?? 'Marathi';
    const systemPrompt = `You are AgroDesk AI Salesman for a tractor dealership in Maharashtra, India.
You help farmers with tractor enquiries, pricing, EMI information, and booking visits.
Respond in ${langName}. Be helpful, warm, and knowledgeable about tractors and farm equipment.
Keep responses concise (2-4 sentences). Use Indian currency (₹).
Never make up prices — say you'll check and confirm.
Scope: tractor sales only. Escalate complex legal/financial questions to human agent.${history}`;

    const reply = await geminiText({ system: systemPrompt, messages: [{ role: 'user', content: inboundText }], maxTokens: 400 });
    if (!reply) return;

    const { sid } = await sendWhatsApp(fromPhone, reply);

    await prisma.conversation.create({
      data: {
        dealer_id: dealerId,
        contact_id: contactId ?? '',
        channel: 'whatsapp',
        direction: 'outbound',
        content: reply,
        status: 'sent',
        twilio_sid: sid,
      },
    }).catch(() => {/* non-fatal */});

    if (contactId) {
      await prisma.contact.update({ where: { id: contactId }, data: { last_contact: new Date() } }).catch(() => {});
    }
  } catch (err) {
    // Non-fatal: the inbound message is already logged even if the auto-reply fails
    // (e.g. WhatsApp/Twilio credentials not configured yet).
    console.error('[webhook/whatsapp] auto-reply failed:', (err as Error).message);
  }
}

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
    const raw = await geminiText({ messages: [{ role: 'user', content: `Classify this customer reply in JSON with keys "sentiment" (positive/neutral/negative) and "intent" (interested/not_interested/callback/info_request/complaint/other). Reply ONLY with JSON.\n\nMessage: "${text}"` }], maxTokens: 60 });
    return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, ''));
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

    // Respond to Twilio immediately so the webhook doesn't time out, then fire the
    // AI Salesman auto-reply in the background. Escalated/complaint intents still get
    // an acknowledgement but a human should follow up — the dashboard flags these.
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response/>');

    autoRespondWhatsApp(dealer.id, contact?.id ?? null, fromPhone, Body ?? '', contact?.language ?? dealer.language ?? 'mr')
      .catch(err => console.error('[webhook/whatsapp] auto-respond error:', err));
    return;
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
