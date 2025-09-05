import {
  Pause,
  Play,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { memo } from "react";

export default memo(function Controls({
  currentIndex,
  tracks,
  isPlaying,
  onReload,
  onPrev,
  onNext,
  onTogglePlay,
  onShuffle,
  currentTime,
  duration,
  onSeekChange,
  onSeekUp,
}) {
  return (
    <div className="w-full p-4 text-center space-y-4 border-t border-white/20">
      {/* Track info */}
      <div>
        <h1 className="font-bold text-xl line-clamp-1">
          {tracks[currentIndex].title}
        </h1>
        <p>
          {currentIndex + 1}/{tracks.length}
        </p>
      </div>

      {/* Seek bar */}
      <div className="flex items-center justify-between gap-2">
        <span>{formatDuration(currentTime)}</span>
        <input
          type="range"
          className="w-full transition-all"
          min={0}
          max={isNaN(duration) ? 0 : duration}
          step={0.01}
          value={isNaN(currentTime) ? 0 : currentTime}
          onChange={onSeekChange}
          onMouseUp={onSeekUp}
          onTouchEnd={onSeekUp}
        />
        <span>{formatDuration(duration)}</span>
      </div>

      {/* controls */}
      <div className="flex gap-4 items-center justify-between">
        <button
          className="cursor-pointer size-14 flex justify-center items-center hover:bg-gray-200/20 rounded-full"
          onClick={onReload}
        >
          <RotateCw size={20} />
        </button>

        <button
          className="cursor-pointer size-14 flex justify-center items-center hover:bg-gray-200/20 rounded-full"
          onClick={onPrev}
        >
          <SkipBack size={20} />
        </button>

        <button
          className="cursor-pointer size-14 flex justify-center items-center bg-white hover:scale-105 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause size={24} color="#000" />
          ) : (
            <Play size={24} color="#000" />
          )}
        </button>

        <button
          className="cursor-pointer size-14 flex justify-center items-center hover:bg-gray-200/20 rounded-full"
          onClick={onNext}
        >
          <SkipForward size={20} />
        </button>

        <button
          className="cursor-pointer size-14 flex justify-center items-center hover:bg-gray-200/20 rounded-full"
          onClick={onShuffle}
        >
          <Shuffle size={20} />
        </button>
      </div>
    </div>
  );
});

function formatDuration(sec) {
  if (!sec || sec < 0) return "00:00";

  const totalSec = Math.floor(sec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");

  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}
