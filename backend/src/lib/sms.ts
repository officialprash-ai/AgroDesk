/**
 * MSG91 SMS — DLT-compliant outbound SMS for India
 *
 * TRAI TCCCPR rules enforced here:
 *  1. Every SMS must use a pre-registered DLT template ID
 *  2. Sender ID must match the DLT-registered sender
 *  3. Variable values injected into template placeholders
 *  4. opt_in_sms must be true on the contact before calling this
 *
 * Docs: https://docs.msg91.com/reference/send-sms
 */

const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID ?? 'AGRODS'; // 6-char DLT sender

/** Well-known DLT template IDs — register these on MSG91/TRAI portal before use */
export const DLT_TEMPLATES = {
  cold_call_followup:   { id: process.env.DLT_TPL_COLD_FOLLOWUP   ?? '', text: 'Dear {#var#}, your enquiry for a tractor at {#var#} dealership is being processed. Call us at {#var#}. - AgroDesk' },
  recovery_gentle:      { id: process.env.DLT_TPL_RECOVERY_GENTLE  ?? '', text: 'Dear {#var#}, your EMI payment of Rs.{#var#} is due. Please pay at the earliest. - {#var#} Dealership' },
  recovery_firm:        { id: process.env.DLT_TPL_RECOVERY_FIRM    ?? '', text: 'Dear {#var#}, your overdue payment of Rs.{#var#} requires immediate attention. Contact us at {#var#}. - AgroDesk' },
  whatsapp_unavailable: { id: process.env.DLT_TPL_WA_UNAVAILABLE   ?? '', text: 'Dear {#var#}, we tried reaching you on WhatsApp. Please call {#var#} for your tractor enquiry. - AgroDesk' },
} as const;

export type DLTTemplateKey = keyof typeof DLT_TEMPLATES;

export interface SMSResult {
  request_id: string;
  type: string;
}

/**
 * Send an SMS via MSG91 using a pre-registered DLT template.
 *
 * @param to         Recipient phone (any Indian format)
 * @param templateKey One of the keys in DLT_TEMPLATES
 * @param variables  Values to substitute for {#var#} placeholders IN ORDER
 */
export async function sendSMS(
  to: string,
  templateKey: DLTTemplateKey,
  variables: string[],
): Promise<SMSResult> {
  if (!MSG91_AUTH_KEY) throw new Error('MSG91_AUTH_KEY is not set');

  const template = DLT_TEMPLATES[templateKey];
  if (!template.id) {
    throw new Error(
      `DLT template ID for "${templateKey}" is not set. ` +
      `Register the template on the TRAI DLT portal and set the env var.`,
    );
  }

  // Build the message body by substituting variables in order
  let body: string = template.text;
  for (const v of variables) {
    body = body.replace('{#var#}', v);
  }

  // Normalise phone to 91XXXXXXXXXX
  const digits = to.replace(/\D/g, '');
  let mobile: string;
  if (digits.startsWith('91') && digits.length === 12) mobile = digits;
  else if (digits.startsWith('0') && digits.length === 11) mobile = '91' + digits.slice(1);
  else if (digits.length === 10) mobile = '91' + digits;
  else throw new Error(`Cannot normalise phone: ${to}`);

  const payload = {
    sender:      MSG91_SENDER_ID,
    route:       '4',          // transactional route
    country:     '91',
    DLT_TE_ID:  template.id,
    sms: [{ message: body, to: [mobile] }],
  };

  const res = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: MSG91_AUTH_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MSG91 error ${res.status}: ${text}`);
  }

  const data = await res.json() as { request_id: string; type: string };
  return data;
}
