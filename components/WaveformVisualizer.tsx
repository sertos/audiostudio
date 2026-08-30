import React from "react";

interface WaveformVisualizerProps {
  peaks?: number[];
  progress?: number; // 0 to 1
  isPlaying?: boolean;
  color?: string;
  activeColor?: string;
  height?: number;
  onSeek?: (progress: number) => void;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  peaks = [],
  progress = 0,
  isPlaying = false,
  color = "#475569", // slate-600
  activeColor = "#06b6d4", // cyan-500
  height = 40,
  onSeek,
}) => {
  // If no peaks supplied, generate a default aesthetic wave pattern
  const bars = peaks.length > 0
    ? peaks
    : Array.from({ length: 48 }, (_, i) => 0.15 + 0.7 * Math.abs(Math.sin((i / 48) * Math.PI * 3)));

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekProgress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(seekProgress);
  };

  return (
    <div
      onClick={handleClick}
      style={{ height: `${height}px` }}
      className={`w-full flex items-center justify-between gap-1 py-1 ${
        onSeek ? "cursor-pointer group" : ""
      }`}
    >
      {bars.map((peak, idx) => {
        const barProgress = idx / bars.length;
        const isActive = barProgress <= progress;
        const barHeight = Math.max(4, Math.min(height, peak * height));

        return (
          <div
            key={idx}
            style={{
              height: `${barHeight}px`,
              backgroundColor: isActive ? activeColor : color,
              transition: isPlaying ? "height 0.1s ease, background-color 0.1s ease" : "background-color 0.2s ease",
            }}
            className="flex-1 min-w-[2px] max-w-[5px] rounded-full group-hover:opacity-90"
          />
        );
      })}
    </div>
  );
};
