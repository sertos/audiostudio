import { useState, useCallback } from "react";
import { fileToBase64 } from "../utils/audioUtils";

export interface AudioAnalysisResult {
  transcription: string;
  explanation: string;
  summaryShort: string;
  keyPoints: string[];
  tone: string;
  languageDetected: string;
  actionItems?: string[];
}

export interface AudioChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export const useAudioExplainer = () => {
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [chatMessages, setChatMessages] = useState<AudioChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  const explainAudio = useCallback(
    async (file: File | Blob, style: "argentine_simple" | "formal_executive" | "bullet_points" | "eli5" = "argentine_simple") => {
      setIsExplaining(true);
      setExplanationError(null);
      setAnalysisResult(null);

      try {
        const base64Data = await fileToBase64(file);
        const mimeType = file.type || "audio/mp3";

        const response = await fetch("/api/ai/explain-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType,
            style,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "No se pudo completar el análisis del audio.");
        }

        setAnalysisResult(data.analysis);
        return data.analysis as AudioAnalysisResult;
      } catch (err: any) {
        console.error("Audio explainer error:", err);
        setExplanationError(err.message || "Error al comunicarse con Gemini 3.7 Flash.");
        return null;
      } finally {
        setIsExplaining(false);
      }
    },
    []
  );

  const askAudioQuestion = useCallback(
    async (file: File | Blob, question: string) => {
      if (!question.trim()) return;
      setIsAsking(true);

      const userMsg: AudioChatMessage = {
        role: "user",
        text: question,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      try {
        const base64Data = await fileToBase64(file);
        const mimeType = file.type || "audio/mp3";

        const response = await fetch("/api/ai/audio-qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType,
            question,
            history: chatMessages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Error al procesar la respuesta.");
        }

        const modelMsg: AudioChatMessage = {
          role: "model",
          text: data.answer,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, modelMsg]);
      } catch (err: any) {
        const errorMsg: AudioChatMessage = {
          role: "model",
          text: `⚠️ Error: ${err.message || "No se pudo obtener la respuesta."}`,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsAsking(false);
      }
    },
    [chatMessages]
  );

  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setExplanationError(null);
    setChatMessages([]);
  }, []);

  return {
    explainAudio,
    isExplaining,
    explanationError,
    analysisResult,
    explanationResult: analysisResult?.explanation || null,
    chatMessages,
    isAsking,
    askAudioQuestion,
    resetAnalysis,
  };
};
