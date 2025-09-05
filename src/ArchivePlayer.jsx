/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import {
  getCircularIndex,
  loadPlayerState,
  savePlayerState,
  shuffleArray,
  updateMediaMetadata,
} from "./utils";
import useTracks from "./useTracks";
import NoSleep from "nosleep.js";
import TrackList from "./TrackList";
import PlayerControls from "./PlayerControls";

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
  const noSleepRef = useRef(new NoSleep());
  const activeItemRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [init, setInit] = useState(false);

  // Load trạng thái player từ localStorage
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

  // Lưu trạng thái player vào localStorage khi thay đổi
  useEffect(() => {
    const handleSaveState = () => {
      savePlayerState({
        identifier,
        tracks,
        currentIndex,
        currentTime: audioRef.current?.currentTime || 0,
      });
    };

    window.addEventListener("beforeunload", handleSaveState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleSaveState();
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleSaveState);
      document.removeEventListener("visibilitychange", handleSaveState);
    };
  }, [identifier, tracks, currentIndex]);

  // Cập nhật src khi track thay đổi
  useEffect(() => {
    if (tracks.length) {
      audioRef.current.src = tracks[currentIndex].url;
    }
  }, [currentIndex, tracks]);

  // Scroll track active
  useEffect(() => {
    if (!activeItemRef.current) return;
    activeItemRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [currentIndex, paused]);

  // Toggle play/pause
  const onTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.currentTime = currentTime;
      audio.play();
    } else {
      audio.pause();
    }
  };

  const onPrev = () =>
    setCurrentIndex(getCircularIndex(currentIndex, -1, tracks));

  const onNext = () =>
    setCurrentIndex(getCircularIndex(currentIndex, +1, tracks));

  const onReload = async () => {
    await fetchTracks();
    setCurrentIndex(0);
  };

  const onShuffle = () => {
    setTracks(shuffleArray(tracks));
    setCurrentIndex(0);
  };

  const onTrackByIndex = (index) => setCurrentIndex(index);

  // Event listeners cho audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      noSleepRef.current.enable();
      setPaused(false);
    };
    const onPause = () => setPaused(true);
    const onLoadstart = () => {
      setDuration(0);
      setAudioLoading(true);
      setPaused(true);
    };
    const onLoadedmetadata = () => {
      setAudioLoading(false);
      setDuration(audio.duration);
      audio.play();
    };
    const onEnded = onNext;
    const onTimeupdate = () => {
      if (!seeking) setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadstart", onLoadstart);
    audio.addEventListener("loadedmetadata", onLoadedmetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeupdate);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadstart", onLoadstart);
      audio.removeEventListener("loadedmetadata", onLoadedmetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeupdate);
    };
  }, [init, currentIndex, tracks, seeking]);

  // Media Session
  useEffect(() => {
    if (!("mediaSession" in navigator) || !tracks.length) return;

    updateMediaMetadata(tracks[currentIndex]);
    navigator.mediaSession.setActionHandler("play", onTogglePlay);
    navigator.mediaSession.setActionHandler("pause", onTogglePlay);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
  }, [currentIndex, tracks]);

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
        audioRef.current.pause();
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

  useEffect(() => {
    if (!seeking) {
      audioRef.current.currentTime = currentTime;
    }
  }, [seeking]);

  return (
    <div className="w-svw h-svh flex flex-col justify-center items-center">
      {tracksLoading || !init ? (
        "Loading..."
      ) : tracks.length > 0 ? (
        <>
          {/* Timer */}
          <div className="w-full p-4 border-b border-white/20 text-gray-300 flex justify-center gap-2">
            <span className="self-center">Hẹn giờ: </span>
            {remaining > 0 ? (
              <>
                <span className=" text-white font-mono self-center">
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

          <TrackList
            activeItemRef={activeItemRef}
            currentIndex={currentIndex}
            onTrackByIndex={onTrackByIndex}
            tracks={tracks}
          />

          <PlayerControls
            duration={duration}
            currentTime={currentTime}
            seeking={seeking}
            setSeeking={setSeeking}
            setCurrentTime={setCurrentTime}
            currentIndex={currentIndex}
            tracks={tracks}
            paused={paused}
            audioLoading={audioLoading}
            onReload={onReload}
            onPrev={onPrev}
            onTogglePlay={onTogglePlay}
            onNext={onNext}
            onShuffle={onShuffle}
          />
        </>
      ) : (
        "Danh sách rỗng"
      )}
    </div>
  );
}
