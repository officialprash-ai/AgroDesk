/**
 * Voice responder — the "brain" between STT and TTS. Reuses the existing Gemini
 * REST helper (lib/llm.ts) so voice replies use the same model/config as the
 * rest of AgroDesk. Maintains per-call conversation history.
 *
 * Swap it out via `createAgroDeskEngine(ctx, { responder })` to route through a
 * multiagent layer instead of a single Gemini call.
 */

import { geminiText, type LlmMessage } from '../../lib/llm.js';

export interface Responder {
  /** Reply for a finalized user utterance (streamed as chunks). */
  respond(userText: string): AsyncIterable<string>;
}

/** Default AgroDesk voice persona (Marathi-first tractor dealership agent). */
export function defaultVoiceSystemPrompt(langName = 'Marathi'): string {
  return (
    process.env.VOICE_SYSTEM_PROMPT ??
    `You are AgroDesk's AI voice agent for a tractor dealership in Maharashtra, India.
You speak with farmers on a phone call about tractor enquiries, pricing, EMI, service, and booking visits.
Respond in ${langName}, in short spoken sentences (1-2 sentences) suited to a live phone call.
Use Indian currency (₹). Never invent prices — say you will check and confirm.
Scope: tractor sales and service only. Escalate complex legal/financial questions to a human agent.`
  );
}

export class GeminiVoiceResponder implements Responder {
  private readonly history: LlmMessage[] = [];

  constructor(
    private readonly system: string = defaultVoiceSystemPrompt(),
    private readonly maxTokens = 300,
  ) {}

  async *respond(userText: string): AsyncIterable<string> {
    this.history.push({ role: 'user', content: userText });
    // geminiText is non-streaming; voice replies are short so we yield once.
    // For lower latency, add a streamGenerateContent helper to lib/llm.ts later.
    const reply = await geminiText({
      system: this.system,
      messages: this.history,
      maxTokens: this.maxTokens,
    });
    this.history.push({ role: 'assistant', content: reply });
    if (reply) yield reply;
  }
}
