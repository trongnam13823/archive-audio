import { memo, useState } from "react";
import {
  RotateCw,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
} from "lucide-react";
import { formatDuration } from "./utils";

const PlayerControls = ({
  duration,
  seeking,
  setSeeking,
  currentTime,
  setCurrentTime,
  tracks,
  currentIndex,
  paused,
  audioLoading,
  onReload,
  onPrev,
  onTogglePlay,
  onNext,
  onShuffle,
}) => {
  const track = tracks[currentIndex];

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const [value, setValue] = useState(null);

  const handleChange = (e) => {
    if (!seeking) setSeeking(true);
    setValue(e.target.value);
  };

  const handleSeekEnd = (e) => {
    const newTime = (e.target.value / 100) * duration;
    setSeeking(false);
    setCurrentTime(newTime);
    setValue(null);
  };

  return (
    <div className="w-full p-4 text-center space-y-4 border-t border-white/20">
      {/* Track info */}
      <div>
        <h1 className="font-bold text-xl line-clamp-1">{track.title}</h1>
        <p>
          {currentIndex + 1}/{tracks.length}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span>
          {formatDuration(
            value && duration ? (value / 100) * duration : currentTime
          )}
        </span>
        <input
          type="range"
          className="w-full transition-all"
          value={seeking ? Number(value) : progress}
          min={0}
          max={100}
          step={0.01}
          onChange={handleChange}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
        />
        <span>{formatDuration(duration)}</span>
      </div>

      {/* Player controls */}
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
          disabled={audioLoading}
        >
          {paused ? (
            <Play size={24} color="#000" />
          ) : (
            <Pause size={24} color="#000" />
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
};

export default memo(PlayerControls);
