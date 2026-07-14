/**
 * Smoke test: run the full Sarvam STT → Gemini → Sarvam TTS loop WITHOUT any
 * telephony provider. Proves the voice engine end-to-end before touching Plivo.
 *
 *   npm run voice:smoke                 # synthesizes a Marathi caller line, answers it
 *   npm run voice:smoke -- ./caller.wav # or feed your own 8 kHz WAV
 *
 * Requires SARVAM_API_KEY + GEMINI_API_KEY (read from backend/.env below).
 * Writes smoke-reply.wav.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { textToSpeech } from '../lib/sarvam.js';
import { createAgroDeskEngine } from './index.js';
import { CANONICAL_FORMAT } from './types.js';
import { stripWavHeader } from './voice/tts.js';

// --- minimal .env loader (project has no dotenv dependency) ---
function loadEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const SAMPLE_RATE = 8000;
const FRAME_BYTES = 320;
const DEFAULT_TEXT = process.env.SMOKE_TTS_TEXT ?? 'नमस्कार, माझ्या ट्रॅक्टरची सर्व्हिस कधी आहे?';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getCallerPcm(): Promise<Buffer> {
  const path = process.argv[2];
  if (path) {
    console.log(`[smoke] loading caller audio from ${path}`);
    return stripWavHeader(readFileSync(path));
  }
  console.log(`[smoke] synthesizing caller audio via Sarvam TTS:\n  "${DEFAULT_TEXT}"`);
  return stripWavHeader(await textToSpeech(DEFAULT_TEXT, 'mr'));
}

async function main() {
  const callerPcm = await getCallerPcm();
  console.log(`[smoke] caller PCM: ${callerPcm.length} bytes (~${(callerPcm.length / (SAMPLE_RATE * 2)).toFixed(1)}s)`);

  const replyChunks: Buffer[] = [];
  const engine = createAgroDeskEngine({ callId: 'smoke-test', metadata: { dealershipId: 'demo' } });
  engine.onReplyAudio((pcm) => replyChunks.push(Buffer.from(pcm)));
  engine.onBargeIn(() => console.log('[smoke] barge-in signalled'));

  console.log('[smoke] starting engine (opens Sarvam STT socket)...');
  await engine.start(CANONICAL_FORMAT);

  console.log('[smoke] streaming caller audio in 20ms frames...');
  for (let i = 0; i < callerPcm.length; i += FRAME_BYTES) {
    engine.handleCallerAudio(callerPcm.subarray(i, Math.min(i + FRAME_BYTES, callerPcm.length)));
    await sleep(20);
  }
  const silence = Buffer.alloc(FRAME_BYTES);
  for (let i = 0; i < 25; i++) {
    engine.handleCallerAudio(silence);
    await sleep(20);
  }

  console.log('[smoke] waiting for reply (up to 20s)...');
  const deadline = Date.now() + 20_000;
  let last = -1;
  while (Date.now() < deadline) {
    await sleep(500);
    if (replyChunks.length !== last) last = replyChunks.length;
    else if (replyChunks.length > 0) break;
  }

  await engine.stop();
  const replyPcm = Buffer.concat(replyChunks);
  if (replyPcm.length === 0) {
    console.error('[smoke] ✗ no reply audio — check SARVAM_API_KEY / GEMINI_API_KEY and logs above.');
    process.exit(1);
  }
  writeFileSync('smoke-reply.wav', wrapWav(replyPcm, SAMPLE_RATE));
  console.log(`[smoke] ✓ wrote smoke-reply.wav (${replyPcm.length} bytes, ~${(replyPcm.length / (SAMPLE_RATE * 2)).toFixed(1)}s). Play it.`);
  process.exit(0);
}

function wrapWav(pcm: Buffer, sampleRate: number): Buffer {
  const h = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

main().catch((err) => {
  console.error('[smoke] failed:', err);
  process.exit(1);
});
