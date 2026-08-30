import { useState, useCallback } from "react";
import {
  audioBufferToMp3Blob,
  audioBufferToWavBlob,
  extractWaveformPeaks,
} from "../utils/audioUtils";

export type MergeMode = "sequential" | "overlay";

export interface MergedAudioResult {
  mp3Url: string;
  wavUrl: string;
  durationSeconds: number;
  waveform: number[];
  mode: MergeMode;
}

export const useAudioMerger = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<MergedAudioResult | null>(null);

  const mergeAndEncode = useCallback(
    async (
      file1: File | Blob,
      file2: File | Blob,
      options?: {
        mode?: MergeMode;
        silenceGapSeconds?: number;
        voiceVolume?: number; // 0.0 to 1.0 (for overlay)
        bgmVolume?: number; // 0.0 to 1.0 (for overlay)
        loopBgm?: boolean;
      }
    ) => {
      setIsProcessing(true);
      setError(null);
      setMergedResult(null);

      const mode = options?.mode || "sequential";
      const silenceGap = options?.silenceGapSeconds ?? 0.3;
      const voiceVol = options?.voiceVolume ?? 1.0;
      const bgmVol = options?.bgmVolume ?? 0.3;

      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 1. Decode both audio files into AudioBuffers
        const [arrayBuf1, arrayBuf2] = await Promise.all([
          file1.arrayBuffer(),
          file2.arrayBuffer(),
        ]);

        const [buffer1, buffer2] = await Promise.all([
          audioContext.decodeAudioData(arrayBuf1),
          audioContext.decodeAudioData(arrayBuf2),
        ]);

        const sampleRate = Math.max(buffer1.sampleRate, buffer2.sampleRate);
        const numChannels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);

        let renderedBuffer: AudioBuffer;

        if (mode === "sequential") {
          // Sequential Concatenation: Buffer 1 -> Silence -> Buffer 2
          const silenceFrames = Math.floor(silenceGap * sampleRate);
          const totalLength = buffer1.length + silenceFrames + buffer2.length;

          const offlineContext = new OfflineAudioContext(numChannels, totalLength, sampleRate);

          const source1 = offlineContext.createBufferSource();
          source1.buffer = buffer1;

          const source2 = offlineContext.createBufferSource();
          source2.buffer = buffer2;

          source1.connect(offlineContext.destination);
          source2.connect(offlineContext.destination);

          source1.start(0);
          const startSecond = buffer1.duration + silenceGap;
          source2.start(startSecond);

          renderedBuffer = await offlineContext.startRendering();
        } else {
          // Overlay / Background Music Layering:
          // Buffer1 (Voice) on top of Buffer2 (BGM)
          const totalLength = Math.max(buffer1.length, buffer2.length);
          const offlineContext = new OfflineAudioContext(numChannels, totalLength, sampleRate);

          // Voice Track
          const voiceSource = offlineContext.createBufferSource();
          voiceSource.buffer = buffer1;
          const voiceGain = offlineContext.createGain();
          voiceGain.gain.value = voiceVol;
          voiceSource.connect(voiceGain);
          voiceGain.connect(offlineContext.destination);

          // BGM Track
          const bgmSource = offlineContext.createBufferSource();
          bgmSource.buffer = buffer2;
          if (options?.loopBgm && buffer2.length < buffer1.length) {
            bgmSource.loop = true;
          }
          const bgmGain = offlineContext.createGain();
          bgmGain.gain.value = bgmVol;
          bgmSource.connect(bgmGain);
          bgmGain.connect(offlineContext.destination);

          voiceSource.start(0);
          bgmSource.start(0);

          renderedBuffer = await offlineContext.startRendering();
        }

        // 2. Export to MP3 and WAV
        const mp3Blob = audioBufferToMp3Blob(renderedBuffer, 128);
        const wavBlob = audioBufferToWavBlob(renderedBuffer);

        const mp3Url = URL.createObjectURL(mp3Blob);
        const wavUrl = URL.createObjectURL(wavBlob);
        const waveform = extractWaveformPeaks(renderedBuffer, 60);

        const result: MergedAudioResult = {
          mp3Url,
          wavUrl,
          durationSeconds: renderedBuffer.duration,
          waveform,
          mode,
        };

        setMergedResult(result);
        return result;
      } catch (err: any) {
        console.error("Audio Merger Error:", err);
        setError(err.message || "Error al unir los archivos de audio.");
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    mergeAndEncode,
    isProcessing,
    error,
    mergedResult,
    mergedAudioUrl: mergedResult?.mp3Url || null,
  };
};
