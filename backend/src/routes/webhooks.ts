import { Router } from 'express';
import { prisma as _prisma } from '../lib/prisma.js';
const prisma = _prisma as any;
import { sendWhatsApp } from '../lib/whatsapp.js';
import { handleIntake } from '../services/support/intake.js';
import { enqueueSupportNotify } from '../services/support/notify.js';
import { speechToText } from '../lib/sarvam.js';
import { uploadToS3, isS3Configured } from '../lib/s3.js';
import { randomUUID } from 'crypto';

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

// ── POST /api/webhooks/whatsapp-support ───────────────────────────────────────
// Support Intake channel. Dealers point their SUPPORT WhatsApp number's inbound
// webhook here (kept separate from /whatsapp, which runs the AI Salesman).
//
// Guarantee: the ticket is created (handleIntake) BEFORE we reply or notify. If
// the reply/notify fails, the ticket still exists. Idempotent on MessageSid
// (WhatsApp retries). Demo dealers: ticket is created, but NO real WhatsApp is
// sent (neither the customer ack nor the staff notify).
const SUPPORT_ACK_MR = 'नोंद झाली. आमचा माणूस फोन करेल.';

/** Download a Twilio media resource (requires Basic auth with the account creds). */
async function downloadTwilioMedia(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  } catch (err) {
    console.error('[webhook/whatsapp-support] media download failed:', (err as Error).message);
    return null;
  }
}

router.post('/whatsapp-support', async (req, res) => {
  try {
    const {
      From, To, Body, MessageSid, NumMedia,
    } = req.body as Record<string, string>;

    // Map the receiving business number → dealer.
    const dealerPhone = (To ?? '').replace('whatsapp:', '').replace(/\D/g, '').replace(/^91/, '');
    const dealer = await prisma.dealer.findFirst({ where: { phone: { endsWith: dealerPhone } } });
    if (!dealer) {
      console.warn('[webhook/whatsapp-support] no dealer for', To);
      return res.status(200).send('<Response/>');
    }

    const fromPhone = (From ?? '').replace('whatsapp:', '');
    const isDemo = dealer.is_demo === true;

    // Idempotency: if we've already logged this MessageSid, ack silently.
    if (MessageSid) {
      const seen = await prisma.supportRequest
        .findUnique({ where: { external_call_id: MessageSid } })
        .catch(() => null);
      if (seen) return res.status(200).send('<Response/>');
    }

    // ── Resolve the message text + media ──────────────────────
    let text = (Body ?? '').trim();
    const mediaUrls: string[] = [];
    const mediaCount = parseInt(NumMedia ?? '0', 10) || 0;

    for (let i = 0; i < mediaCount; i++) {
      const url = (req.body as Record<string, string>)[`MediaUrl${i}`];
      const ctype = (req.body as Record<string, string>)[`MediaContentType${i}`] ?? '';
      if (!url) continue;

      if (ctype.startsWith('audio/')) {
        // Voice note → Marathi transcript becomes the request text.
        const media = await downloadTwilioMedia(url);
        if (media) {
          try {
            const transcript = await speechToText(media.buffer, ctype, 'mr');
            if (transcript) text = text ? `${text}\n${transcript}` : transcript;
          } catch (err) {
            console.error('[webhook/whatsapp-support] STT failed:', (err as Error).message);
          }
        }
      } else if (ctype.startsWith('image/')) {
        // Photo → store to S3 (ap-south-1) if configured, else keep the Twilio URL.
        if (isS3Configured()) {
          const media = await downloadTwilioMedia(url);
          if (media) {
            const ext = ctype.split('/')[1] || 'jpg';
            const key = `support/${dealer.id}/${randomUUID()}.${ext}`;
            try {
              const s3url = await uploadToS3(media.buffer, key, ctype);
              mediaUrls.push(s3url);
            } catch (err) {
              console.error('[webhook/whatsapp-support] S3 upload failed:', (err as Error).message);
              mediaUrls.push(url);
            }
          }
        } else {
          mediaUrls.push(url);
        }
      } else {
        mediaUrls.push(url);
      }
    }

    if (!text && mediaUrls.length === 0) {
      // Nothing to log.
      return res.status(200).send('<Response/>');
    }

    // ── Ticket first, ALWAYS ──────────────────────────────────
    const ticket = await handleIntake({
      dealerId: dealer.id,
      phone: fromPhone,
      text: text || '(फक्त फोटो पाठवला)',
      channel: 'WHATSAPP',
      mediaUrls,
      externalCallId: MessageSid,
      isDemo,
    });

    // ── Reply to the customer (skip for demo) ─────────────────
    res.setHeader('Content-Type', 'text/xml');
    if (isDemo) {
      res.status(200).send('<Response/>');
    } else {
      // Inline TwiML reply — no extra API round-trip, stays inside the window.
      res.status(200).send(`<Response><Message>${SUPPORT_ACK_MR}</Message></Response>`);
    }

    // ── Notify staff AFTER the ticket exists (skip for demo) ───
    if (!isDemo) {
      enqueueSupportNotify(dealer.id, ticket.id).catch((err) =>
        console.error('[webhook/whatsapp-support] notify enqueue error:', err),
      );
    }

    console.log(`[webhook/whatsapp-support] ${ticket.type} ticket ${ticket.id} from ${fromPhone}${isDemo ? ' (demo — no sends)' : ''}`);
    return;
  } catch (err) {
    console.error('[webhook/whatsapp-support]', err);
    return res.status(200).send('<Response/>'); // always 200 to Twilio
  }
});

export default router;
