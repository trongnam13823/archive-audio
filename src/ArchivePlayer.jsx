/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import {
  RotateCw,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
} from "lucide-react";
import {
  getCircularIndex,
  loadPlayerState,
  savePlayerState,
  shuffleArray,
  updateMediaMetadata,
} from "./utils";
import useTracks from "./useTracks";
import NoSleep from "nosleep.js";

export default function ArchivePlayer() {
  const {
    identifier,
    setIdentifier,
    tracks,
    setTracks,
    tracksLoading,
    fetchTracks,
    currentIndex,
    setCurrentIndex,
    currentTime,
    setCurrentTime,
  } = useTracks();

  const [paused, setPaused] = useState(true);
  const [audioLoading, setAudioLoading] = useState(true);
  const audioRef = useRef(new Audio());
  const activeItemRef = useRef(null);
  const noSleepRef = useRef(new NoSleep());

  const [init, setInit] = useState(false);

  useEffect(() => {
    const state = loadPlayerState();

    if (state) {
      setIdentifier(state.identifier);
      setTracks(state.tracks);
      setCurrentIndex(state.currentIndex);
      setCurrentTime(state.currentTime);
    } else {
      fetchTracks();
    }

    setInit(true);
  }, []);

  useEffect(() => {
    savePlayerState({
      identifier,
      tracks,
      currentIndex,
      currentTime,
    });
  }, [identifier, tracks, currentIndex, currentTime]);

  useEffect(() => {
    audioRef.current.currentTime = currentTime;
  }, [init]);

  useEffect(() => {
    if (tracks.length) {
      audioRef.current.src = tracks[currentIndex].url;
    }
  }, [currentIndex, tracks]);

  useEffect(() => {
    if (!activeItemRef.current) return;

    activeItemRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [currentIndex, paused]);

  const onTogglePlay = () => {
    if (audioRef?.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const onTrackByIndex = (index) => {
    setCurrentIndex(index);
  };

  const onPrev = () => {
    setCurrentIndex(getCircularIndex(currentIndex, -1, tracks));
  };

  const onNext = () => {
    setCurrentIndex(getCircularIndex(currentIndex, +1, tracks));
  };

  const onReload = async () => {
    await fetchTracks();
    setCurrentIndex(0);
  };

  const onShuffle = () => {
    setTracks(shuffleArray(tracks));
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (!audioRef?.current) return;

    const onPlay = () => {
      noSleepRef.current.enable();
      setPaused(false);
    };
    const onPause = () => setPaused(true);

    const onLoadstart = () => {
      setAudioLoading(true);
      setPaused(true);
    };

    const onLoadedmetadata = () => {
      setAudioLoading(false);
      audioRef.current.play();
    };

    const onTimeupdate = () => {
      setCurrentTime(audioRef.current.currentTime);
    };

    audioRef.current.addEventListener("play", onPlay);
    audioRef.current.addEventListener("pause", onPause);
    audioRef.current.addEventListener("loadstart", onLoadstart);
    audioRef.current.addEventListener("loadedmetadata", onLoadedmetadata);
    audioRef.current.addEventListener("ended", onNext);
    audioRef.current.addEventListener("timeupdate", onTimeupdate);

    return () => {
      audioRef.current.removeEventListener("play", onPlay);
      audioRef.current.removeEventListener("pause", onPause);
      audioRef.current.removeEventListener("loadstart", onLoadstart);
      audioRef.current.removeEventListener("loadedmetadata", onLoadedmetadata);

      audioRef.current.removeEventListener("ended", onNext);
      audioRef.current.removeEventListener("timeupdate", onTimeupdate);
    };
  }, [init, audioRef, currentIndex, tracks]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    updateMediaMetadata(tracks[currentIndex]);

    navigator.mediaSession.setActionHandler("play", onTogglePlay);
    navigator.mediaSession.setActionHandler("pause", onTogglePlay);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
  }, [currentIndex, tracks]);

  return (
    <div className="w-svw h-svh flex flex-col justify-center items-center">
      {tracksLoading || !init ? (
        "Loading..."
      ) : tracks.length > 0 ? (
        <>
          <ul className="w-full flex-1 overflow-y-auto">
            {tracks.map((t, i) => (
              <li
                onClick={() => onTrackByIndex(i)}
                ref={i === currentIndex ? activeItemRef : null}
                key={t.id}
                className={`px-4 py-2 cursor-pointer ${
                  i === currentIndex
                    ? "bg-white/20 font-bold"
                    : "hover:bg-white/20"
                }`}
              >
                {t.title}
              </li>
            ))}
          </ul>

          <div className="w-full p-4 text-center space-y-4  border-t border-white/20">
            <div>
              <h1 className="font-bold text-xl line-clamp-1">
                {tracks[currentIndex].title}
              </h1>
              <p>
                {currentIndex + 1}/{tracks.length}
              </p>
            </div>

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
        </>
      ) : (
        "Danh sách rỗng"
      )}
    </div>
  );
}
