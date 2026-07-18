/**
 * AgroDesk Agent Worker
 *
 * Run alongside the API server:
 *   npm run worker
 *
 * Processes jobs from the Bull queue and:
 *  - Places Exotel outbound calls (with Sarvam Marathi TTS audio)
 *  - Sends Twilio WhatsApp messages
 *  - Enforces TRAI quiet hours (9 AM – 9 PM IST)
 *  - Checks opt-in consent flags before sending
 *  - Updates AgentJob status in Postgres on success / failure
 */

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,   // worker: no HTTP traces, just error capture
  });
}

import { Job } from 'bull';
import { randomUUID } from 'crypto';

import { agentQueue, deferJob, QueueJobData } from './lib/queue.js';
import { isQuietHours, msUntilAllowedWindow, QUIET_HOURS_GATED_TYPES } from './lib/quietHours.js';
import { supportCopy } from './lib/supportStrings.js';
import { prisma as _prisma } from './lib/prisma.js';
const prisma = _prisma as any;

import { textToSpeech } from './lib/sarvam.js';
import { placeCall, buildExoML } from './lib/exotel.js';
import { getTelephonyProvider, TELEPHONY_PROVIDER } from './telephony/index.js';
import { geminiText } from './lib/llm.js';
import { sendWhatsApp, sendWhatsAppTemplate } from './lib/whatsapp.js';
import { sendSMS, DLTTemplateKey } from './lib/sms.js';
import { storeAudio } from './lib/audioStore.js';
import { consumeQuota } from './lib/usageLimits.js';

// ─── Consent logging ─────────────────────────────────────────

/**
 * Record the consent basis for each outbound message in the Consent table.
 * Required by DPDP Act 2023: you must be able to prove the legal basis for
 * every contact attempt.
 */
async function logConsent(
  dealerId: string,
  contactId: string,
  channel: string,
  source: string,
) {
  await prisma.consent.upsert({
    where: {
      // Unique per dealer+contact+channel — update opt_in_at on re-consent
      // If your schema doesn't have this unique constraint, use create instead
      id: `${contactId}-${channel}`,
    },
    update: { opt_in_at: new Date(), opt_out_at: null, source },
    create: {
      dealer_id: dealerId,
      contact_id: contactId,
      channel,
      opt_in_at: new Date(),
      source,
    },
  }).catch(() => {/* non-fatal — log but don't block the send */});
}

// ─── Compliance helpers ──────────────────────────────────────

/**
 * TRAI quiet-hours handling now lives in lib/quietHours.ts and is applied at
 * ENQUEUE time (see lib/queue.ts). The worker only re-checks as a safety net
 * for jobs that were queued before this fix, or that sat in Redis across the
 * 9 PM boundary.
 *
 * The old approach slept up to 30 minutes and then threw so Bull would retry.
 * That could never work: Bull is configured for 3 attempts with 1m/2m/4m
 * backoff (~7 minutes of coverage) against a 12-hour quiet window, so every
 * evening-queued call was silently discarded after exhausting its attempts —
 * while each sleeping job also occupied one of the 5 concurrency slots.
 */

// ─── Public base URL (for ExoML + audio endpoints) ──────────
const BASE_URL = (process.env.BACKEND_URL ?? 'https://agrodesk-production.up.railway.app').replace(/\/$/, '');

// ─── Job status helpers ──────────────────────────────────────

async function markRunning(jobId: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: { status: 'running', attempts: { increment: 1 } },
  });
}

async function markDone(jobId: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: { status: 'completed', completed_at: new Date() },
  });
}

async function markFailed(jobId: string, error: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: { status: 'failed', error: error.slice(0, 500) },
  });
}

// ─── Handlers ───────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  mr: 'Marathi', hi: 'Hindi', en: 'English', gu: 'Gujarati', pa: 'Punjabi',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali',
};

