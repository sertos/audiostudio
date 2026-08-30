import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Check, Copy, Lock } from "lucide-react";
import { WaveformVisualizer } from "./WaveformVisualizer";

interface AudioPlayerProps {
  src: string;
  wavSrc?: string;
  title?: string;
  subtitle?: string;
  waveform?: number[];
  downloadName?: string;
  colorTheme?: "cyan" | "indigo" | "emerald";
  onEnded?: () => void;
  showTranscript?: string;
  disableDownload?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  wavSrc,
  title = "Pista de Audio",
  subtitle,
  waveform,
  downloadName = "audio_solvra.mp3",
  colorTheme = "cyan",
  onEnded,
  showTranscript,
  disableDownload = true,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  const themeClasses = {
    cyan: {
      activeBar: "#06b6d4",
      accentBg: "bg-cyan-500 hover:bg-cyan-400 text-slate-950",
      pillActive: "bg-cyan-900/60 text-cyan-300 border-cyan-500/50",
      borderGlow: "border-cyan-500/30",
    },
    indigo: {
      activeBar: "#6366f1",
      accentBg: "bg-indigo-500 hover:bg-indigo-400 text-white",
      pillActive: "bg-indigo-900/60 text-indigo-300 border-indigo-500/50",
      borderGlow: "border-indigo-500/30",
    },
    emerald: {
      activeBar: "#10b981",
      accentBg: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
      pillActive: "bg-emerald-900/60 text-emerald-300 border-emerald-500/50",
      borderGlow: "border-emerald-500/30",
    },
  }[colorTheme];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src, onEnded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (progress: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const targetTime = progress * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
      audio.volume = volume || 1;
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyTranscript = () => {
    if (!showTranscript) return;
    navigator.clipboard.writeText(showTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className={`w-full bg-slate-900/90 backdrop-blur-sm border ${themeClasses.borderGlow} rounded-xl p-5 shadow-xl space-y-4`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-100">{title}</h4>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Speed selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            {[0.75, 1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 rounded transition-all ${
                  playbackRate === rate
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waveform Seeker */}
      <div className="space-y-1">
        <WaveformVisualizer
          peaks={waveform}
          progress={progress}
          isPlaying={isPlaying}
          activeColor={themeClasses.activeBar}
          height={48}
          onSeek={handleSeek}
        />
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-3">
          {/* Play / Pause button */}
          <button
            onClick={togglePlay}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95 ${themeClasses.accentBg}`}
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
          </button>

          {/* Restart button */}
          <button
            onClick={handleRestart}
            className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Reiniciar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Volume control */}
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {showTranscript && (
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Copiar texto de la locución"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiado" : "Copiar Guion"}</span>
            </button>
          )}

          {/* Download MP3 */}
          {disableDownload ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed opacity-75"
              title="Descarga desactivada en versión de prueba"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500/80" />
              <span>MP3</span>
              <span className="text-[10px] text-amber-400/80 font-normal ml-0.5">(Prueba)</span>
            </button>
          ) : (
            <a
              href={src}
              download={downloadName.endsWith(".mp3") ? downloadName : `${downloadName}.mp3`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold shadow transition-all hover:scale-102"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>MP3</span>
            </a>
          )}

          {/* Download WAV */}
          {wavSrc && (
            disableDownload ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed opacity-75"
                title="Descarga WAV desactivada en versión de prueba"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500/80" />
                <span>WAV</span>
              </button>
            ) : (
              <a
                href={wavSrc}
                download={downloadName.replace(".mp3", "") + ".wav"}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all hover:scale-102"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>WAV Master</span>
              </a>
            )
          )}
        </div>
      </div>
    </div>
  );
};
