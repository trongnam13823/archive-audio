import { memo, useEffect, useRef, useState } from "react";

export default memo(function Timer({ setIsPlaying }) {
  const [timerValue, setTimerValue] = useState(formatTimeFromDate(new Date()));
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef(null);

  const clearTimer = () => {
    clearInterval(intervalRef.current);
    setRemaining(0);
    setTimerValue(formatTimeFromDate(new Date()));
  };

  const startTimer = () => {
    if (!timerValue) return;

    const [hh, mm] = timerValue.split(":").map(Number);
    const now = new Date();

    // Tạo thời gian hẹn hôm nay
    let target = new Date();
    target.setHours(hh, mm, 0, 0);

    // Nếu đã qua giờ hẹn thì dời sang ngày mai
    if (target <= now) target.setDate(target.getDate() + 1);

    // Tính thời gian còn lại
    let diff = target.getTime() - now.getTime();
    setRemaining(diff);

    // clear cũ nếu có
    clearInterval(intervalRef.current);

    // Đếm ngược
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1000) return prev - 1000;
        clearTimer();
        setIsPlaying(false);
        return 0;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="w-full p-4 border-b border-white/20 text-gray-300 flex justify-center gap-2">
      <span className="self-center">Hẹn giờ: </span>

      {remaining > 0 ? (
        <>
          <span className="text-white font-mono self-center">
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
            onChange={(e) => {
              console.log(e.target.value);
              setTimerValue(e.target.value);
            }}
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
  );
});

function formatRemaining(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatTimeFromDate(date) {
  if (!(date instanceof Date)) {
    throw new Error("Input must be a Date object");
  }

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
