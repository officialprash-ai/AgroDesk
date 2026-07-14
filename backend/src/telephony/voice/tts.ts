/**
 * TTS framer — reuses the existing Sarvam REST TTS (lib/sarvam.ts, WAV @ 8 kHz),
 * strips the WAV header to raw PCM, and yields 20 ms frames so playback can be
 * cut mid-utterance on barge-in.
 */

import { textToSpeech } from '../../lib/sarvam.js';
import type { PcmChunk } from '../types.js';

/** 20 ms of 8 kHz / 16-bit / mono = 160 samples = 320 bytes. */
const FRAME_BYTES = 320;

export class SarvamTtsFramer {
  constructor(private readonly language = 'mr') {}

  async *stream(text: string): AsyncIterable<PcmChunk> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const wav = await textToSpeech(trimmed, this.language); // Buffer (WAV, 8k)
    const pcm = stripWavHeader(wav);
    for (let i = 0; i < pcm.length; i += FRAME_BYTES) {
      yield pcm.subarray(i, Math.min(i + FRAME_BYTES, pcm.length));
    }
  }
}

/** Return the PCM payload of a WAV buffer by locating the `data` sub-chunk. */
export function stripWavHeader(buf: Buffer): Buffer {
  if (
    buf.length < 12 ||
    buf.toString('ascii', 0, 4) !== 'RIFF' ||
    buf.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    return buf; // already raw PCM
  }
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (chunkId === 'data') {
      return buf.subarray(dataStart, Math.min(dataStart + chunkSize, buf.length));
    }
    offset = dataStart + chunkSize + (chunkSize % 2);
  }
  return buf;
}
