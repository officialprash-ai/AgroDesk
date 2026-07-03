// Gemini LLM helper — Google Generative Language API (v1beta).
// Replaces Anthropic across AI handlers, OCR, and webhooks.
// Model overridable via GEMINI_MODEL; default gemini-2.5-flash.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const endpoint = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface LlmMessage { role: 'user' | 'assistant'; content: string; }

async function callGemini(body: unknown): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p?.text ?? '')
    .join('');
}

// Plain text / chat completion. Maps assistant->model for Gemini.
export async function geminiText(opts: { system?: string; messages: LlmMessage[]; maxTokens?: number }): Promise<string> {
  const contents = opts.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body: any = { contents, generationConfig: { maxOutputTokens: opts.maxTokens ?? 800, thinkingConfig: { thinkingBudget: 0 } } };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  return callGemini(body);
}

// Vision: one image + a text prompt.
export async function geminiVision(opts: { base64: string; mimeType: string; prompt: string; maxTokens?: number }): Promise<string> {
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
        { text: opts.prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: opts.maxTokens ?? 800, thinkingConfig: { thinkingBudget: 0 } },
  };
  return callGemini(body);
}

// Strip ```json fences some models add, then JSON.parse.
export function parseJsonLoose<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
