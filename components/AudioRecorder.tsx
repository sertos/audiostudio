import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface AudioRecorderProps {
  onAudioRecorded: (file: File) => void;
  label?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  label = "O Grabar Audio Directo con Micrófono",
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  const drawLiveWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#10b981"; // emerald-500

      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Web Audio for live visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawLiveWaveform();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        // Convert Blob to File
        const file = new File([blob], `grabacion_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        onAudioRecorded(file);

        // Cleanup tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic error:", err);
      setMicError(
        "No se pudo acceder al micrófono. Por favor permite el acceso en el navegador."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
  };

  const togglePlayPreview = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().then(() => setIsPlayingPreview(true)).catch(console.error);
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label}</span>
        </label>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-red-400 font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            REC {formatSecs(recordingDuration)}
          </span>
        )}
      </div>

      {micError && (
        <div className="flex items-center gap-2 p-2 rounded bg-red-950/50 border border-red-800/80 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Recording live waveform canvas */}
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          className="w-full h-14 bg-slate-900 rounded-lg border border-emerald-500/40"
        />
      )}

      {/* Recorded Preview Player */}
      {recordedUrl && !isRecording && (
        <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-900 rounded-lg border border-slate-700">
          <audio
            ref={audioPreviewRef}
            src={recordedUrl}
            onEnded={() => setIsPlayingPreview(false)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPreview}
              className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Audio Grabado</p>
              <p className="text-slate-400">{formatSecs(recordingDuration)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Listo
            </span>
            <button
              onClick={deleteRecording}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Borrar grabación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Trigger Buttons */}
      <div>
        {!isRecording && !recordedUrl && (
          <button
            type="button"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-all active:scale-98"
          >
            <Mic className="w-4 h-4" />
            Iniciar Grabación
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow transition-all animate-pulse active:scale-98"
          >
            <Square className="w-4 h-4 fill-current" />
            Detener Grabación ({formatSecs(recordingDuration)})
          </button>
        )}
      </div>
    </div>
  );
};
