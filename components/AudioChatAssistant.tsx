import React, { useState } from "react";
import { MessageSquare, Send, Sparkles, User, Bot, Loader2 } from "lucide-react";
import { AudioChatMessage } from "../hooks/useAudioExplainer";

interface AudioChatAssistantProps {
  chatMessages: AudioChatMessage[];
  isAsking: boolean;
  onAskQuestion: (question: string) => void;
}

export const AudioChatAssistant: React.FC<AudioChatAssistantProps> = ({
  chatMessages,
  isAsking,
  onAskQuestion,
}) => {
  const [inputQuery, setInputQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isAsking) return;
    onAskQuestion(inputQuery.trim());
    setInputQuery("");
  };

  const quickQuestions = [
    "¿Cuáles son los acuerdos o tareas clave?",
    "¿Hubo algún número, fecha o monto mencionado?",
    "¿Cuál fue el tono general y el objetivo del hablante?",
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-200">
            Preguntas Interactivas al Audio (Gemini 3.7 Flash)
          </h4>
        </div>
        <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Análisis Multimodal
        </span>
      </div>

      {/* Suggested Quick Questions */}
      {chatMessages.length === 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Preguntas sugeridas sobre tu audio:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAskQuestion(q)}
                disabled={isAsking}
                className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {chatMessages.length > 0 && (
        <div className="max-h-60 overflow-y-auto space-y-3 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "model" && (
                <div className="w-6 h-6 rounded-full bg-emerald-600/80 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none font-medium"
                    : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isAsking && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Gemini 3.7 Flash está escuchando y analizando...</span>
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Escribí una pregunta específica sobre el audio..."
          disabled={isAsking}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isAsking}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
        >
          {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Consultar</span>
        </button>
      </form>
    </div>
  );
};
