import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 8080;

// Enable JSON parsing with large limits for audio data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy/safe initialization for Gemini
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("La clave GEMINI_API_KEY no está configurada en las variables de entorno.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper for exponential backoff retry on transient 503/429 errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.statusCode || 0;
      const errMsg = (err?.message || "").toLowerCase();
      const isTransient =
        status === 503 ||
        status === 429 ||
        status === 500 ||
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("resource exhausted") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("overloaded");

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }

      const delay = initialDelayMs * Math.pow(1.8, attempt) + Math.random() * 400;
      console.warn(`[Gemini API] Request failed with transient error (${status || errMsg}). Retrying attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// -------------------------------------------------------------
// 1. Health Check
// -------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Solvra Audio Studio",
    aiModel: "gemini-3.7-flash",
    ttsModel: "gemini-3.1-flash-tts-preview",
  });
});

// -------------------------------------------------------------
// 2. TTS Voice Generation (Gemini 3.1 Flash TTS Preview with Retry)
// -------------------------------------------------------------
app.post("/api/tts/generate", async (req, res) => {
  try {
    const { text, voiceName = "Kore", style = "neutral", customInstruction = "" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "El texto a locutar es obligatorio." });
    }

    const ai = getGeminiClient();

    // Prepare style prompt
    let prompt = text.trim();
    if (customInstruction) {
      prompt = `[Direction: ${customInstruction}] ${prompt}`;
    } else if (style && style !== "neutral") {
      const stylePrompts: Record<string, string> = {
        professional: "En tono profesional, corporativo, claro y confiable:",
        enthusiastic: "Con entusiasmo, energía positiva y dinamismo comercial:",
        warm: "Con calidez, cercanía, amabilidad y tono empático:",
        urgent: "En tono de aviso importante, claro, firme y conciso:",
        ivr: "Como locución de contestador IVR telefónico profesional y pausado:",
        argentine: "Con entonación natural de español rioplatense (argentino) amigable y claro:",
      };
      if (stylePrompts[style]) {
        prompt = `${stylePrompts[style]} ${prompt}`;
      }
    }

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              // Supported: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
              prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
            },
          },
        },
      });
    }, 4, 1200);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No se pudo generar el flujo de audio desde la IA.");
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      sampleRate: 24000,
      mimeType: "audio/pcm;rate=24000",
      voiceName,
      textLength: text.length,
    });
  } catch (error: any) {
    console.error("Error in /api/tts/generate:", error);
    const errorStr = (error.message || "").toLowerCase();
    let userFriendlyMsg = error.message || "Error al generar la locución con IA.";

    if (errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable")) {
      userFriendlyMsg = "El servicio de síntesis de voz de Gemini está experimentando alta demanda temporal en los servidores de Google. Por favor, reintenta en unos segundos.";
    }

    res.status(500).json({
      error: userFriendlyMsg,
      isHighDemand: errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable"),
    });
  }
});

// -------------------------------------------------------------
// 3. AI Script Writer & Optimizer (Gemini 3.7 Flash with Fallbacks & Retry)
// -------------------------------------------------------------
app.post("/api/ai/enhance-script", async (req, res) => {
  try {
    const { prompt, category = "ivr", tone = "argentine_friendly", companyName = "Solvra" } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "La descripción o borrador es requerido." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
Eres el Director de Contenidos y Guiones de Audio de Solvra Audio Studio.
Tu misión es redactar y perfeccionar guiones de locución profesional para IVR telefónicos, comerciales, mensajes de bienvenida, menús interactivos y presentaciones de audio.

Sigue estas pautas:
- Ajusta el estilo al tono pedido (Español Argentino amigable usando "vos" y modismos naturales y educados, o Español Neutro Corporativo).
- Estructura el guion de forma rítmica, legible para un locutor/IA con pausas y puntuación clara.
- Entrega el resultado en formato JSON estricto con los campos:
  - "script": El guion final listo para ser leído y locutado.
  - "title": Un título descriptivo para el audio.
  - "category": Tipo de guion.
  - "estimatedDuration": Tiempo estimado de locución (ej: "25 seg").
  - "tips": Array con 3 consejos breves para mejorar la locución o uso.
  - "variations": Array con 2 versiones alternativas (una más corta y otra más formal).
`;

    const userPrompt = `
Genera o mejora un guion para:
- Tipo: ${category}
- Tono: ${tone}
- Empresa / Proyecto: ${companyName}
- Idea o borrador del usuario: "${prompt}"
`;

    // Try primary model with fallback
    let responseText = "";
    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        });
      }, 3, 1000);
      responseText = response.text || "{}";
    } catch (primaryErr) {
      console.warn("Primary model gemini-3.7-flash unavailable, attempting fallback to gemini-flash-latest...");
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        });
      }, 2, 1000);
      responseText = response.text || "{}";
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        script: responseText,
        title: "Guion de Audio Generado",
        category,
        estimatedDuration: "30 seg",
        tips: ["Lee con pausas naturales", "Ajusta la velocidad según tu audiencia"],
        variations: [],
      };
    }

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/enhance-script:", error);
    const errorStr = (error.message || "").toLowerCase();
    let userFriendlyMsg = error.message || "Error al redactar el guion con Gemini.";

    if (errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable")) {
      userFriendlyMsg = "El servicio de IA está experimentando alta demanda temporal. Por favor, reintenta en unos instantes.";
    }

    res.status(500).json({
      error: userFriendlyMsg,
      isHighDemand: errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable"),
    });
  }
});

