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
  /** Optional: record the opener the agent already spoke, for coherent continuity. */
  seedAssistant?(text: string): void;
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

/**
 * Build a personalized, conversational persona for a specific call. The point is
 * for the agent to actually converse — react to what the caller says, ask
 * follow-ups, address them by name — rather than recite a fixed script.
 */
export function buildVoiceSystemPrompt(opts: {
  langName?: string;
  dealerName?: string;
  dealerCity?: string;
  contactName?: string;
  goal?: string;
}): string {
  if (process.env.VOICE_SYSTEM_PROMPT) return process.env.VOICE_SYSTEM_PROMPT;
  const langName = opts.langName || 'Marathi';
  const dealer = opts.dealerName || 'the tractor dealership';
  const where = opts.dealerCity ? ` in ${opts.dealerCity}` : '';
  const who = opts.contactName ? ` You are speaking with ${opts.contactName}; address them naturally by name.` : '';
  const goal = opts.goal
    ? ` Your objective for this call: ${opts.goal.replace(/\s+/g, ' ').trim().slice(0, 600)}`
    : '';
  return (
    `You are a warm, natural human sales representative from ${dealer}${where}, calling a farmer on the phone.${who}` +
    ` Speak ONLY in ${langName}, in short spoken sentences (1-2 at a time), like a real phone conversation.` +
    ` This is a live two-way call: LISTEN to what the caller says and respond directly to THEIR words and questions —` +
    ` do NOT recite a script or dump information. Ask one relevant follow-up question at a time, acknowledge their answers,` +
    ` and guide toward a showroom visit or next step. Use Indian currency (₹); never invent exact prices — offer to confirm.` +
    ` Keep it friendly and human. Stay on tractor sales, exchange, finance, and service.` +
    goal
  );
}

export class GeminiVoiceResponder implements Responder {
  private readonly history: LlmMessage[] = [];

  constructor(
    private readonly system: string = defaultVoiceSystemPrompt(),
    private readonly maxTokens = 300,
  ) {}

  /** Seed the opener the agent already spoke so replies continue coherently. */
  seedAssistant(text: string): void {
    const t = text.trim();
    if (t) this.history.push({ role: 'assistant', content: t });
  }

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
