import { memo } from "react";

const TrackList = ({ tracks, currentIndex, onTrackByIndex, activeItemRef }) => {
  return (
    <ul className="w-full flex-1 overflow-y-auto">
      {tracks.map((t, i) => (
        <li
          onClick={() => onTrackByIndex(i)}
          ref={i === currentIndex ? activeItemRef : null}
          key={t.id}
          className={`px-4 py-2 cursor-pointer ${
            i === currentIndex ? "bg-white/20 font-bold" : "hover:bg-white/20"
          }`}
        >
          {t.title}
        </li>
      ))}
    </ul>
  );
};

export default memo(TrackList);
