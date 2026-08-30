import { useState, useCallback } from "react";

export interface ScriptSuggestion {
  script: string;
  title: string;
  category: string;
  estimatedDuration: string;
  tips: string[];
  variations?: string[];
}

export const useScriptAssistant = () => {
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuggestion, setLastSuggestion] = useState<ScriptSuggestion | null>(null);

  const generateOrEnhanceScript = useCallback(
    async (
      prompt: string,
      category = "ivr",
      tone = "argentine_friendly",
      companyName = "Solvra"
    ) => {
      setIsEnhancing(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/enhance-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            category,
            tone,
            companyName,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "No se pudo generar el guion.");
        }

        setLastSuggestion(data.data);
        return data.data as ScriptSuggestion;
      } catch (err: any) {
        console.error("Script assistant error:", err);
        setError(err.message || "Error al redactar con IA.");
        return null;
      } finally {
        setIsEnhancing(false);
      }
    },
    []
  );

  return {
    generateOrEnhanceScript,
    isEnhancing,
    error,
    lastSuggestion,
  };
};
