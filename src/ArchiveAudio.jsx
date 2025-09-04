import { useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  RotateCw,
  Music,
  SkipBack,
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

  return (
    <main className="max-w-md mx-auto h-screen flex flex-col bg-black text-gray-100">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoaderCircle className="animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <>
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl text-center font-bold text-white mb-4 truncate">
              {tracks[currentIndex]?.title}
            </h1>

            <audio
              ref={audioRef}
              playsInline
              preload="auto"
              controls
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
