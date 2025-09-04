import { useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  RotateCw,
  Music,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
} from "lucide-react";
import NoSleep from "nosleep.js";

// ===== Helper =====
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const fetchTracks = async (identifier) => {
  const res = await fetch(`https://archive.org/metadata/${identifier}`);
  const data = await res.json();
  const tracks = (data?.files ?? []).filter((f) =>
    ["Opus", "VBR MP3"].includes(f.format)
  );
  tracks.sort((a, b) => b.mtime - a.mtime);

  return tracks.map((t, i) => {
    let title = t.name.replace(/\.[^/.]+$/, "").normalize("NFKC");
    title = title.split("#")[0].trim();
    return {
      id: i.toString(),
      title: `${tracks.length - i} - ${title}`,
      url: `https://archive.org/download/${identifier}/${encodeURIComponent(
        t.name
      )}`,
    };
  });
};

const updateMediaMetadata = (track) => {
  if ("mediaSession" in navigator) {
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
  }
};

// ===== LocalStorage helpers =====
const savePlayerState = ({ identifier, currentIndex, currentTime, tracks }) => {
  const state = {
    ...JSON.parse(localStorage.getItem("playerState") || "{}"),
    identifier,
    currentIndex,
    currentTime,
    ...(tracks ? { tracks } : {}),
  };
  localStorage.setItem("playerState", JSON.stringify(state));
};

const loadPlayerState = () => {
  return JSON.parse(localStorage.getItem("playerState") || "{}");
};

// ===== Custom hooks =====
const useTracks = (identifier) => {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!identifier) return;
      setIsLoading(true);

      try {
        const saved = loadPlayerState();
        if (saved.identifier === identifier && saved.tracks?.length) {
          setTracks(saved.tracks);
          setCurrentIndex(saved.currentIndex ?? 0);
        } else {
          const fetched = await fetchTracks(identifier);
          setTracks(fetched);
          setCurrentIndex(0);
          savePlayerState({
            identifier,
            currentIndex: 0,
            currentTime: 0,
            tracks: fetched,
          });
        }
      } catch (err) {
        console.error("Failed to fetch tracks:", err);
        setTracks([]);
        setCurrentIndex(0);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [identifier]);

  const shuffleTracksHandler = () => {
    setTracks((prev) => {
      const shuffled = shuffleArray(prev);
      savePlayerState({
        identifier,
        currentIndex: 0,
        currentTime: 0,
        tracks: shuffled,
      });
      return shuffled;
    });
    setCurrentIndex(0);
  };

  const reloadTracksHandler = async () => {
    if (!identifier) return;
    setIsLoading(true);
    try {
      const fetched = await fetchTracks(identifier);
      setTracks(fetched);
      setCurrentIndex(0);
      savePlayerState({
        identifier,
        currentIndex: 0,
        currentTime: 0,
        tracks: fetched,
      });
    } catch (err) {
      console.error("Failed to reload tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    tracks,
    currentIndex,
    setCurrentIndex,
    setTracks,
    isLoading,
    setIsLoading,
    shuffleTracksHandler,
    reloadTracksHandler,
  };
};

const useMediaSession = (track, play, pause, change) => {
  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) return;
    updateMediaMetadata(track);

    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("nexttrack", () => change(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => change(-1));
  }, [track]);
};

const useNoSleep = () => {
  const ref = useRef(null);
  const enable = () => {
    if (!ref.current) ref.current = new NoSleep();
    ref.current.enable();
  };
  return enable;
};

