export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const getCircularIndex = (currentIndex, step, arr) => {
  const len = arr.length;
  return (((currentIndex + step) % len) + len) % len;
};

export const updateMediaMetadata = (track) => {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track?.title || "Unknown Title",
    artist: "Sự Thật Man",
    artwork: [
      {
        src: "/tacgiasuthatman.jpg",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  });
};

export const savePlayerState = ({
  identifier,
  currentIndex,
  tracks,
  currentTime,
}) => {
  localStorage.setItem(
    "playerState",
    JSON.stringify({ identifier, currentIndex, tracks, currentTime })
  );
};

export const loadPlayerState = () => {
  return JSON.parse(localStorage.getItem("playerState") || "null");
};
export const formatDuration = (sec) => {
  if (!sec || sec < 0) return "00:00";

  const totalSec = Math.floor(sec); // làm tròn xuống giây
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");

  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};
