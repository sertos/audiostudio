import { useState, useCallback } from "react";
import {
  base64ToUint8Array,
  decodePcmToAudioBuffer,
  processAudioBufferEffects,
  audioBufferToMp3Blob,
  audioBufferToWavBlob,
  extractWaveformPeaks,
} from "../utils/audioUtils";

export interface GeneratedSpeechItem {
  id: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  wavUrl: string;
  durationSeconds: number;
  waveform: number[];
  timestamp: Date;
  speed: number;
  pitch: number;
  style: string;
}

export const useTextToSpeech = () => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<GeneratedSpeechItem | null>(null);
  const [history, setHistory] = useState<GeneratedSpeechItem[]>([]);

  const generateSpeech = useCallback(
    async (
      text: string,
      voiceName = "Kore",
      speed = 1.0,
      pitch = 0,
      style = "neutral",
      customInstruction = ""
    ) => {
      setIsGenerating(true);
      setGenError(null);

      try {
        const response = await fetch("/api/tts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            voiceName,
            style,
            customInstruction,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "No se pudo generar la voz con IA.");
        }

        // 1. Decode raw PCM from Gemini TTS
        const rawBytes = base64ToUint8Array(data.audioBase64);
        let audioBuffer = await decodePcmToAudioBuffer(rawBytes, data.sampleRate || 24000, 1);

        // 2. Apply Speed and Pitch Tuning if customized
        if (speed !== 1.0 || pitch !== 0) {
          audioBuffer = await processAudioBufferEffects(audioBuffer, speed, pitch);
        }

        // 3. Create MP3 and WAV blobs for download and playback
        const mp3Blob = audioBufferToMp3Blob(audioBuffer, 128);
        const wavBlob = audioBufferToWavBlob(audioBuffer);

        const mp3Url = URL.createObjectURL(mp3Blob);
        const wavUrl = URL.createObjectURL(wavBlob);
        const waveform = extractWaveformPeaks(audioBuffer, 50);

        const item: GeneratedSpeechItem = {
          id: `speech_${Date.now()}`,
          text,
          voiceName,
          audioUrl: mp3Url,
          wavUrl: wavUrl,
          durationSeconds: audioBuffer.duration,
          waveform,
          timestamp: new Date(),
          speed,
          pitch,
          style,
        };

        setCurrentResult(item);
        setHistory((prev) => [item, ...prev.slice(0, 9)]);
        return item;
      } catch (err: any) {
        console.error("TTS Generation Error:", err);
        setGenError(err.message || "Error al procesar el audio.");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    generateSpeech,
    isGenerating,
    genError,
    currentResult,
    generatedAudioUrl: currentResult?.audioUrl || null,
    history,
    clearHistory: () => setHistory([]),
  };
};