/**
 * Normalise an Indian phone number to strict E.164 (+91XXXXXXXXXX).
 * Plivo requires E.164 for the `to` number — a bare 10-digit number is treated
 * as an unknown/barred destination ("Calls to this destination region are barred").
 */
function toE164India(phone: string): string {
  if (phone.trim().startsWith('+')) return phone.trim().replace(/\s+/g, '');
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;                 // 7058617473
  if (d.length === 12 && d.startsWith('91')) return `+${d}`; // 917058617473
  if (d.length === 11 && d.startsWith('0')) return `+91${d.slice(1)}`; // 07058617473
  return `+${d}`; // fallback — already includes a country code
}

/**
 * How outbound voice calls are placed:
 *   'streaming' → Plivo (TELEPHONY_PROVIDER) bidirectional AI voice — a live
 *                 two-way conversation (STT → Gemini → TTS). This is the path
 *                 you asked to make real.
 *   'oneway'    → legacy Exotel: synthesize the whole script, <Play> it, hang up.
 * Defaults to 'streaming'.
 */
const VOICE_CALL_MODE = (process.env.VOICE_CALL_MODE ?? 'streaming').toLowerCase();

/**
 * Place a real bidirectional streaming call via the configured telephony
 * provider (Plivo primary). The provider dials `to`; when the callee answers,
 * Plivo fetches our /api/telephony/answer webhook, which returns <Stream> XML
 * pointing at the media WebSocket. language + greeting ride along as query
 * params so the voice engine opens in the right language.
 * Returns the provider call id.
 */
async function placeStreamingCall(opts: {
  to: string;
  language: string;
  greeting: string;
  dealerId: string;
  contactId?: string;
  contactName?: string;
  dealerName?: string;
  dealerCity?: string;
}): Promise<string> {
  const from = process.env.PLIVO_FROM_NUMBER ?? '';
  const q = new URLSearchParams({
    dealershipId: opts.dealerId,
    contactId: opts.contactId ?? '',
    language: opts.language,
    greeting: opts.greeting,
    contactName: opts.contactName ?? '',
    dealerName: opts.dealerName ?? '',
    dealerCity: opts.dealerCity ?? '',
  });
  const answerUrl = `${BASE_URL}/api/telephony/answer?${q.toString()}`;

  // AI call quota (Sovereign Vault plan limits). Consumed before dialling —
  // an initiated call costs money whether or not it connects.
  if (opts.dealerId) {
    const callQuota = await consumeQuota(opts.dealerId, 'ai_calls');
    if (!callQuota.allowed) {
      throw new Error(
        `Plan limit reached: ${callQuota.used}/${callQuota.limit} AI calls this month for dealer ${opts.dealerId}`,
      );
    }
  }

  const provider = getTelephonyProvider(); // throws a clear error if creds are missing
  const handle = await provider.initiateCall({
    to: toE164India(opts.to),
    from,
    answerStreamUrl: answerUrl,
    metadata: { dealerId: opts.dealerId, contactId: opts.contactId ?? '' },
  });
  return handle.callId;
}

/**
 * The opening the AI agent speaks when the callee picks up. When the caller
 * didn't supply a script (plain one-click Call), generate a full, personalized
 * cold-call / recovery script — the same style the app's AI Script generator
 * produces — so the agent opens with a real pitch, not a bare greeting.
 */
