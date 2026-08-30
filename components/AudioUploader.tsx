import React, { useCallback, useRef, useState, useEffect } from "react";
import { Music, Upload, X, Play, Pause } from "lucide-react";

interface AudioUploaderProps {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  description?: string;
  colorTheme?: "indigo" | "cyan" | "emerald";
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  id,
  label,
  file,
  onFileChange,
  accept = "audio/*",
  description = "Archivos MP3, WAV, OGG, M4A, AAC, WebM",
  colorTheme = "indigo",
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setIsPlaying(false);
    }
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    onFileChange(selectedFile);
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      const droppedFile = event.dataTransfer.files?.[0] || null;
      if (droppedFile && (droppedFile.type.startsWith("audio/") || droppedFile.name.match(/\.(mp3|wav|ogg|m4a|aac|webm|flac)$/i))) {
        onFileChange(droppedFile);
      }
    },
    [onFileChange]
  );

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFileChange(null);
  };

  const togglePreviewPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const borderColors = {
    indigo: isDragOver ? "border-indigo-400 bg-indigo-950/30" : "border-slate-700 hover:border-indigo-500/60",
    cyan: isDragOver ? "border-cyan-400 bg-cyan-950/30" : "border-slate-700 hover:border-cyan-500/60",
    emerald: isDragOver ? "border-emerald-400 bg-emerald-950/30" : "border-slate-700 hover:border-emerald-500/60",
  }[colorTheme];

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full min-h-[140px] p-4 border-2 border-dashed rounded-xl cursor-pointer bg-slate-800/80 transition-all duration-200 ${borderColors}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl && (
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        <div className="flex flex-col items-center justify-center text-center w-full">
          {file ? (
            <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Play preview button */}
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                  title={isPlaying ? "Pausar" : "Escuchar"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="text-left truncate">
                  <p className="font-semibold text-sm text-slate-200 truncate max-w-[180px] sm:max-w-[240px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-11 h-11 mb-2.5 rounded-full bg-slate-700/80 flex items-center justify-center text-slate-300">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                <span className="text-indigo-400 font-semibold">Clic para subir</span> o arrastrar
              </p>
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            </>
          )}
        </div>
        <input
          id={id}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default AudioUploader;
