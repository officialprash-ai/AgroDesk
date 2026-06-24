/**
 * Exotel — Outbound voice calls via Exotel API v1
 * Docs: https://developer.exotel.com/api/calls
 *
 * Flow:
 *  1. Worker generates Sarvam TTS audio → stores in audioStore
 *  2. Worker calls placeCall() with the ExoML URL for this call
 *  3. Exotel dials the contact; when answered it fetches the ExoML
 *  4. ExoML tells Exotel to <Play> the Sarvam audio URL
 *  5. After call ends, Exotel POSTs to statusCallbackUrl → our webhook updates the job
 */

const EXOTEL_API_KEY   = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_SID       = process.env.EXOTEL_SID;
const EXOTEL_PHONE     = process.env.EXOTEL_PHONE; // virtual number, e.g. "08049XXXXXX"

/** Normalise any Indian phone to 0XXXXXXXXXX (Exotel's preferred format) */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return digits;
  if (digits.length === 10) return '0' + digits;
  throw new Error(`Cannot normalise phone number: ${phone}`);
}

export interface ExotelCallResult {
  call_sid: string;
  status: string;
}

/**
 * Place an outbound call.
 * @param to               Contact phone number (any Indian format)
 * @param exomlUrl         Public URL that returns ExoML instructions when Exotel answers
 * @param statusCallbackUrl Public URL Exotel POSTs terminal status to
 */
export async function placeCall(
  to: string,
  exomlUrl: string,
  statusCallbackUrl: string,
): Promise<ExotelCallResult> {
  if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_SID || !EXOTEL_PHONE) {
    throw new Error('Exotel credentials not configured (EXOTEL_API_KEY / EXOTEL_API_TOKEN / EXOTEL_SID / EXOTEL_PHONE)');
  }

  const body = new URLSearchParams({
    From:           EXOTEL_PHONE,
    To:             normalisePhone(to),
    Url:            exomlUrl,
    CallerId:       EXOTEL_PHONE,
    StatusCallback: statusCallbackUrl,
    'StatusCallbackEvents[0]': 'terminal',
    TimeLimit:      '120',   // max 2 min call
    TimeOut:        '30',    // ring timeout in seconds
  });

  const credentials = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64');

  const res = await fetch(
    `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Exotel API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { Call: { Sid: string; Status: string } };
  return { call_sid: data.Call.Sid, status: data.Call.Status };
}

/** Build ExoML XML that plays an audio file then hangs up */
export function buildExoML(audioUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">${audioUrl}</Play>
  <Pause length="2"/>
  <Hangup/>
</Response>`;
}
