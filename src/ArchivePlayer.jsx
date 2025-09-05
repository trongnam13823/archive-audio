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
  const activeItemRef = useRef(null);
  const noSleepRef = useRef(new NoSleep());

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
      setAudioLoading(true);
      setPaused(true);
    };
    const onLoadedmetadata = () => {
      setAudioLoading(false);
      audio.play();
    };
    const onEnded = onNext;
    const onTimeupdate = () => {
      setCurrentTime(audio.currentTime);
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
  }, [init, currentIndex, tracks]);

  // Media Session
  useEffect(() => {
    if (!("mediaSession" in navigator) || !tracks.length) return;

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
          <TrackList
            activeItemRef={activeItemRef}
            currentIndex={currentIndex}
            onTrackByIndex={onTrackByIndex}
            tracks={tracks}
          />

          <PlayerControls
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
