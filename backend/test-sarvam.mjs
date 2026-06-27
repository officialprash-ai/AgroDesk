/**
 * Quick Sarvam TTS test — run with: node test-sarvam.mjs
 * Needs SARVAM_API_KEY in env or .env file
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load .env manually
if (existsSync('.env')) {
  const lines = readFileSync('.env', 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
console.log('SARVAM_API_KEY:', SARVAM_API_KEY ? `${SARVAM_API_KEY.slice(0,8)}...` : '❌ NOT SET');

if (!SARVAM_API_KEY) {
  console.error('\nSet SARVAM_API_KEY in backend/.env and re-run');
  process.exit(1);
}

const text = 'नमस्कार, आपण अॅग्रोडेस्क वरून बोलत आहोत. आपला ट्रॅक्टर विकण्यात आम्ही मदत करतो.';
console.log('\nCalling Sarvam TTS...');
console.log('Text:', text);

const res = await fetch('https://api.sarvam.ai/text-to-speech', {
  method: 'POST',
  headers: {
    'api-subscription-key': SARVAM_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inputs: [text],
    target_language_code: 'mr-IN',
    speaker: 'anushka',
    pitch: 0,
    pace: 0.9,
    loudness: 1.5,
    speech_sample_rate: 8000,
    enable_preprocessing: true,
    model: 'bulbul:v2',
  }),
});

console.log('Status:', res.status, res.statusText);

if (!res.ok) {
  const body = await res.text();
  console.error('Error:', body);
  process.exit(1);
}

const data = await res.json();
console.log('Response keys:', Object.keys(data));

if (data.audios?.[0]) {
  const buf = Buffer.from(data.audios[0], 'base64');
  writeFileSync('test-sarvam-output.wav', buf);
  console.log(`\n✅ Audio saved: test-sarvam-output.wav (${buf.length} bytes)`);
} else {
  console.log('Response:', JSON.stringify(data, null, 2));
}
