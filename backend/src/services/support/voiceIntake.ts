/**
 * Support Intake — Voice (Plivo IVR)
 *
 * Second-pass channel (build after WhatsApp is green). Classic Plivo XML IVR —
 * NOT the streaming AI engine — because intake is a deterministic single turn:
 *
 *   1. Announce recording consent (TRAI) + greet.                 [answer]
 *   2. Record one turn — let the caller describe the problem.     [answer → Record]
 *   3. Transcribe (Sarvam mr-IN) → handleIntake() → TICKET SAVED. [capture]
 *   4. Repeat the note back for confirmation, then bridge the     [capture → Dial]
 *      caller to the routed staff member.
 *   5. On dial connect → mark transferred=true.                   [transfer-status]
 *
 * Guarantees:
 *   - The ticket is created in step 3, BEFORE the transfer in step 4. A failed
 *     or unanswered transfer never loses the request.
 *   - Outside office hours (or demo, or no routed phone): skip the transfer,
 *     capture politely and close. This is the highest-value path.
 *
 * Marathi prompts are spoken via Sarvam TTS (stored in the in-process audio
 * store and served from /api/audio/:id), matching how the worker plays audio.
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma as _prisma } from '../../lib/prisma.js';
const prisma = _prisma as any;
import { textToSpeech } from '../../lib/sarvam.js';
import { storeAudio } from '../../lib/audioStore.js';
import { handleIntake } from './intake.js';
import { supportCopy, fill } from '../../lib/supportStrings.js';

const BASE_URL = (process.env.BACKEND_URL ?? 'https://agrodesk-production.up.railway.app').replace(/\/$/, '');

// ─── XML helpers ─────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

/** Synthesize Marathi text to audio, stash it, return its absolute /api/audio URL. */
async function speakUrl(text: string, language = 'mr'): Promise<string | null> {
  try {
    const buf = await textToSpeech(text, language);
    const id = randomUUID();
    storeAudio(id, buf, 'audio/wav');
    return `${BASE_URL}/api/audio/${id}`;
  } catch (err) {
    console.error('[voiceIntake] TTS failed:', (err as Error).message);
    return null;
  }
}

/** Wrap a spoken line as <Play> if we have audio, else fall back to Plivo <Speak>. */
function playOrSpeak(audioUrl: string | null, fallbackText: string): string {
  if (audioUrl) return `<Play>${escapeXml(audioUrl)}</Play>`;
  return `<Speak language="hi-IN">${escapeXml(fallbackText)}</Speak>`;
}

// ─── Office hours (IST) ──────────────────────────────────────

/** "HH:MM" → minutes since midnight. */
function hm(s: string | null | undefined, fallback: number): number {
  const m = /^(\d{2}):(\d{2})$/.exec(s ?? '');
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function isWithinOfficeHours(routing: any, now = new Date()): boolean {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const start = hm(routing?.office_hours_start, 9 * 60);
  const end = hm(routing?.office_hours_end, 19 * 60);
  return minutes >= start && minutes < end;
}

// ─── Token gate (Plivo, query-param token like the Exotel webhook) ──
function checkToken(req: any, res: any, next: any) {
  const expected = process.env.SUPPORT_VOICE_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') return res.status(503).send('<Response/>');
    return next(); // dev convenience
  }
  if ((req.query.token as string) !== expected) return res.status(403).send('<Response/>');
  next();
}

// ─── Router ──────────────────────────────────────────────────

const router = Router();
router.use(checkToken);

function xml(res: any, body: string) {
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(`<Response>${body}</Response>`);
}

// 1. Plivo Answer URL for the dealer's SUPPORT number.
router.post('/answer', async (req, res) => {
  try {
    const b = req.body as Record<string, string>;
    const toNum = (b.To ?? '').replace(/\D/g, '').replace(/^91/, '');
    const dealer = await prisma.dealer.findFirst({ where: { phone: { endsWith: toNum } } }).catch(() => null);
    if (!dealer) return xml(res, '<Hangup/>');

    const fromPhone = b.From ?? '';
    const callUuid = b.CallUUID ?? '';
    const tenDigits = fromPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    const contact = tenDigits
      ? await prisma.contact.findFirst({ where: { dealer_id: dealer.id, phone: { endsWith: tenDigits } } }).catch(() => null)
      : null;

    // Recording consent (TRAI, non-negotiable) + greeting.
    // Prompts + the TTS voice both follow the dealer's configured language.
    const lang = dealer.language ?? 'mr';
    const copy = supportCopy(lang);
    const consent = copy.consent;
    const greeting = contact
      ? fill(copy.greetKnown, { name: contact.name })
      : copy.greetUnknown;
    const audio = await speakUrl(consent + greeting, lang);

    const params = new URLSearchParams({
      token: (req.query.token as string) ?? '',
      dealer: dealer.id,
      from: fromPhone,
      callUuid,
    });
    const action = `${BASE_URL}/api/support/voice/capture?${params.toString()}`;

    // Single-turn capture. maxLength 90s, stop on 3s silence.
    xml(
      res,
      `${playOrSpeak(audio, consent + greeting)}` +
        `<Record action="${escapeXml(action)}" method="POST" maxLength="90" ` +
        `finishOnKey="#" timeout="4" playBeep="true" recordSession="false"/>`,
    );
  } catch (err) {
    console.error('[voiceIntake/answer]', err);
    xml(res, '<Hangup/>');
  }
});