async function buildStreamingGreeting(
  langName: string,
  calleeName: string,
  dealerName: string,
  dealerCity: string,
  kind: 'sales' | 'recovery',
): Promise<string> {
  const rules =
    `Output ONLY the exact words to be spoken aloud, as one short paragraph. ` +
    `Do NOT use square brackets, parentheses, stage directions (like [pause]/[रुका]), ` +
    `placeholders (like [Your Name]/[Customer Name]), headings, or line breaks. ` +
    `Refer to the caller as being from ${dealerName} — do not insert a name placeholder.`;
  const prompt =
    kind === 'recovery'
      ? `Write a short, polite spoken phone-call opener in ${langName} for a ${dealerName} representative calling ${calleeName || 'the customer'} about a pending tractor-loan payment. Warm and respectful, no threats. 25-40 words. Ask when they can clear the amount. ${rules}`
      : `Write a short, warm spoken cold-call opener in ${langName} for a salesperson from ${dealerName}${dealerCity ? ' in ' + dealerCity : ''} calling ${calleeName || 'the farmer'} about tractors. Greet them, say there is a good offer, and invite them to visit the showroom. 25-40 words. ${rules}`;
  const script = await geminiText({ messages: [{ role: 'user', content: prompt }], maxTokens: 200 }).catch(() => '');
  return script?.trim() || 'नमस्कार! ॲग्रोडेस्क कडून बोलतोय. तुम्हाला ट्रॅक्टरबद्दल माहिती हवी आहे का?';
}

/**
 * Outbound voice call — cold_call / follow_up / recovery_call
 *
 * Expected payload:
 *   { contact_id, script, campaign_id? }
 *   OR
 *   { case_id, script, escalation_stage }
 */
async function handleVoiceCall(data: QueueJobData) {

  const suppliedScript = data.payload.script as string | undefined;
  const contactId = (data.payload.contact_id as string) ?? '';
  const caseId = (data.payload.case_id as string) ?? '';

  let phone: string;
  let language = 'mr';
  let calleeName = '';
  let dealerName = 'our dealership';
  let dealerCity = '';
  let recoveryAmountDue = 0;
  let recoveryStage = '';

  if (contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new Error(`Contact ${contactId} not found`);
    if (!contact.opt_in_call) throw new Error(`Contact ${contact.id} has not opted in to calls`);
    phone = contact.phone;
    language = contact.language ?? 'mr';
    calleeName = contact.name ?? '';
    const dealer = await prisma.dealer.findUnique({ where: { id: data.dealer_id } }).catch(() => null);
    if (dealer) { dealerName = dealer.name ?? dealerName; dealerCity = dealer.city ?? ''; }
  } else if (caseId) {
    const recoveryCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    if (!recoveryCase) throw new Error(`RecoveryCase ${caseId} not found`);
    phone = recoveryCase.phone;
    calleeName = recoveryCase.customer_name ?? '';
    recoveryAmountDue = recoveryCase.amount_due;
    recoveryStage = (data.payload.escalation_stage as string) ?? recoveryCase.escalation_stage;
  } else {
    throw new Error('Voice call job requires contact_id or case_id in payload');
  }

  const langName = LANG_NAMES[language] ?? 'Marathi';

  // ─── STREAMING PATH (Plivo primary): live two-way AI voice call ───
  if (VOICE_CALL_MODE === 'streaming') {
    const greeting =
      suppliedScript?.trim() ||
      (await buildStreamingGreeting(langName, calleeName, dealerName, dealerCity, caseId ? 'recovery' : 'sales'));

    console.log(`[worker] Placing ${TELEPHONY_PROVIDER} streaming call to ${phone}`);
    const callId = await placeStreamingCall({
      to: phone, language, greeting, dealerId: data.dealer_id, contactId,
      contactName: calleeName, dealerName, dealerCity,
    });
    console.log(`[worker] Streaming call placed — ${TELEPHONY_PROVIDER} callId: ${callId}`);

    if (contactId) {
      await logConsent(data.dealer_id, contactId, 'voice', 'opt_in_flag');
      await prisma.conversation.create({
        data: {
          dealer_id: data.dealer_id,
          contact_id: contactId,
          campaign_id: (data.payload.campaign_id as string) ?? null,
          channel: 'voice',
          direction: 'outbound',
          content: `Outbound streaming call placed (${TELEPHONY_PROVIDER}). Opening: ${greeting.slice(0, 180)}`,
          status: 'sent',
          twilio_sid: callId,
        },
      }).catch(() => {/* non-fatal */});
    }
    return;
  }

  // ─── ONE-WAY PATH (legacy Exotel): synthesize full script → <Play> → hangup ───
  let script = suppliedScript;
  if (!script) {
    if (contactId) {
      script = await geminiText({
        messages: [{ role: 'user', content: `Write a warm cold-call script in ${langName} for a tractor dealership salesperson calling a farmer named ${calleeName}. Dealership: ${dealerName}${dealerCity ? ', ' + dealerCity : ''}. The SPEAKER is the salesperson (use [Your Name] placeholder; NEVER use the customer name as the speaker). 60-90 words, natural spoken ${langName}, end by inviting them to visit the showroom. Return ONLY the spoken words.` }],
        maxTokens: 400,
      });
      if (!script) throw new Error('Failed to generate call script');
    } else {
      script = buildRecoveryScript(calleeName, recoveryAmountDue, recoveryStage);
    }
  }

  // 1. Generate Marathi TTS audio
  console.log(`[worker] Generating TTS for call to ${phone}`);
  const audioBuffer = await textToSpeech(script, language);

  // 2. Store audio in memory so the ExoML endpoint can serve it
  const audioId = randomUUID();
  storeAudio(audioId, audioBuffer, 'audio/wav');

  const exomlUrl  = `${BASE_URL}/api/exoml/${audioId}`;
  const statusUrl = `${BASE_URL}/webhooks/exotel/call-status?token=${process.env.EXOTEL_WEBHOOK_TOKEN ?? ''}`;

  // 3. Place the call
  console.log(`[worker] Placing Exotel call to ${phone}`);
  const { call_sid } = await placeCall(phone, exomlUrl, statusUrl);
  console.log(`[worker] Call placed — Exotel SID: ${call_sid}`);

  // 4. Log consent + persist conversation
  if (contactId) {
    await logConsent(data.dealer_id, contactId, 'voice', 'opt_in_flag');
    await prisma.conversation.create({
      data: {
        dealer_id: data.dealer_id,
        contact_id: contactId,
        campaign_id: (data.payload.campaign_id as string) ?? null,
        channel: 'voice',
        direction: 'outbound',
        content: `Outbound call placed. Script: ${script.slice(0, 200)}...`,
        status: 'sent',
        twilio_sid: call_sid,
      },
    }).catch(() => {/* non-fatal */});
  }
}

