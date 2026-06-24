/**
 * WhatsApp outbound messaging via Twilio API
 *
 * Note: Twilio WhatsApp requires a pre-approved message template for first-contact
 * outbound messages (outside the 24-hour service window). For MVP, this sends
 * free-form messages — works reliably once the contact has messaged you first,
 * or with a verified template SID.
 *
 * Docs: https://www.twilio.com/docs/whatsapp/api
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
// WHATSAPP_PHONE_ID should be the phone number WITHOUT country code prefix
// e.g. if your WhatsApp number is +91-XXXXX-XXXXX, set it to "91XXXXXXXXXX"
const WA_FROM = process.env.WHATSAPP_PHONE_ID
  ? `whatsapp:+${process.env.WHATSAPP_PHONE_ID.replace(/^\+/, '')}`
  : undefined;

/** Normalise any Indian phone to whatsapp:+91XXXXXXXXXX */
function normaliseWA(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let ten: string;
  if (digits.startsWith('91') && digits.length === 12) ten = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) ten = digits.slice(1);
  else if (digits.length === 10) ten = digits;
  else throw new Error(`Cannot normalise phone number: ${phone}`);
  return `whatsapp:+91${ten}`;
}

export interface WAResult {
  sid: string;
  status: string;
}

/**
 * Send a WhatsApp message to a contact.
 * @param to   Contact phone (any Indian format)
 * @param body Message text (max ~1600 chars)
 */
export async function sendWhatsApp(to: string, body: string): Promise<WAResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !WA_FROM) {
    throw new Error('Twilio/WhatsApp credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / WHATSAPP_PHONE_ID)');
  }

  const params = new URLSearchParams({
    From: WA_FROM,
    To:   normaliseWA(to),
    Body: body,
  });

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio WhatsApp error ${res.status}: ${text}`);
  }

  const data = await res.json() as { sid: string; status: string };
  return { sid: data.sid, status: data.status };
}