// 2. Plivo posts the recording here. Transcribe → ticket → transfer/close.
router.post('/capture', async (req, res) => {
  try {
    const b = req.body as Record<string, string>;
    const dealerId = (req.query.dealer as string) ?? '';
    const fromPhone = (req.query.from as string) ?? '';
    const callUuid = (req.query.callUuid as string) ?? b.CallUUID ?? '';
    const recordUrl = b.RecordUrl ?? b.RecordingUrl ?? '';

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } }).catch(() => null);
    const isDemo = dealer?.is_demo === true;
    const lang = dealer?.language ?? 'mr';
    const copy = supportCopy(lang);

    // Transcribe the recording (Marathi). Plivo recordings need Basic auth.
    let text = '';
    if (recordUrl) {
      try {
        const { speechToText } = await import('../../lib/sarvam.js');
        const authId = process.env.PLIVO_AUTH_ID ?? '';
        const authToken = process.env.PLIVO_AUTH_TOKEN ?? '';
        const rec = await fetch(recordUrl, {
          headers: authId ? { Authorization: `Basic ${Buffer.from(`${authId}:${authToken}`).toString('base64')}` } : {},
        });
        if (rec.ok) {
          const buf = Buffer.from(await rec.arrayBuffer());
          text = await speechToText(buf, rec.headers.get('content-type') ?? 'audio/wav', 'mr');
        }
      } catch (err) {
        console.error('[voiceIntake/capture] STT failed:', (err as Error).message);
      }
    }

    // ── Ticket FIRST — before any transfer ──
    const ticket = await handleIntake({
      dealerId,
      phone: fromPhone,
      text: text || copy.voiceNoText,
      channel: 'CALL',
      externalCallId: callUuid || undefined,
      isDemo,
    });

    const routing = await prisma.supportRouting.findUnique({ where: { dealer_id: dealerId } }).catch(() => null);
    const openHours = isWithinOfficeHours(routing);
    const routedPhone: string | null = ticket.routed_to_phone ?? null;

    // Repeat the note back for confirmation.
    const confirmLine = fill(copy.confirm, { note: String(ticket.note) });

    // Skip transfer when: demo dealer, outside office hours, or no target number.
    if (isDemo || !openHours || !routedPhone) {
      const closing = copy.closingNoTransfer;
      const audio = await speakUrl(confirmLine + closing, lang);
      return xml(res, `${playOrSpeak(audio, confirmLine + closing)}<Hangup/>`);
    }

    // Bridge to the routed staff member.
    const bridgeLine = confirmLine + copy.bridging;
    const audio = await speakUrl(bridgeLine, lang);
    const params = new URLSearchParams({ token: (req.query.token as string) ?? '', request: ticket.id });
    const dialAction = `${BASE_URL}/api/support/voice/transfer-status?${params.toString()}`;

    xml(
      res,
      `${playOrSpeak(audio, bridgeLine)}` +
        `<Dial action="${escapeXml(dialAction)}" method="POST" callerId="${escapeXml(fromPhone)}" timeout="30">` +
        `<Number>${escapeXml(routedPhone)}</Number></Dial>`,
    );
  } catch (err) {
    console.error('[voiceIntake/capture]', err);
    // Even on error the ticket may already exist; just close politely.
    xml(res, `<Speak language="hi-IN">${escapeXml(supportCopy('mr').thanks)}</Speak><Hangup/>`);
  }
});

// 3. Dial result → mark the ticket transferred iff the staff member connected.
router.post('/transfer-status', async (req, res) => {
  try {
    const requestId = (req.query.request as string) ?? '';
    const status = (req.body as Record<string, string>).DialStatus ?? (req.body as Record<string, string>).DialHangupCause ?? '';
    const connected = status === 'completed' || status === 'answer' || status === 'ANSWER';

    if (requestId && connected) {
      await prisma.supportRequest
        .update({ where: { id: requestId }, data: { transferred: true, status: 'IN_PROGRESS', seen_at: new Date(), updated_at: new Date() } })
        .catch((err: Error) => console.error('[voiceIntake/transfer-status] update failed:', err.message));
      return xml(res, '<Hangup/>');
    }

    // No answer / busy / failed — leave transferred=false, reassure the caller
    // in the dealer's language (resolved via the ticket).
    const ticket = requestId
      ? await prisma.supportRequest
          .findUnique({ where: { id: requestId }, include: { dealer: { select: { language: true } } } })
          .catch(() => null)
      : null;
    const lang = ticket?.dealer?.language ?? 'mr';
    const copy = supportCopy(lang);
    const audio = await speakUrl(copy.staffUnavailable, lang);
    return xml(res, `${playOrSpeak(audio, copy.staffUnavailable)}<Hangup/>`);
  } catch (err) {
    console.error('[voiceIntake/transfer-status]', err);
    xml(res, '<Hangup/>');
  }
});

export default router;
