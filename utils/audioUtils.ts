// Declare lamejs for typescript
declare const lamejs: any;

/**
 * Decodes base64 string to Uint8Array bytes
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw 16-bit PCM (from Gemini TTS) into a Web Audio AudioBuffer
 */
export async function decodePcmToAudioBuffer(
  pcmBytes: Uint8Array,
  sampleRate = 24000,
  numChannels = 1
): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate,
  });

  const dataInt16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  return buffer;
}

/**
 * Apply pitch and speed shifts to an AudioBuffer via Web Audio OfflineAudioContext
 */
export async function processAudioBufferEffects(
  audioBuffer: AudioBuffer,
  speed = 1.0,
  pitchSemitones = 0
): Promise<AudioBuffer> {
  if (speed === 1.0 && pitchSemitones === 0) {
    return audioBuffer;
  }

  const pitchFactor = Math.pow(2, pitchSemitones / 12);
  const totalRate = Math.max(0.2, speed * pitchFactor);
  const newLength = Math.ceil(audioBuffer.length / totalRate);

  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.max(1, newLength),
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = Math.max(0.1, speed);
  source.detune.value = pitchSemitones * 100;

  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Converts an AudioBuffer to a standard, lossless WAV Blob (Universal & Instant)
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numFrames = buffer.length;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // FMT sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Converts an AudioBuffer to an MP3 Blob using lamejs with automatic WAV fallback
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 128): Blob {
  try {
    if (typeof lamejs === "undefined" || !lamejs.Mp3Encoder) {
      console.warn("lamejs is not loaded, exporting as WAV instead.");
      return audioBufferToWavBlob(buffer);
    }

    const numChannels = buffer.numberOfChannels;
    const mp3Encoder = new lamejs.Mp3Encoder(numChannels, buffer.sampleRate, kbps);
    const mp3Data: Int8Array[] = [];

    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;

    const samples = new Int16Array(buffer.length * numChannels);

    for (let i = 0; i < buffer.length; i++) {
      const l = Math.max(-1, Math.min(1, left[i]));
      samples[i * numChannels] = l < 0 ? l * 0x8000 : l * 0x7fff;
      if (numChannels > 1) {
        const r = Math.max(-1, Math.min(1, right[i]));
        samples[i * numChannels + 1] = r < 0 ? r * 0x8000 : r * 0x7fff;
      }
    }

    const sampleBlockSize = 1152;
    for (let i = 0; i < samples.length; i += sampleBlockSize * numChannels) {
      const chunk = samples.subarray(i, i + sampleBlockSize * numChannels);
      let mp3buf;
      if (numChannels === 1) {
        mp3buf = mp3Encoder.encodeBuffer(chunk);
      } else {
        const leftChunk = new Int16Array(chunk.length / 2);
        const rightChunk = new Int16Array(chunk.length / 2);
        for (let j = 0; j < chunk.length / 2; j++) {
          leftChunk[j] = chunk[j * 2];
          rightChunk[j] = chunk[j * 2 + 1];
        }
        mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      }

      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3Encoder.flush();
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    if (mp3Data.length === 0) {
      return audioBufferToWavBlob(buffer);
    }

    return new Blob(mp3Data, { type: "audio/mpeg" });
  } catch (err) {
    console.error("Error during MP3 encoding, falling back to WAV:", err);
    return audioBufferToWavBlob(buffer);
  }
}

/**
 * Extracts 50-100 peak amplitudes from AudioBuffer for drawing visual waveforms
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numPoints = 60): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPoints);
  const peaks: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1, Math.max(0.08, max)));
  }

  return peaks;
}

/**
 * Converts a File or Blob into base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
