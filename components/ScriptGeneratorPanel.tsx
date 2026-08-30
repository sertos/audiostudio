import React, { useState } from "react";
import { Sparkles, Wand2, BookOpen, Check, ArrowRight, Clock, Lightbulb } from "lucide-react";
import { useScriptAssistant, ScriptSuggestion } from "../hooks/useScriptAssistant";
import Spinner from "./Spinner";

interface ScriptGeneratorPanelProps {
  onApplyScript: (text: string) => void;
  currentText: string;
}

const PRESET_TEMPLATES = [
  {
    title: "Centralita Telefónica Principal",
    category: "ivr",
    tone: "argentine_friendly",
    prompt: "Mensaje de bienvenida para centralita de empresa con opciones: 1 para Ventas, 2 para Soporte y Administración, o aguardar en línea.",
    preview: "¡Hola! Te damos la bienvenida a Solvra. Por favor marcá 1 para hablar con Ventas, 2 para Soporte Técnico y Facturación, o aguardá unos segundos y te atenderemos con gusto.",
  },
  {
    title: "Fuera de Horario de Atención",
    category: "after_hours",
    tone: "argentine_friendly",
    prompt: "Aviso de fuera de horario. Nuestro horario es de lunes a viernes de 9 a 18 hs. Dejanos tu mensaje con nombre y teléfono o escribinos por WhatsApp.",
    preview: "Gracias por comunicarte con nosotros. En este momento nuestras oficinas se encuentran cerradas. Nuestro horario de atención es de lunes a viernes de 9 a 18 horas. Dejanos tu mensaje o escribinos al WhatsApp.",
  },
  {
    title: "Promoción Comercial y Oferta",
    category: "promo",
    tone: "enthusiastic",
    prompt: "Anuncio de descuento de temporada especial con 20% off en todos los productos y envíos sin cargo a todo el país.",
    preview: "¡Atención! Aprovechá esta semana un 20% de descuento exclusivo en todos nuestros servicios y productos con envíos bonificados a todo el país. Ingresá ya en nuestra web.",
  },
  {
    title: "Confirmación de Turno / Cita",
    category: "appointment",
    tone: "warm",
    prompt: "Mensaje de recordatorio y confirmación de turno médico o cita programada con solicitud de responder sí o comunicarse para reprogramar.",
    preview: "Hola, nos comunicamos para recordarte tu turno programado para mañana. Para confirmar tu asistencia presioná 1, o comunicate con nuestra recepción para reprogramar.",
  },
];

export const ScriptGeneratorPanel: React.FC<ScriptGeneratorPanelProps> = ({
  onApplyScript,
  currentText,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("Solvra");
  const [category, setCategory] = useState<string>("ivr");
  const [tone, setTone] = useState<string>("argentine_friendly");
  const [applied, setApplied] = useState<boolean>(false);

  const { generateOrEnhanceScript, isEnhancing, error, lastSuggestion } = useScriptAssistant();

  const handleGenerate = async () => {
    const p = prompt.trim() || currentText.trim() || "Mensaje de bienvenida para atención telefónica";
    const res = await generateOrEnhanceScript(p, category, tone, companyName);
    if (res) {
      // Keep suggestion open
    }
  };

  const handleApply = (text: string) => {
    onApplyScript(text);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      setIsOpen(false);
    }, 800);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Asistente de Redacción IA (Gemini 3.7 Flash)
            </h4>
            <p className="text-xs text-slate-400">
              Genera guiones profesionales para IVR, comerciales y contestadores
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors flex items-center gap-1.5"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>{isOpen ? "Ocultar Asistente" : "Crear / Mejorar Guion"}</span>
        </button>
      </div>

      {/* Preset Pills */}
      {!isOpen && (
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyScript(tmpl.preview)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:border-slate-600 transition-all text-left flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>{tmpl.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Interactive AI Generator Panel */}
      {isOpen && (
        <div className="pt-3 border-t border-slate-700/80 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre de tu Empresa / Proyecto
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Solvra, Clínica Central, etc."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Audio
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ivr">Centralita Telefónica (IVR)</option>
                <option value="after_hours">Fuera de Horario / Contestador</option>
                <option value="promo">Anuncio Comercial / Promoción</option>
                <option value="appointment">Recordatorio de Turno</option>
                <option value="podcast_intro">Intro de Podcast / YouTube</option>
                <option value="support">Soporte Técnico & Menú de Opciones</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Estilo & Tono
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="argentine_friendly">🇦🇷 Español Argentino (Cercano & "Vos")</option>
                <option value="neutral_corporate">🌐 Español Neutro (Corporativo / "Usted")</option>
                <option value="enthusiastic">⚡ Enérgico & Comercial</option>
                <option value="calm_warm">🌿 Cálido, Pausado & Empático</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              ¿Qué información debe contener el mensaje?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Dar la bienvenida, avisar que las llamadas pueden ser grabadas, presionar 1 para compras y 2 para reclamos, y agradecer el contacto..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isEnhancing}
              className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow flex items-center justify-center gap-2 transition-all"
            >
              {isEnhancing ? (
                <>
                  <Spinner />
                  <span>Redactando con Gemini 3.7 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar Guion Optimizado con IA</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 text-amber-200 rounded-lg text-xs flex items-center justify-between gap-2 shadow">
              <span className="text-[11px]">{error}</span>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isEnhancing}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* AI Result Card */}
          {lastSuggestion && (
            <div className="p-4 bg-slate-800/90 border border-indigo-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400">
                    {lastSuggestion.title || "Guion Propuesto"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3" />
                    {lastSuggestion.estimatedDuration}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(lastSuggestion.script)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-all hover:scale-102"
                >
                  {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>{applied ? "¡Aplicado!" : "Usar Este Guion"}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-100 font-sans leading-relaxed border border-slate-700/80 whitespace-pre-wrap">
                {lastSuggestion.script}
              </div>

              {lastSuggestion.tips && lastSuggestion.tips.length > 0 && (
                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-300">Consejos de locución: </strong>
                    {lastSuggestion.tips.join(" • ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
