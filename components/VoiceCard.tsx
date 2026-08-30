import React from "react";
import { Mic, Sparkles, Volume2 } from "lucide-react";

export interface VoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  tag: string;
  description: string;
  recommendedFor: string;
  avatarEmoji: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: "Kore",
    name: "Kore",
    gender: "female",
    tag: "Corporativa & Cálida",
    description: "Tono femenino refinado, claro y empático. Excelente articulación.",
    recommendedFor: "IVR Telefónico, Atención al Cliente, Bienvenidas",
    avatarEmoji: "👩‍💼",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    gender: "male",
    tag: "Narrador & Firme",
    description: "Tono masculino con presencia, seguridad y dicción impecable.",
    recommendedFor: "Centralitas, Avisos Institucionales, Podcasts",
    avatarEmoji: "👨‍💼",
  },
  {
    id: "Puck",
    name: "Puck",
    gender: "male",
    tag: "Dinámico & Joven",
    description: "Tono masculino fresco, ágil, enérgico y conversacional.",
    recommendedFor: "Promociones, Startups, Mensajes Creativos",
    avatarEmoji: "🎙️",
  },
  {
    id: "Charon",
    name: "Charon",
    gender: "male",
    tag: "Grave & Solemne",
    description: "Voz profunda, seria y de gran autoridad.",
    recommendedFor: "Avisos Legales, Notificaciones Críticas, Seguridad",
    avatarEmoji: "📻",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    gender: "female",
    tag: "Suave & Pacífica",
    description: "Tono femenino delicado, pausado y tranquilizador.",
    recommendedFor: "Salud, Instrucciones Paso a Paso, Espera",
    avatarEmoji: "🌿",
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onSelectVoice,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Mic className="w-4 h-4 text-cyan-400" />
          <span>Voces de Estudio IA (Gemini TTS)</span>
        </label>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          5 Voces Hiperrealistas
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AVAILABLE_VOICES.map((v) => {
          const isSelected = selectedVoice === v.id;
          return (
            <div
              key={v.id}
              onClick={() => onSelectVoice(v.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-left relative overflow-hidden ${
                isSelected
                  ? "bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/50"
                  : "bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-end pr-1.5 pt-1 text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xl">{v.avatarEmoji}</span>
                <div>
                  <h4 className={`text-sm font-bold ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                    {v.name}
                  </h4>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    {v.tag}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-snug line-clamp-2 mt-1">
                {v.description}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[170px]">{v.recommendedFor}</span>
                <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
