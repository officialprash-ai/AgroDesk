/**
 * Bill/receipt OCR via Gemini vision — used by AI Accountant (Module F).
 * Reads the bill image directly and returns structured fields for bookkeeping.
 */
import { geminiVision, parseJsonLoose } from './llm.js';

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

const PROMPT = `This is a bill/invoice/receipt from an Indian tractor dealership's records (could be a tractor purchase/sale invoice, spare parts bill, or cash voucher).
Extract the following as JSON only (no markdown, no explanation):
{
  "vendor": "<company/person name on the bill, or null>",
  "invoice_number": "<invoice/bill number, or null>",
  "date": "<date in YYYY-MM-DD format, or null>",
  "amount": <total amount as a number in INR, or null>,
  "gst_number": "<GSTIN if present, or null>",
  "category_guess": "<one of: tractor_purchase, tractor_sales, spare_purchase, spare_sales, cash_voucher, other>",
  "raw_text": "<brief 1-2 line summary of what this document is>"
}`;

/**
 * Extract structured data from a bill/receipt/invoice image.
 * @param base64Data  Raw base64 (no data: prefix)
 * @param mimeType    e.g. 'image/jpeg', 'image/png'
 */
export async function extractBillData(base64Data: string, mimeType: string): Promise<BillOcrData> {
  if (!process.env.GEMINI_API_KEY) return EMPTY_RESULT;
  if (!isSupportedImage(mimeType)) {
    return { ...EMPTY_RESULT, raw_text: 'Uploaded as PDF — automatic OCR not available for this file type; please confirm details manually.' };
  }

  try {
    const text = await geminiVision({ base64: base64Data, mimeType, prompt: PROMPT, maxTokens: 500 });
    if (!text) return EMPTY_RESULT;
    const parsed = parseJsonLoose<Partial<BillOcrData>>(text);
    return { ...EMPTY_RESULT, ...parsed };
  } catch (err) {
    console.error('[ocr] extraction failed:', (err as Error).message);
    return EMPTY_RESULT;
  }
}
