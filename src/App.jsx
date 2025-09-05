import { useCallback, useRef, useState, useEffect } from "react";
import ReactPlayer from "react-player";
import useTracks from "./hooks/useTracks";
import Timer from "./components/Timer";
import List from "./components/List";
import Controls from "./components/Controls";
import NoSleep from "nosleep.js";

export default function PlayerWrapper() {
  const {
    tracks,
    isTracksLoading,
    fetchTracks,
    setTracks,
    currentIndex,
    setCurrentIndex,
    shuffleTracks,
  } = useTracks("tiktok-tacgiasuthatman");

  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setSeeking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const activeTrackRef = useRef(null);
  const noSleepRef = useRef(new NoSleep());

  const [duration, setDuration] = useState(0);

  // Scroll track active vào giữa khi currentIndex thay đổi
  useEffect(() => {
    if (activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, isPlaying]);

  // Play / Pause
  const onTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Next track (xoay vòng)
  const onNext = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  }, [tracks.length]);

  // Prev track (xoay vòng)
  const onPrev = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  // Gọi lại API
  const onReload = useCallback(async () => {
    await fetchTracks();
    setCurrentTime(0);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [fetchTracks]);

  // Xáo trộn tracks
  const onShuffle = useCallback(() => {
    shuffleTracks();
    setCurrentIndex(0);
  }, [setTracks]);

  // Khi track kết thúc, tự động phát tiếp
  const onEnded = useCallback(() => {
    onNext();
  }, [onNext]);

  // Khi click vào track trong List
  const onSelect = useCallback(
    (index) => {
      setCurrentTime(0);
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [setCurrentIndex, setIsPlaying]
  );

  // Cập nhật thời gian hiện tại
  const onTimeUpdate = useCallback(
    (e) => {
      if (!isSeeking) {
        setIsAudioLoading(false);
        setCurrentTime(e.target.currentTime);
      }
    },
    [setCurrentTime, isSeeking]
  );

  // Cập nhật tổng thời gian
  const onDurationChange = useCallback(
    (e) => {
      setDuration(e.target.duration);
    },
    [setDuration]
  );

  // Sự kiện khi kéo
  const onSeekChange = useCallback(
    (e) => {
      if (!isSeeking) setSeeking(true);
      setCurrentTime(e.target.value);
    },
    [isSeeking, setSeeking, setCurrentTime]
  );

  // Sự kiện khi thả
  const onSeekUp = useCallback(
    (e) => {
      setSeeking(false);
      playerRef.current.currentTime = e.target.value;
    },
    [setSeeking]
  );

  const onWaiting = useCallback(
    (e) => {
      setIsAudioLoading(true);
      setDuration(e.target.duration);
    },
    [setDuration]
  );

  const onProgress = useCallback(() => {
    setIsAudioLoading(false);
  }, [setIsAudioLoading]);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    noSleepRef.current.enable();
  }, [noSleepRef, setIsPlaying]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  return (
    <div className="w-svw h-svh flex flex-col justify-center items-center">
      {isTracksLoading ? (
        "Đang tải..."
      ) : tracks.length < 1 ? (
        "Danh sách trống"
      ) : (
        <>
          <ReactPlayer
            ref={playerRef}
            src={tracks[currentIndex].url}
            playing={isPlaying}
            onEnded={onEnded}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
            onWaiting={onWaiting}
            onPlay={onPlay}
            onPause={onPause}
            onProgress={onProgress}
          />

          {/* Hẹn giờ */}
          <Timer setIsPlaying={setIsPlaying} />

          {/* Danh sách */}
          <List
            tracks={tracks}
            currentIndex={currentIndex}
            activeTrackRef={activeTrackRef}
            onSelect={onSelect}
          />

          {/* Điều Khiển */}
          <Controls
            isAudioLoading={isAudioLoading}
            playerRef={playerRef}
            tracks={tracks}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onNext={onNext}
            onPrev={onPrev}
            onReload={onReload}
            onShuffle={onShuffle}
            currentTime={currentTime}
            duration={duration}
            onSeekChange={onSeekChange}
            onSeekUp={onSeekUp}
          />
        </>
      )}
    </div>
  );
}