// -------------------------------------------------------------
// 4. Audio Explainer & Deep Analysis (Gemini 3.7 Flash with Fallbacks & Retry)
// -------------------------------------------------------------
app.post("/api/ai/explain-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/mp3", style = "argentine_simple" } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "El archivo de audio en base64 es requerido." });
    }

    const ai = getGeminiClient();

    let styleDirective = `
Explica el contenido de manera extremadamente simple y clara, usando español rioplatense (argentino) natural y accesible (usando "vos", ejemplos cotidianos, sin rodeos aburridos).`;

    if (style === "formal_executive") {
      styleDirective = `
Elabora un resumen ejecutivo formal, técnico y conciso con estructura corporativa y métricas destacadas.`;
    } else if (style === "bullet_points") {
      styleDirective = `
Desglosa el audio en puntos clave ordenados por orden de importancia y tareas o conclusiones directas.`;
    } else if (style === "eli5") {
      styleDirective = `
Explícalo como si se lo contaras a alguien de 10 años, con metáforas sencillas y lenguaje muy amigable.`;
    }

    const prompt = `
Escucha atentamente este archivo de audio con máxima precisión. Realiza un análisis exhaustivo y devuelve un JSON estricto con:
1. "transcription": La transcripción literal y fiel de todo lo que se dice en el audio.
2. "explanation": ${styleDirective}
3. "summaryShort": Un resumen en una sola frase contundente.
4. "keyPoints": Lista de 3 a 5 puntos clave o conclusiones del audio.
5. "tone": Descripción del tono del hablante (ej: "Entusiasta", "Molesto", "Técnico", "Comercial").
6. "languageDetected": Idioma y acento detectado (ej: "Español (Argentina)", "Español (Neutro)", "Inglés").
7. "actionItems": Acciones a tomar o pasos a seguir mencionados (si los hay).
`;

    const requestPayload = {
      parts: [
        {
          inlineData: {
            mimeType: mimeType || "audio/mp3",
            data: audioBase64,
          },
        },
        { text: prompt },
      ],
    };

    let responseText = "";
    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: requestPayload,
          config: {
            responseMimeType: "application/json",
          },
        });
      }, 3, 1000);
      responseText = response.text || "{}";
    } catch (primaryErr) {
      console.warn("Primary model gemini-3.7-flash unavailable, attempting fallback to gemini-flash-latest...");
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: requestPayload,
          config: {
            responseMimeType: "application/json",
          },
        });
      }, 2, 1000);
      responseText = response.text || "{}";
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch {
      analysisResult = {
        transcription: "Transcripción procesada.",
        explanation: responseText,
        summaryShort: "Audio analizado con éxito.",
        keyPoints: ["Contenido procesado con Gemini"],
        tone: "Informativo",
        languageDetected: "Español",
        actionItems: [],
      };
    }

    res.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/explain-audio:", error);
    const errorStr = (error.message || "").toLowerCase();
    let userFriendlyMsg = error.message || "Error al analizar el audio con Gemini.";

    if (errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable")) {
      userFriendlyMsg = "El servicio de Gemini está experimentando una alta demanda momentánea. Por favor, vuelve a intentar en unos segundos.";
    }

    res.status(500).json({
      error: userFriendlyMsg,
      isHighDemand: errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable"),
    });
  }
});

// -------------------------------------------------------------
// 5. Audio Q&A Chat (Gemini 3.7 Flash with Fallbacks & Retry)
// -------------------------------------------------------------
app.post("/api/ai/audio-qa", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/mp3", question, history = [] } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "La pregunta sobre el audio es requerida." });
    }

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "audio/mp3",
          data: audioBase64,
        },
      });
    }

    parts.push({
      text: `Contexto previo: ${JSON.stringify(history)}.
Pregunta del usuario sobre el audio: "${question}".
Responde con precisión basándote estrictamente en el contenido escuchado en el audio. Responde en tono claro, amigable y directo en español.`,
    });

    let answer = "";
    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: { parts },
        });
      }, 3, 1000);
      answer = response.text || "No se pudo obtener una respuesta para esa consulta.";
    } catch (primaryErr) {
      console.warn("Primary model gemini-3.7-flash unavailable for Q&A, attempting fallback to gemini-flash-latest...");
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: { parts },
        });
      }, 2, 1000);
      answer = response.text || "No se pudo obtener una respuesta para esa consulta.";
    }

    res.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/audio-qa:", error);
    const errorStr = (error.message || "").toLowerCase();
    let userFriendlyMsg = error.message || "Error al responder la consulta del audio.";

    if (errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable")) {
      userFriendlyMsg = "El modelo está experimentando alta demanda en este momento. Por favor, reintenta tu pregunta en unos segundos.";
    }

    res.status(500).json({
      error: userFriendlyMsg,
      isHighDemand: errorStr.includes("503") || errorStr.includes("high demand") || errorStr.includes("unavailable"),
    });
  }
});

// -------------------------------------------------------------
// Start Server and Vite Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Solvra Audio Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
