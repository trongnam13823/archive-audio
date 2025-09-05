import { memo } from "react";

export default memo(function List({
  tracks,
  currentIndex,
  activeTrackRef,
  onSelect,
}) {
  return (
    <ul className="w-full flex-1 overflow-y-auto">
      {tracks.map((t, i) => (
        <li
          onClick={() => onSelect(i)}
          ref={i === currentIndex ? activeTrackRef : null}
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
});
