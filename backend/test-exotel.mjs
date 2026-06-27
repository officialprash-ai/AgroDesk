/**
 * Quick Exotel outbound call test — run with: node test-exotel.mjs <phone_number>
 * e.g.: node test-exotel.mjs 9876543210
 * Needs EXOTEL_* vars in .env
 */
import { readFileSync, existsSync } from 'fs';

// Load .env manually
if (existsSync('.env')) {
  const lines = readFileSync('.env', 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const { EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID, EXOTEL_PHONE, BACKEND_URL } = process.env;

console.log('Env check:');
console.log('  EXOTEL_API_KEY:  ', EXOTEL_API_KEY   ? `${EXOTEL_API_KEY.slice(0,6)}...`   : '❌ NOT SET');
console.log('  EXOTEL_API_TOKEN:', EXOTEL_API_TOKEN  ? `${EXOTEL_API_TOKEN.slice(0,6)}...` : '❌ NOT SET');
console.log('  EXOTEL_SID:      ', EXOTEL_SID        ?? '❌ NOT SET');
console.log('  EXOTEL_PHONE:    ', EXOTEL_PHONE       ?? '❌ NOT SET');
console.log('  BACKEND_URL:     ', BACKEND_URL        ?? '❌ NOT SET');

const missing = [EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID, EXOTEL_PHONE].some(v => !v);
if (missing) {
  console.error('\nSet missing EXOTEL_* vars in backend/.env and re-run');
  process.exit(1);
}

const toPhone = process.argv[2];
if (!toPhone) {
  console.error('\nUsage: node test-exotel.mjs <phone_number>');
  console.error('Example: node test-exotel.mjs 9876543210');
  process.exit(1);
}

// Use a simple Say ExoML for test (no Sarvam audio needed)
// We serve this from a public URL — or use a test ExoML
const backendUrl = BACKEND_URL ?? 'https://agrodesk-production.up.railway.app';

// Build form data for Exotel API
const params = new URLSearchParams({
  From: EXOTEL_PHONE,
  To: toPhone,
  CallerId: EXOTEL_PHONE,
  // Use Exotel's passthru endpoint with our ExoML URL
  // We'll use a simple test ExoML URL
  Url: `${backendUrl}/api/test-exoml`,
  StatusCallback: `${backendUrl}/webhooks/exotel/call-status`,
  TimeLimit: '30',
  Record: 'false',
});

const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`;
console.log(`\nPlacing call: ${EXOTEL_PHONE} → ${toPhone}`);
console.log('URL:', url);

const credentials = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64');
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
});

console.log('\nStatus:', res.status, res.statusText);
const text = await res.text();
try {
  const data = JSON.parse(text);
  console.log('Response:', JSON.stringify(data, null, 2));
  if (data.Call?.Sid) {
    console.log(`\n✅ Call placed! SID: ${data.Call.Sid}, Status: ${data.Call.Status}`);
  }
} catch {
  console.log('Raw response:', text);
}