/**
 * WhatsApp outbound message
 *
 * Expected payload:
 *   { contact_id, message, campaign_id? }
 *   OR
 *   { case_id, message }
 */
async function handleWhatsApp(data: QueueJobData) {

  let phone: string;
  let contactId: string | null = null;
  // Accept either `message` (campaign/contact sends) or `script` (script-modal dispatches)
  let message = (data.payload.message ?? data.payload.script) as string | undefined;

  if (data.payload.contact_id) {
    const contact = await prisma.contact.findUnique({
      where: { id: data.payload.contact_id as string },
    });
    if (!contact) throw new Error(`Contact ${data.payload.contact_id} not found`);
    if (!contact.opt_in_whatsapp) throw new Error(`Contact ${contact.id} has not opted in to WhatsApp`);
    if (!message) throw new Error('No message provided in job payload');
    phone = contact.phone;
    contactId = contact.id;
  } else if (data.payload.case_id) {
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: data.payload.case_id as string },
    });
    if (!recoveryCase) throw new Error(`RecoveryCase ${data.payload.case_id} not found`);
    phone = recoveryCase.phone;
    // Fall back to an auto-generated recovery message if none was supplied
    if (!message) {
      message = buildRecoveryScript(
        recoveryCase.customer_name,
        recoveryCase.amount_due,
        (data.payload.escalation_stage as string) ?? recoveryCase.escalation_stage,
      );
    }
  } else {
    throw new Error('WhatsApp job requires contact_id or case_id in payload');
  }
  if (!message) throw new Error('No message provided in job payload');

  // Plan limit (set in the Sovereign Vault). Checked immediately before the
  // send so a spent quota stops the spend rather than being noticed later.
  const waQuota = await consumeQuota(data.dealer_id, 'whatsapp_msgs');
  if (!waQuota.allowed) {
    throw new Error(
      `Plan limit reached: ${waQuota.used}/${waQuota.limit} WhatsApp messages this month for dealer ${data.dealer_id}`,
    );
  }

  console.log(`[worker] Sending WhatsApp to ${phone}`);
  const { sid } = await sendWhatsApp(phone, message);
  console.log(`[worker] WhatsApp sent — Twilio SID: ${sid}`);

  // Persist conversation
  if (contactId) {
    await logConsent(data.dealer_id, contactId, 'whatsapp', 'opt_in_flag');
    await prisma.conversation.create({
      data: {
        dealer_id: data.dealer_id,
        contact_id: contactId,
        campaign_id: (data.payload.campaign_id as string) ?? null,
        channel: 'whatsapp',
        direction: 'outbound',
        content: message,
        status: 'sent',
        twilio_sid: sid,
      },
    }).catch(() => {});

    await prisma.contact.update({
      where: { id: contactId },
      data: { last_contact: new Date() },
    }).catch(() => {});
  }
}

