/**
 * Bill/receipt OCR via Anthropic vision — used by AI Accountant (Module F).
 *
 * We reuse the existing ANTHROPIC_API_KEY instead of standing up a separate OCR
 * provider (Textract/etc): Claude's vision input reads the bill image directly and
 * returns structured fields, which is enough for dealer bookkeeping purposes.
 */
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface BillOcrData {
  vendor: string | null;
  invoice_number: string | null;
  date: string | null;
  amount: number | null;
  gst_number: string | null;
  category_guess: string | null;
  raw_text: string | null;
}

const EMPTY_RESULT: BillOcrData = {
  vendor: null, invoice_number: null, date: null, amount: null,
  gst_number: null, category_guess: null, raw_text: null,
};

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

function isSupportedImage(mimeType: string): mimeType is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Extract structured data from a bill/receipt/invoice image.
 * @param base64Data  Raw base64 (no data: prefix)
 * @param mimeType     e.g. 'image/jpeg', 'image/png' — PDFs aren't supported by the
 *                      pinned SDK version's vision input, so they're stored without
 *                      auto-extracted fields (dealer/accountant fills them in manually).
 */
export async function extractBillData(base64Data: string, mimeType: string): Promise<BillOcrData> {
  if (!process.env.ANTHROPIC_API_KEY) return EMPTY_RESULT;
  if (!isSupportedImage(mimeType)) {
    return { ...EMPTY_RESULT, raw_text: 'Uploaded as PDF — automatic OCR not available for this file type; please confirm details manually.' };
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
          {
            type: 'text',
            text: `This is a bill/invoice/receipt from an Indian tractor dealership's records (could be a tractor purchase/sale invoice, spare parts bill, or cash voucher).
Extract the following as JSON only (no markdown, no explanation):
{
  "vendor": "<company/person name on the bill, or null>",
  "invoice_number": "<invoice/bill number, or null>",
  "date": "<date in YYYY-MM-DD format, or null>",
  "amount": <total amount as a number in INR, or null>,
  "gst_number": "<GSTIN if present, or null>",
  "category_guess": "<one of: tractor_purchase, tractor_sales, spare_purchase, spare_sales, cash_voucher, other>",
  "raw_text": "<brief 1-2 line summary of what this document is>"
}`,
          },
        ],
      }],
    });

    const block = message.content[0];
    if (block.type !== 'text') return EMPTY_RESULT;
    const cleaned = block.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    const parsed = JSON.parse(cleaned);
    return { ...EMPTY_RESULT, ...parsed };
  } catch (err) {
    console.error('[ocr] extraction failed:', (err as Error).message);
    return EMPTY_RESULT;
  }
}
