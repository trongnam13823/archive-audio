import { memo } from "react";
import {
  RotateCw,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
} from "lucide-react";

const PlayerControls = ({
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

  return (
    <div className="w-full p-4 text-center space-y-4 border-t border-white/20">
      {/* Track info */}
      <div>
        <h1 className="font-bold text-xl line-clamp-1">{track.title}</h1>
        <p>
          {currentIndex + 1}/{tracks.length}
        </p>
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