/** Build a default Marathi recovery script based on escalation stage */
function buildRecoveryScript(customerName: string, amountDue: number, stage: string): string {
  const amount = (amountDue / 100000).toFixed(1);
  if (stage === 'firm' || stage === 'stern') {
    return `नमस्ते ${customerName} जी! आपका ₹${amount} लाख का भुगतान काफी समय से बकाया है। अगर आप आज भुगतान नहीं करते, तो हमें कानूनी कार्रवाई करनी पड़ सकती है। कृपया तुरंत संपर्क करें।`;
  }
  return `नमस्ते ${customerName} जी! आपका EMI भुगतान ₹${amount} लाख बकाया है। कृपया जल्द से जल्द भुगतान करें। धन्यवाद।`;
}

/**
 * Money recovery — sends via all channels listed in payload.channels
 *
 * Expected payload:
 *   { case_id, channels: string[], escalation_stage, script_voice?, script_whatsapp? }
 */
async function handleMoneyRecovery(data: QueueJobData) {
  const channels  = (data.payload.channels as string[]) ?? ['voice', 'whatsapp'];
  const caseId    = data.payload.case_id as string;
  const stage     = (data.payload.escalation_stage as string) ?? 'gentle';

  if (!caseId) throw new Error('money_recovery job requires case_id in payload');

  const recoveryCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (!recoveryCase) throw new Error(`RecoveryCase ${caseId} not found`);

  // Default scripts per escalation stage if not provided
  const defaultVoiceScript = buildRecoveryScript(
    recoveryCase.customer_name,
    recoveryCase.amount_due,
    stage,
  );
  const voiceScript   = (data.payload.script_voice   as string) || defaultVoiceScript;
  const waMessage     = (data.payload.script_whatsapp as string) || defaultVoiceScript;

  const results: string[] = [];

  for (const channel of channels) {
    try {
      if (channel === 'voice') {
        const audioBuffer = await textToSpeech(voiceScript, 'mr');
        const audioId = randomUUID();
        storeAudio(audioId, audioBuffer, 'audio/wav');
        const exomlUrl  = `${BASE_URL}/api/exoml/${audioId}`;
        const statusUrl = `${BASE_URL}/webhooks/exotel/call-status?token=${process.env.EXOTEL_WEBHOOK_TOKEN ?? ''}`;
        const { call_sid } = await placeCall(recoveryCase.phone, exomlUrl, statusUrl);
        results.push(`voice:${call_sid}`);
        console.log(`[worker] Recovery call placed to ${recoveryCase.phone} — SID: ${call_sid}`);
      } else if (channel === 'whatsapp') {
        const { sid } = await sendWhatsApp(recoveryCase.phone, waMessage);
        results.push(`whatsapp:${sid}`);
        console.log(`[worker] Recovery WhatsApp sent to ${recoveryCase.phone} — SID: ${sid}`);
      } else if (channel === 'sms') {
        const smsKey = stage === 'firm' || stage === 'stern' ? 'recovery_firm' : 'recovery_gentle';
        const { request_id } = await sendSMS(recoveryCase.phone, smsKey, [
          recoveryCase.customer_name,
          (recoveryCase.amount_due / 100000).toFixed(1) + ' Lakh',
          process.env.EXOTEL_PHONE ?? 'the dealership',
        ]);
        results.push(`sms:${request_id}`);
        console.log(`[worker] Recovery SMS sent to ${recoveryCase.phone} — MSG91: ${request_id}`);
      }
    } catch (err) {
      console.error(`[worker] Recovery ${channel} failed for case ${caseId}:`, err);
      results.push(`${channel}:error`);
    }
  }

  // Append to channel_history
  const history = Array.isArray(recoveryCase.channel_history)
    ? recoveryCase.channel_history
    : [];
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      last_contact: new Date(),
      channel_history: [...history, { channels, outcome: results.join(','), date: new Date().toISOString() }],
    },
  });
}

