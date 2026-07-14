/** Telephony + Sarvam/Gemini voice — public surface. */
export * from './types.js';
export {
  attachTelephonyBridge,
  createTelephonyProvider,
  getTelephonyProvider,
  TELEPHONY_PROVIDER,
} from './bridge.js';
export type { VoiceEngine, BridgeDeps } from './bridge.js';
export { PlivoAdapter } from './adapters/plivo.js';
export { ExotelAdapter } from './adapters/exotel.js';
export { AgroDeskVoiceEngine, createAgroDeskEngine } from './voice/engine.js';
export type { EngineOptions } from './voice/engine.js';
export { SarvamSttSession } from './voice/stt.js';
export { SarvamTtsFramer } from './voice/tts.js';
export { GeminiVoiceResponder, defaultVoiceSystemPrompt } from './voice/responder.js';
export type { Responder } from './voice/responder.js';
