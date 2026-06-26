/**
 * Sarvam AI — Text-to-Speech (Marathi & other Indian languages)
 * Docs: https://docs.sarvam.ai/api-reference-docs/text-to-speech
 */

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

// Maps our internal language codes to Sarvam BCP-47 codes
const LANG_MAP: Record<string, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
};

// Best speaker per language (Sarvam's available voices)
const SPEAKER_MAP: Record<string, string> = {
  'mr-IN': 'anushka',
  'hi-IN': 'anushka',
  'en-IN': 'anushka',
  'gu-IN': 'anushka',
  'pa-IN': 'anushka',
  'ta-IN': 'anushka',
  'te-IN': 'anushka',
  'kn-IN': 'anushka',
  'bn-IN': 'anushka',
};

export async function textToSpeech(text: string, language = 'mr'): Promise<Buffer> {
  if (!SARVAM_API_KEY) throw new Error('SARVAM_API_KEY is not set');

  const langCode = LANG_MAP[language] ?? 'mr-IN';
  const speaker = SPEAKER_MAP[langCode] ?? 'meera';

  // Sarvam has a 500-char limit per request — split if needed
  const chunks = splitText(text, 450);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [chunk],
        target_language_code: langCode,
        speaker,
        pitch: 0,
        pace: 0.9,          // slightly slower for phone calls
        loudness: 1.5,
        speech_sample_rate: 8000,  // 8kHz telephony quality
        enable_preprocessing: true,
        model: 'bulbul:v2',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sarvam TTS error ${res.status}: ${body}`);
    }

    const data = await res.json() as { audios: string[] };
    audioBuffers.push(Buffer.from(data.audios[0], 'base64'));
  }

  // Concatenate all chunks (raw WAV — skip the header on all but first)
  if (audioBuffers.length === 1) return audioBuffers[0];

  // Simple concatenation of raw WAV buffers (works for 8kHz mono PCM)
  const totalLength = audioBuffers.reduce((s, b) => s + b.length, 0);
  const combined = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    buf.copy(combined, offset);
    offset += buf.length;
  }
  return combined;
}

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of text.split(/(?<=[।.!?])\s+/)) {
    if ((current + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