/**
 * SMS outbound — DLT-compliant
 *
 * Expected payload:
 *   { contact_id, template_key, variables: string[], campaign_id? }
 */
async function handleSMS(data: QueueJobData) {

  const contactId   = data.payload.contact_id as string;
  const templateKey = (data.payload.template_key as DLTTemplateKey) ?? 'cold_call_followup';
  const variables   = (data.payload.variables as string[]) ?? [];

  if (!contactId) throw new Error('sms job requires contact_id in payload');

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error(`Contact ${contactId} not found`);
  if (!contact.opt_in_sms) throw new Error(`Contact ${contactId} has not opted in to SMS`);

  const smsQuota = await consumeQuota(data.dealer_id, 'sms');
  if (!smsQuota.allowed) {
    throw new Error(
      `Plan limit reached: ${smsQuota.used}/${smsQuota.limit} SMS this month for dealer ${data.dealer_id}`,
    );
  }

  console.log(`[worker] Sending SMS to ${contact.phone} (template: ${templateKey})`);
  const { request_id } = await sendSMS(contact.phone, templateKey, variables);
  console.log(`[worker] SMS sent — MSG91 request_id: ${request_id}`);

  // Log consent basis
  await logConsent(data.dealer_id, contactId, 'sms', 'opt_in_flag');

  // Persist conversation
  await prisma.conversation.create({
    data: {
      dealer_id: data.dealer_id,
      contact_id: contactId,
      channel: 'sms',
      direction: 'outbound',
      content: `SMS sent (template: ${templateKey})`,
      status: 'sent',
      campaign_id: data.payload.campaign_id as string ?? null,
    },
  });
}

/**
 * AI Accountant — notify the accountant that a period's bills are ready.
 *
 * Expected payload:
 *   { accountant_id, period_month, document_ids: string[] }
 *
 * Sends a WhatsApp summary (accountants are business contacts, not consumer
 * `Contact` rows, so no opt-in/quiet-hours gate applies here — this is a
 * B2B business notification, not a TRAI-regulated consumer message).
 */
