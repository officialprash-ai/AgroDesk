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

/**
 * Streaming chat completion (SSE). Yields text deltas as the model produces
 * them so latency-sensitive callers — the live voice agent above all — can start
 * speaking the first sentence while the rest is still being generated, instead
 * of waiting for the whole reply.
 */
export async function* geminiTextStream(opts: {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
}): AsyncGenerator<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const contents = opts.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body: any = {
    contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 800,
      // No "thinking" pause before the first token — critical on a phone call.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent` +
    `?alt=sse&key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini stream ${res.status}: ${await res.text()}`);
  if (!res.body) throw new Error('Gemini stream: empty body');

  const decoder = new TextDecoder();
  let buf = '';
  // Node's fetch body is an async-iterable web stream.
  for await (const bytes of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(bytes, { stream: true });
    // SSE frames are separated by a blank line; each line we care about is "data: {...}".
    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload) as any;
        const text = (json?.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => p?.text ?? '')
          .join('');
        if (text) yield text;
      } catch {
        // Partial/keep-alive frame — ignore and wait for more bytes.
      }
    }
  }
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
