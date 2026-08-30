import React, { useState } from "react";
import {
  Mic,
  Sliders,
  Sparkles,
  Layers,
  FileAudio,
  BrainCircuit,
  Volume2,
  CheckCircle,
  Copy,
  History,
  Info,
  Wand2,
  RefreshCw,
  Lock,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { useAudioMerger, MergeMode } from "./hooks/useAudioMerger";
import { useTextToSpeech } from "./hooks/useTextToSpeech";
import { useAudioExplainer } from "./hooks/useAudioExplainer";
import { useTrialUsage } from "./hooks/useTrialUsage";
import { AudioUploader } from "./components/AudioUploader";
import { AudioRecorder } from "./components/AudioRecorder";
import { AudioPlayer } from "./components/AudioPlayer";
import { VoiceSelector } from "./components/VoiceCard";
import { ScriptGeneratorPanel } from "./components/ScriptGeneratorPanel";
import { AudioChatAssistant } from "./components/AudioChatAssistant";
import Spinner from "./components/Spinner";

type Tab = "tts" | "merger" | "explainer";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("tts");

  // -------------------------------------------------------------
  // Trial Limit & Usage State (5-Trial Limit & Download Lock)
  // -------------------------------------------------------------
  const {
    usedTrials,
    remainingTrials,
    maxTrials,
    isTrialExhausted,
    isTrialMode,
    consumeTrial,
    showTrialLimitModal,
    setShowTrialLimitModal,
  } = useTrialUsage();

  // -------------------------------------------------------------
  // TTS State
  // -------------------------------------------------------------
  const [ttsText, setTtsText] = useState(
    "¡Hola! Te damos la bienvenida a Solvra. Para comunicarte con el área de Ventas marcá 1, para Soporte Técnico marcá 2, o aguardá en línea y te atenderemos enseguida."
  );
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [ttsPitch, setTtsPitch] = useState<number>(0);
  const [ttsStyle, setTtsStyle] = useState<string>("ivr");
  const {
    generateSpeech,
    isGenerating,
    genError,
    currentResult,
    history: ttsHistory,
  } = useTextToSpeech();

  // -------------------------------------------------------------
  // Merger State
  // -------------------------------------------------------------
  const [mergeMode, setMergeMode] = useState<MergeMode>("sequential");
  const [firstAudioFile, setFirstAudioFile] = useState<File | null>(null);
  const [secondAudioFile, setSecondAudioFile] = useState<File | null>(null);
  const [silenceGap, setSilenceGap] = useState<number>(0.3);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [bgmVolume, setBgmVolume] = useState<number>(0.25);
  const {
    mergeAndEncode,
    mergedResult,
    isProcessing: isMerging,
    error: mergeError,
  } = useAudioMerger();

  // -------------------------------------------------------------
  // Explainer State
  // -------------------------------------------------------------
  const [explainerFile, setExplainerFile] = useState<File | null>(null);
  const [explainerStyle, setExplainerStyle] = useState<
    "argentine_simple" | "formal_executive" | "bullet_points" | "eli5"
  >("argentine_simple");
  const [hasCopiedTranscript, setHasCopiedTranscript] = useState<boolean>(false);
  const {
    explainAudio,
    isExplaining,
    explanationError,
    analysisResult,
    chatMessages,
    isAsking,
    askAudioQuestion,
    resetAnalysis,
  } = useAudioExplainer();

  // Explainer TTS narration
  const [explainingWithVoice, setExplainingWithVoice] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Handlers with Trial Control Enforcement (Consumes ONLY on success)
  // -------------------------------------------------------------
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    if (isTrialExhausted) {
      setShowTrialLimitModal(true);
      return;
    }
    const result = await generateSpeech(ttsText, selectedVoice, ttsSpeed, ttsPitch, ttsStyle);
    if (result) {
      consumeTrial();
    }
  };

  const handleMergeAudio = async () => {
    if (firstAudioFile && secondAudioFile) {
      if (isTrialExhausted) {
        setShowTrialLimitModal(true);
        return;
      }
      const result = await mergeAndEncode(firstAudioFile, secondAudioFile, {
        mode: mergeMode,
        silenceGapSeconds: silenceGap,
        voiceVolume,
        bgmVolume,
        loopBgm: true,
      });
      if (result) {
        consumeTrial();
      }
    }
  };

  const handleExplainAudio = async () => {
    if (!explainerFile) return;
    if (isTrialExhausted) {
      setShowTrialLimitModal(true);
      return;
    }
    const result = await explainAudio(explainerFile, explainerStyle);
    if (result) {
      consumeTrial();
    }
  };

  const handleNarrateExplanation = async () => {
    if (!analysisResult?.explanation) return;
    if (isTrialExhausted) {
      setShowTrialLimitModal(true);
      return;
    }
    setExplainingWithVoice(true);
    const result = await generateSpeech(
      analysisResult.explanation,
      "Fenrir",
      1.0,
      0,
      "argentine"
    );
    if (result) {
      consumeTrial();
    }
    setExplainingWithVoice(false);
  };

  const handleCopyTranscription = () => {
    if (!analysisResult?.transcription) return;
    navigator.clipboard.writeText(analysisResult.transcription);
    setHasCopiedTranscript(true);
    setTimeout(() => setHasCopiedTranscript(false), 2000);
  };

  const handleUseTtsInMerger = async () => {
    if (!currentResult?.wavUrl) return;
    try {
      const response = await fetch(currentResult.wavUrl);
      const blob = await response.blob();
      const file = new File([blob], "locucion_solvra.wav", { type: "audio/wav" });
      setSecondAudioFile(file);
      setActiveTab("merger");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-cyan-600/10 via-indigo-600/5 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Header */}
        <header className="text-center pt-2 pb-1 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-cyan-300 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold">Solvra Audio Studio</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-mono text-[11px]">Gemini 3.7 Flash & TTS 24kHz</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-cyan-400">
            Solvra Audio Studio
          </h1>

          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Suite inteligente para generar locuciones profesionales con IA, mezclar y masterizar pistas, y transcribir y explicar audios en segundos.
          </p>

          {/* Trial Usage Control Banner */}
          <div className="max-w-xl mx-auto mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                {[...Array(maxTrials)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i < usedTrials
                        ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                        : "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    }`}
                    title={i < usedTrials ? "Prueba consumida" : "Prueba disponible"}
                  />
                ))}
              </div>

              <span className="font-medium text-slate-200">
                Versión de Prueba:{" "}
                <strong className={remainingTrials > 0 ? "text-cyan-400" : "text-amber-400"}>
                  {remainingTrials} de {maxTrials} {remainingTrials === 1 ? "prueba disponible" : "pruebas disponibles"}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/50 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Descargas bloqueadas (Prueba)</span>
              </span>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav aria-label="Tabs" className="flex p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tts")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === "tts"
                ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Generar IVR & Locución</span>
          </button>

          <button
            onClick={() => setActiveTab("merger")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === "merger"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mezclar & Pistas</span>
          </button>

          <button
            onClick={() => setActiveTab("explainer")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === "explainer"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Explicar & Analizar</span>
          </button>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: TTS STUDIO */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "tts" && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
            {/* AI Script Assistant Widget */}
            <ScriptGeneratorPanel
              currentText={ttsText}
              onApplyScript={(newScript) => setTtsText(newScript)}
            />

            {/* Script Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-cyan-400" />
                  <span>Guion de la Locución</span>
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {ttsText.length} caracteres • ~{Math.max(1, Math.round(ttsText.split(" ").length / 2.5))}s
                </span>
              </div>

              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={4}
                placeholder="Escribí aquí el texto que querés que la IA locute..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Voice Cards Selection */}
            <VoiceSelector
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
            />

            {/* Controls: Tone Style, Speed, Pitch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              {/* Style preset */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Estilo de Expresión
                </label>
                <select
                  value={ttsStyle}
                  onChange={(e) => setTtsStyle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ivr">📞 Centralita Telefónica (IVR)</option>
                  <option value="argentine">🇦🇷 Español Argentino Rioplatense</option>
                  <option value="professional">🏢 Corporativo & Confiable</option>
                  <option value="enthusiastic">⚡ Dinámico & Comercial</option>
                  <option value="warm">🌿 Cálido & Empático</option>
                  <option value="urgent">🚨 Aviso / Comunicado Importante</option>
                </select>
              </div>

              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Velocidad</span>
                  <span className="font-mono font-bold text-cyan-400">{ttsSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.4"
                  step="0.05"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Pausado (0.75x)</span>
                  <span>Rápido (1.4x)</span>
                </div>
              </div>

              {/* Pitch Shift Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Tono (Semitonos)</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch} st
                  </span>
                </div>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Grave (-6)</span>
                  <span>Natural (0)</span>
                  <span>Agudo (+6)</span>
                </div>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateTTS}
              disabled={isGenerating || !ttsText.trim() || isTrialExhausted}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              {isGenerating ? (
                <>
                  <Spinner />
                  <span>Sintetizando Voz con Gemini TTS...</span>
                </>
              ) : isTrialExhausted ? (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Límite de 5 Pruebas Alcanzado (Versión de Prueba)</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  <span>Generar Locución Profesional</span>
                  <span className="text-xs bg-slate-900/40 px-2 py-0.5 rounded-full font-normal">
                    ({remainingTrials} {remainingTrials === 1 ? "restante" : "restantes"})
                  </span>
                </>
              )}
            </button>

            {/* Error message with quick retry */}
            {genError && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 text-amber-200 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-100">Aviso del Servidor</p>
                    <p className="text-amber-300/90 text-[11px] leading-relaxed mt-0.5">{genError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTTS}
                  disabled={isGenerating || isTrialExhausted}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            )}

            {/* Generated Result Player */}
            {currentResult && !isGenerating && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>¡Locución Generada con Éxito!</span>
                  </h3>

                  <button
                    onClick={handleUseTtsInMerger}
                    className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Llevar al Mezclador con Música</span>
                  </button>
                </div>

                <AudioPlayer
                  src={currentResult.audioUrl}
                  wavSrc={currentResult.wavUrl}
                  title={`Locución - ${currentResult.voiceName}`}
                  subtitle={`${currentResult.durationSeconds.toFixed(1)}s • ${currentResult.style} • Velocidad ${currentResult.speed}x`}
                  waveform={currentResult.waveform}
                  downloadName={`locucion_${currentResult.voiceName.toLowerCase()}`}
                  colorTheme="cyan"
                  showTranscript={currentResult.text}
                  disableDownload={isTrialMode}
                />
              </div>
            )}

            {/* History Shelf */}
            {ttsHistory.length > 1 && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <History className="w-3.5 h-3.5" />
                    Historial de Locuciones Recientes ({ttsHistory.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {ttsHistory.slice(1, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate flex-1">
                        <p className="font-semibold text-slate-200 truncate">
                          {item.text}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Voz: {item.voiceName} • {item.durationSeconds.toFixed(1)}s
                        </p>
                      </div>

                      {isTrialMode ? (
                        <button
                          disabled
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/60 border border-slate-700/60 text-slate-500 rounded text-[11px] font-medium cursor-not-allowed"
                          title="Descarga desactivada en versión de prueba"
                        >
                          <Lock className="w-3 h-3 text-amber-500/80" />
                          <span>MP3</span>
                        </button>
                      ) : (
                        <a
                          href={item.audioUrl}
                          download={`locucion_${item.id}.mp3`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium"
                        >
                          MP3
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: AUDIO MERGER & TRACK MIXER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "merger" && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
            {/* Mode Switcher */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Modo de Unión / Mezcla</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMergeMode("sequential")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    mergeMode === "sequential"
                      ? "bg-indigo-950/50 border-indigo-400 text-indigo-200 ring-1 ring-indigo-400/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                  }`}
                >
                  <p className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                    <span>➡️ Concatenación Secuencial</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Intro pregrabada primero, seguida por el mensaje principal y pausa regulable.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMergeMode("overlay")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    mergeMode === "overlay"
                      ? "bg-indigo-950/50 border-indigo-400 text-indigo-200 ring-1 ring-indigo-400/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                  }`}
                >
                  <p className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                    <span>🎵 Locución + Música de Fondo</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Funde la voz con música ambiental (BGM) controlando volúmenes independientes.
                  </p>
                </button>
              </div>
            </div>

            {/* Audio Uploaders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <AudioUploader
                  id="pista1"
                  label={
                    mergeMode === "sequential"
                      ? "Pista 1: Intro / Audio Pregrabado"
                      : "Pista 1: Voz Principal / Locución"
                  }
                  file={firstAudioFile}
                  onFileChange={setFirstAudioFile}
                  colorTheme="indigo"
                />

                {mergeMode === "overlay" && (
                  <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Volumen de Voz</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {Math.round(voiceVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <AudioUploader
                  id="pista2"
                  label={
                    mergeMode === "sequential"
                      ? "Pista 2: Mensaje Principal"
                      : "Pista 2: Música de Fondo (BGM Ambient)"
                  }
                  file={secondAudioFile}
                  onFileChange={setSecondAudioFile}
                  colorTheme="indigo"
                />

                {mergeMode === "overlay" && (
                  <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Volumen de Música BGM</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {Math.round(bgmVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sequential Silence Interval */}
            {mergeMode === "sequential" && (
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Intervalo de Silencio entre Audios
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pausa natural antes de que inicie la segunda pista
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={silenceGap}
                    onChange={(e) => setSilenceGap(parseFloat(e.target.value))}
                    className="w-28 sm:w-36 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                  <span className="text-xs font-mono font-bold text-indigo-400 min-w-[40px]">
                    {silenceGap.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}

            {/* Merge Action Button */}
            <button
              onClick={handleMergeAudio}
              disabled={isMerging || !firstAudioFile || !secondAudioFile || isTrialExhausted}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              {isMerging ? (
                <>
                  <Spinner />
                  <span>Renderizando y Masterizando Audio...</span>
                </>
              ) : isTrialExhausted ? (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Límite de 5 Pruebas Alcanzado (Versión de Prueba)</span>
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5" />
                  <span>
                    {mergeMode === "sequential" ? "Unir Audios en Secuencia" : "Mezclar Pistas de Audio"}
                  </span>
                  <span className="text-xs bg-slate-900/40 px-2 py-0.5 rounded-full font-normal">
                    ({remainingTrials} {remainingTrials === 1 ? "restante" : "restantes"})
                  </span>
                </>
              )}
            </button>

            {/* Merge Error */}
            {mergeError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs text-center">
                {mergeError}
              </div>
            )}

            {/* Merged Master Result */}
            {mergedResult && !isMerging && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>¡Mezcla Finalizada con Éxito!</span>
                </h3>

                <AudioPlayer
                  src={mergedResult.mp3Url}
                  wavSrc={mergedResult.wavUrl}
                  title="Master Finalizado - Solvra Audio Studio"
                  subtitle={`${mergedResult.durationSeconds.toFixed(1)}s • Modo: ${
                    mergedResult.mode === "sequential" ? "Secuencial" : "Voz + Música"
                  }`}
                  waveform={mergedResult.waveform}
                  downloadName="audio_master_solvra"
                  colorTheme="indigo"
                  disableDownload={isTrialMode}
                />
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: AUDIO EXPLAINER & AI ANALYSIS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "explainer" && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
            {/* Explainer Intro */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">
                  Comprensión y Análisis de Audio Multimodal con Gemini 3.7 Flash
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Subí o grabá cualquier audio. La IA transcribirá palabra por palabra, extraerá conclusiones clave, evaluará el tono y te lo explicará de forma ultra sencilla en español.
                </p>
              </div>
            </div>

            {/* Upload or Record Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AudioUploader
                id="explainerAudio"
                label="Subir Archivo de Audio"
                file={explainerFile}
                onFileChange={(f) => {
                  setExplainerFile(f);
                  resetAnalysis();
                }}
                colorTheme="emerald"
              />

              <AudioRecorder
                label="O Grabar en Vivo con Micrófono"
                onAudioRecorded={(f) => {
                  setExplainerFile(f);
                  resetAnalysis();
                }}
              />
            </div>

            {/* Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Formato y Tono de la Explicación
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExplainerStyle("argentine_simple")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    explainerStyle === "argentine_simple"
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">🇦🇷 Simple en Argentino</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Lenguaje cotidiano ("vos") y ejemplos claros</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExplainerStyle("formal_executive")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    explainerStyle === "formal_executive"
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">📊 Resumen Ejecutivo</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Estructura corporativa y conclusiones</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExplainerStyle("bullet_points")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    explainerStyle === "bullet_points"
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">📋 Puntos Clave</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Lista de decisiones y tareas a seguir</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExplainerStyle("eli5")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    explainerStyle === "eli5"
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">🧸 Explicar para Niños</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Metáforas didácticas sin jerga</p>
                </button>
              </div>
            </div>

            {/* Explain Action Button */}
            <button
              onClick={handleExplainAudio}
              disabled={isExplaining || !explainerFile || isTrialExhausted}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              {isExplaining ? (
                <>
                  <Spinner />
                  <span>Gemini 3.7 Flash analizando y transcribiendo audio...</span>
                </>
              ) : isTrialExhausted ? (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Límite de 5 Pruebas Alcanzado (Versión de Prueba)</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-5 h-5" />
                  <span>Analizar y Explicar con Gemini 3.7 Flash</span>
                  <span className="text-xs bg-slate-900/40 px-2 py-0.5 rounded-full font-normal">
                    ({remainingTrials} {remainingTrials === 1 ? "restante" : "restantes"})
                  </span>
                </>
              )}
            </button>

            {/* Error display with retry */}
            {explanationError && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 text-amber-200 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-100">Aviso del Servidor</p>
                    <p className="text-amber-300/90 text-[11px] leading-relaxed mt-0.5">{explanationError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExplainAudio}
                  disabled={isExplaining || isTrialExhausted}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            )}

            {/* AI Analysis Cards Output */}
            {analysisResult && !isExplaining && (
              <div className="space-y-5 pt-2 animate-fade-in">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {analysisResult.languageDetected && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                      🌍 Idioma: <strong className="text-slate-100">{analysisResult.languageDetected}</strong>
                    </span>
                  )}
                  {analysisResult.tone && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                      🎭 Tono: <strong className="text-slate-100">{analysisResult.tone}</strong>
                    </span>
                  )}
                  {analysisResult.summaryShort && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-medium truncate max-w-full">
                      ✨ {analysisResult.summaryShort}
                    </span>
                  )}
                </div>

                {/* Explanation Card */}
                <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Explicación Simplificada</span>
                    </h4>

                    {/* Narrate button */}
                    <button
                      onClick={handleNarrateExplanation}
                      disabled={explainingWithVoice}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-semibold transition-all"
                    >
                      {explainingWithVoice ? (
                        <Spinner />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>Locutar Explicación (Voz IA)</span>
                    </button>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {analysisResult.explanation}
                  </div>
                </div>

                {/* Key points & Action items */}
                {analysisResult.keyPoints && analysisResult.keyPoints.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-200">
                      📌 Puntos Clave del Audio:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysisResult.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Full Transcription Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300">
                      📝 Transcripción Literal Completa:
                    </h4>
                    <button
                      onClick={handleCopyTranscription}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 transition-colors"
                    >
                      {hasCopiedTranscript ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto p-3 bg-slate-900 rounded-lg text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap border border-slate-800">
                    {analysisResult.transcription}
                  </div>
                </div>

                {/* Interactive Audio Q&A Chat */}
                {explainerFile && (
                  <AudioChatAssistant
                    chatMessages={chatMessages}
                    isAsking={isAsking}
                    onAskQuestion={(q) => askAudioQuestion(explainerFile, q)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 text-slate-500 text-xs space-y-1">
          <p className="font-medium text-slate-400">
            Solvra Audio Studio &copy; {new Date().getFullYear()} • Solvra
          </p>
          <p className="text-[11px] text-slate-600">
            Desarrollado con React 19, Gemini 3.7 Flash y Gemini TTS Voice Engine
          </p>
        </footer>
      </div>

      {/* Trial Limit Reached Modal */}
      {showTrialLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Límite de 5 Pruebas Alcanzado
                </h3>
                <p className="text-xs text-amber-400 font-medium">
                  Versión de Evaluación Solvra
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <p>
                Has alcanzado el límite de <strong>5 pruebas permitidas</strong> de la versión de prueba de Solvra Audio Studio.
              </p>
              <div className="flex items-start gap-2 pt-1 text-amber-300/90">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Recordatorio:</strong> Las descargas de audio (MP3 / WAV) se encuentran restringidas en esta versión de evaluación.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTrialLimitModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold shadow-md transition-transform active:scale-95 text-center"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