async function handleSendToAccountant(data: QueueJobData) {
  const accountantId = data.payload.accountant_id as string;
  const periodMonth  = data.payload.period_month as string;
  const documentIds   = (data.payload.document_ids as string[]) ?? [];

  if (!accountantId) throw new Error('send_to_accountant job requires accountant_id in payload');

  const accountant = await prisma.accountant.findUnique({ where: { id: accountantId } });
  if (!accountant) throw new Error(`Accountant ${accountantId} not found`);

  const documents = documentIds.length
    ? await prisma.document.findMany({ where: { id: { in: documentIds } } })
    : [];

  const byCategory = documents.reduce((acc: Record<string, number>, d: { category: string }) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1;
    return acc;
  }, {});
  const summaryLines = Object.entries(byCategory).map(([cat, count]) => `- ${cat}: ${count} file(s)`).join('\n');

  const dealer = await prisma.dealer.findUnique({ where: { id: data.dealer_id } });
  const dealerName = dealer?.name ?? 'AgroDesk dealer';

  const message = `Hello ${accountant.name},\n\n${dealerName} has sent ${documents.length} bill(s) for ${periodMonth} on AgroDesk:\n${summaryLines || '(no categorised documents)'}\n\nLog in to your AgroDesk accountant view or reply here to request the files.`;

  console.log(`[worker] Notifying accountant ${accountant.name} (${accountant.phone}) — ${documents.length} docs for ${periodMonth}`);
  try {
    const { sid } = await sendWhatsApp(accountant.phone, message);
    console.log(`[worker] Accountant notified via WhatsApp — SID: ${sid}`);
  } catch (err) {
    // WhatsApp isn't configured or the number can't receive — this is non-fatal for
    // the job (documents are still marked as sent below); log so it's visible.
    console.error(`[worker] Failed to WhatsApp-notify accountant ${accountant.id}:`, (err as Error).message);
  }

  // Mark documents as confirmed/sent so the History tab reflects the handoff
  if (documentIds.length) {
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { confirmed: true },
    });
  }
}

/**
 * Support Intake — notify the routed staff member (mechanic / technician /
 * dealer) that a new service/repair/enquiry ticket has come in. Sends a short
 * WhatsApp with a deep link to the ticket.
 *
 * This is an internal B2B staff notification (not a TRAI-regulated consumer
 * message), so no opt-in / quiet-hours gate applies — same reasoning as
 * handleSendToAccountant.
 *
 * Expected payload: { request_id }
 */
async function handleSupportNotify(data: QueueJobData) {
  const requestId = data.payload.request_id as string;
  if (!requestId) throw new Error('support_notify job requires request_id in payload');

  const ticket = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: { contact: true, dealer: { select: { language: true } } },
  });
  if (!ticket) throw new Error(`SupportRequest ${requestId} not found`);

  // No routing target on file → nothing to send; the ticket already surfaces on
  // the dashboard, so this is a successful no-op.
  if (!ticket.routed_to_phone) {
    console.log(`[worker] support_notify ${requestId}: no routed_to_phone, skipping send`);
    return;
  }

  const who = ticket.contact?.name || ticket.caller_name || ticket.phone;
  const copy = supportCopy(ticket.dealer?.language); // staff alert in the dealer's language
  const typeLabel = copy.types[ticket.type as keyof typeof copy.types] ?? ticket.type;
  const base = (process.env.FRONTEND_URL ?? 'https://frontend-sepia-five-70.vercel.app').replace(/\/$/, '');
  const link = `${base}/support?ticket=${ticket.id}`;

  const message =
    `🔧 ${copy.newRequest} (${typeLabel})\n` +
    `${copy.customer}: ${who}\n` +
    `${copy.phone}: ${ticket.phone}\n` +
    `${copy.details}: ${ticket.note}\n\n` +
    `${copy.view}: ${link}`;

  console.log(`[worker] Notifying support staff ${ticket.routed_to} (${ticket.routed_to_phone}) — ticket ${ticket.id}`);

  // Delivery chain, most-reliable first. A staff alert is business-initiated,
  // so free-form WhatsApp only works if that staff member happened to message
  // the business number in the last 24h — never assume it.
  //   1. Approved WhatsApp template (works any time)  ← configure this
  //   2. Free-form WhatsApp (only inside the 24h window; fine for dev/sandbox)
  //   3. DLT SMS (last resort, so a breakdown is never silently dropped)
  const templateSid = process.env.WHATSAPP_TPL_SUPPORT_NOTIFY;
  const noteShort = String(ticket.note).slice(0, 120);

  if (templateSid) {
    const { sid } = await sendWhatsAppTemplate(ticket.routed_to_phone, templateSid, [
      typeLabel, who, ticket.phone, noteShort, link,
    ]);
    console.log(`[worker] Support staff notified via WhatsApp template — SID: ${sid}`);
    return;
  }

  console.warn(
    '[worker] WHATSAPP_TPL_SUPPORT_NOTIFY is not set — falling back to free-form WhatsApp, ' +
    'which Meta rejects outside the 24-hour service window. Register a template before go-live.',
  );

  try {
    const { sid } = await sendWhatsApp(ticket.routed_to_phone, message);
    console.log(`[worker] Support staff notified via free-form WhatsApp — SID: ${sid}`);
  } catch (waErr) {
    console.error(`[worker] WhatsApp staff notify failed: ${(waErr as Error).message} — trying SMS`);
    const { request_id } = await sendSMS(ticket.routed_to_phone, 'support_notify', [
      typeLabel, who, ticket.phone, noteShort,
    ]);
    console.log(`[worker] Support staff notified via SMS — MSG91: ${request_id}`);
  }
}