// ===== Component chính =====
export default function ArchiveAudio() {
  const [identifier, setIdentifier] = useState(
    localStorage.getItem("identifier") ?? "tiktok-tacgiasuthatman"
  );

  const {
    tracks,
    currentIndex,
    setCurrentIndex,
    isLoading,
    shuffleTracksHandler,
    reloadTracksHandler,
  } = useTracks(identifier);

  const audioRef = useRef(null);
  const enableNoSleep = useNoSleep();

  const playAudio = () => {
    enableNoSleep();
    audioRef.current.play().catch(() => {});
  };

  const pauseAudio = () => {
    audioRef.current.pause();
  };

  const changeTrack = (step) => {
    if (!tracks.length) return;
    setCurrentIndex((prev) => (prev + step + tracks.length) % tracks.length);
  };

  // ===== Khi track thay đổi =====
  useEffect(() => {
    if (!tracks.length) return;
    const audio = audioRef.current;
    audio.src = tracks[currentIndex]?.url || "";

    const saved = loadPlayerState();
    if (
      saved.identifier === identifier &&
      saved.currentIndex === currentIndex &&
      saved.currentTime != null
    ) {
      audio.currentTime = saved.currentTime;
    } else {
      audio.currentTime = 0;
    }

    savePlayerState({
      identifier,
      currentIndex,
      currentTime: audio.currentTime,
      tracks,
    });

    audio.play().catch(() => {});
  }, [currentIndex, tracks, identifier]);

  // ===== Lưu thời gian playback =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      savePlayerState({
        identifier,
        currentIndex,
        currentTime: audio.currentTime,
        tracks,
      });
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [currentIndex, identifier, tracks]);

  useMediaSession(tracks[currentIndex], playAudio, pauseAudio, changeTrack);

  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[currentIndex];
    if (!item) return;

    const scrollTop =
      currentIndex * item.clientHeight -
      list.clientHeight / 2 +
      item.clientHeight / 2;
    list.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, [currentIndex]);

  // ================= Timer ===================
  const [timerValue, setTimerValue] = useState("00:00"); // format HH:MM
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    const [hours, minutes] = timerValue.split(":").map(Number);
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);

    // Nếu giờ đã qua hôm nay, tính cho ngày mai
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const diffMs = targetTime - now;
    setRemaining(diffMs);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const now = new Date();
      const diff = targetTime - now;

      if (diff <= 0) {
        clearInterval(timerRef.current);
        setRemaining(0);
        pauseAudio();
        alert("Đã đến giờ hẹn! Dừng phát nhạc.");
        return;
      }

      setRemaining(diff);
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemaining(0);
  };

  // format thời gian còn lại
  const formatRemaining = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  // ==========================================

  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      enableNoSleep();
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Cleanup khi component unmount
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  return (
    <main className="max-w-md mx-auto h-screen flex flex-col bg-black text-gray-100">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoaderCircle className="animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <>
          {/* Timer */}
          <div className="p-4 border-b border-gray-800 text-center text-gray-300 flex items-center justify-center gap-2">
            <span>Hẹn giờ: </span>
            {remaining > 0 ? (
              <>
                <span className=" text-white tracking-widest">
                  {formatRemaining(remaining)}
                </span>

                <button
                  onClick={clearTimer}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded"
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <input
                  type="time"
                  value={timerValue}
                  onChange={(e) => setTimerValue(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded"
                  step={60}
                />
                <button
                  onClick={startTimer}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded"
                >
                  Bắt đầu
                </button>
              </>
            )}
          </div>
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl text-center font-bold text-white mb-4 truncate">
              {tracks[currentIndex]?.title}
            </h1>

            <audio
              ref={audioRef}
              playsInline
              preload="auto"
              style={{ width: "100%", appearance: "none" }}
              onPlay={() => enableNoSleep()}
              onEnded={() => changeTrack(1)}
            />

            <div className="flex items-center justify-evenly gap-4 mb-4 mt-4">
              <button
                className="cursor-pointer size-10 flex justify-center items-center bg-transparent hover:bg-gray-200/20 rounded-full"
                onClick={reloadTracksHandler}
              >
                <RotateCw size={20} />
              </button>

              <button
                className="cursor-pointer size-10 flex justify-center items-center bg-transparent hover:bg-gray-200/20 rounded-full"
                onClick={() => changeTrack(-1)}
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                className="flex justify-center items-center cursor-pointer rounded-full p-4 bg-white hover:scale-105 "
              >
                {isPlaying ? (
                  <Pause size={24} color="#000" />
                ) : (
                  <Play size={24} color="#000" />
                )}
              </button>
              <button
                className="cursor-pointer size-10 flex justify-center items-center bg-transparent hover:bg-gray-200/20 rounded-full"
                onClick={() => changeTrack(1)}
              >
                <SkipForward size={20} />
              </button>
              <button
                className="cursor-pointer size-10 flex justify-center items-center bg-transparent hover:bg-gray-200/20 rounded-full"
                onClick={shuffleTracksHandler}
              >
                <Shuffle size={20} />
              </button>
            </div>

            <div className="text-center text-sm text-gray-400">
              {currentIndex + 1} / {tracks.length}
            </div>
          </div>

          <ul ref={listRef} className="flex-1 overflow-y-auto">
            {tracks.map((t, idx) => (
              <li
                key={t.id}
                onClick={() => setCurrentIndex(idx)}
                className={`px-6 py-3 cursor-pointer flex justify-between ${
                  idx === currentIndex
                    ? "font-medium bg-gray-200/20"
                    : "text-gray-200 hover:text-white hover:bg-gray-200/20"
                }`}
              >
                <span className="truncate">{t.title}</span>
                {idx === currentIndex && <Music className="animate-pulse" />}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
