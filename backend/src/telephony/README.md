# Telephony — real-time AI voice

Bidirectional AI voice calls for AgroDesk. **Plivo primary, Exotel streaming
stub**, wired to the existing Gemini (`lib/llm.ts`) and Sarvam (`lib/sarvam.ts`)
helpers. Everything internal is raw PCM (16-bit LE, 8 kHz, mono) — Plivo, Exotel,
and Sarvam all agree on this wire format, so there is no transcoding.

> This is the new **streaming** path. The existing one-way flow
> (TTS → Exotel `<Play>` a stored audio URL → hangup) in `lib/exotel.ts` is
> unchanged and still works.

## Pipeline

```
Plivo  ──WSS──►  PlivoAdapter  ──PCM──►  Sarvam STT (mr-IN, saaras:v3, 8k)
                                              │ transcript
                                              ▼
                                    Gemini (lib/llm.ts geminiText)
                                              │ reply
                                              ▼
  caller  ◄──WSS──  PlivoAdapter  ◄──PCM──  Sarvam TTS (lib/sarvam.ts, wav→L16 8k)
```

Barge-in: Sarvam VAD `START_SPEECH` aborts the in-flight reply and flushes
provider playback (`clearAudio`).

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Canonical types, `TelephonyEvent` union, provider/session interfaces |
| `bridge.ts` | `TELEPHONY_PROVIDER` factory + `attachTelephonyBridge(server)` WS mount |
| `adapters/plivo.ts` | Plivo Voice API + Audio Streaming (bidirectional WSS) |
| `adapters/exotel.ts` | Exotel Voicebot streaming stub (interface-complete) |
| `voice/stt.ts` | Sarvam streaming STT over WebSocket |
| `voice/tts.ts` | Frames `lib/sarvam.textToSpeech` WAV → 20 ms PCM |
| `voice/responder.ts` | Gemini voice responder via `lib/llm.geminiText` (per-call history) |
| `voice/engine.ts` | `AgroDeskVoiceEngine` — STT→Gemini→TTS + barge-in |
| `smoke.ts` | End-to-end test with no phone leg (`npm run voice:smoke`) |

## Wiring (already applied to `src/index.ts`)

```ts
const server = createServer(app);
attachTelephonyBridge(server);          // WS at /telephony/stream
server.listen(PORT, ...);
// public: POST /api/telephony/answer → Plivo <Stream> XML
```

The bridge is wrapped in try/catch, so the app boots even if Plivo creds are
absent.

## Environment (see backend/.env.example)

```
TELEPHONY_PROVIDER=plivo
TELEPHONY_PUBLIC_WSS_URL=wss://<backend-host>/telephony/stream
PLIVO_AUTH_ID= / PLIVO_AUTH_TOKEN= / PLIVO_FROM_NUMBER=
# reuses existing SARVAM_API_KEY, GEMINI_API_KEY, GEMINI_MODEL
```

Plivo app answer URL → `https://<backend-host>/api/telephony/answer`.

## Test & verify

```bash
npm install         # refresh package-lock.json after ws/plivo were added
npm run typecheck
npm run voice:smoke # synthesizes a Marathi caller line, answers it → smoke-reply.wav
```

## Verify before production

- Confirm Plivo Audio Streaming frame keys and the `plivo` SDK
  `calls.create`/`calls.hangup` signatures for your installed version.
- Confirm the Sarvam STT per-message audio frame shape for your account.
- `adapters/exotel.ts` `initiateCall`/`hangupCall` are stubs — implement before
  Exotel failover.