agentQueue.process(5 /* concurrency */, async (job: Job<QueueJobData>) => {
  const { db_job_id, agent_type } = job.data;
  console.log(`[worker] Processing job ${db_job_id} (type: ${agent_type})`);

  // ─── TRAI quiet-hours safety net ───────────────────────────
  // Consumer-facing outbound is normally deferred at enqueue time. If a job
  // still lands here inside the window (queued before this fix, or it crossed
  // the 9 PM boundary while waiting), re-queue it as a DELAYED job and return.
  // It leaves the queue immediately — no sleeping, no burned attempts, no
  // concurrency slot held hostage.
  if (QUIET_HOURS_GATED_TYPES.has(agent_type) && isQuietHours()) {
    const delayMs = msUntilAllowedWindow();
    console.log(
      `[worker] ${agent_type} job ${db_job_id} is in TRAI quiet hours — ` +
      `deferring ${Math.round(delayMs / 60_000)}m until 9:05 AM IST`,
    );
    await deferJob(job.data, delayMs);
    await prisma.agentJob.update({
      where: { id: db_job_id },
      data: { status: 'pending', scheduled_for: new Date(Date.now() + delayMs) },
    }).catch(() => {});
    return; // this Bull job completes; the delayed clone runs in the morning
  }

  // Mark in-progress
  await prisma.agentJob.update({
    where: { id: db_job_id },
    data: { status: 'in_progress', attempts: { increment: 1 } },
  }).catch(() => {});

  try {
    switch (agent_type) {
      case 'voice_call':        await handleVoiceCall(job.data);        break;
      case 'whatsapp':          await handleWhatsApp(job.data);          break;
      case 'sms':               await handleSMS(job.data);               break;
      case 'money_recovery':    await handleMoneyRecovery(job.data);     break;
      case 'send_to_accountant': await handleSendToAccountant(job.data); break;
      case 'support_notify':    await handleSupportNotify(job.data);     break;
      default:
        throw new Error(`Unknown agent_type: ${agent_type}`);
    }

    await prisma.agentJob.update({
      where: { id: db_job_id },
      data: { status: 'completed', completed_at: new Date() },
    }).catch(() => {});

  } catch (err: any) {
    console.error(`[worker] Job ${db_job_id} error:`, err.message);

    await prisma.agentJob.update({
      where: { id: db_job_id },
      data: { status: 'failed', error: String(err.message).slice(0, 500) },
    }).catch(() => {});

    throw err; // re-throw so Bull retries
  }
});

// ─── Queue event logging ──────────────────────────────────────
agentQueue.on('failed', (job, err) => {
  console.error(`[queue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    Sentry.captureException(err, {
      tags: { job_id: job.id?.toString(), agent_type: job.data?.agent_type },
      extra: { job_data: job.data },
    });
  }
});
agentQueue.on('completed', (job) => {
  console.log(`[queue] Job ${job.id} completed`);
});
agentQueue.on('stalled', (job) => {
  console.warn(`[queue] Job ${job.id} stalled — will retry`);
});

console.log('[worker] AgroDesk agent worker started — listening for jobs...');
