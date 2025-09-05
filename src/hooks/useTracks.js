import { useCallback, useState } from "react";

export default (identifier) => {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTracksLoading, setIsTracksLoading] = useState(true);

  const fetchTracks = useCallback(async () => {
    if (!identifier) return;

    setIsTracksLoading(true);

    try {
      const res = await fetch(`https://archive.org/metadata/${identifier}`);
      const data = await res.json();
      const rawFiles = data?.files ?? [];

      // Lọc file audio
      const validFiles = rawFiles.filter((f) =>
        ["Opus", "VBR MP3"].includes(f.format)
      );

      // Sắp xếp theo thời gian
      validFiles.sort((a, b) => b.mtime - a.mtime);

      // Đổi thành danh sách track
      const audioTracks = validFiles.map((file, i, arr) =>
        mapFileToTrack(file, i, arr.length, identifier)
      );

      setTracks(audioTracks);
    } catch {
      setTracks([]);
    } finally {
      setIsTracksLoading(false);
    }
  }, [identifier]);

  const shuffleTracks = () => {
    setTracks((prev) => shuffleArray(prev));
  };

  return {
    identifier,
    tracks,
    setTracks,
    currentIndex,
    setCurrentIndex,
    isTracksLoading,
    setIsTracksLoading,
    fetchTracks,
    shuffleTracks,
  };
};

// Chuyển file metadata -> track object
const mapFileToTrack = (file, index, total, identifier) => {
  const title = file.name
    .replace(/\.[^/.]+$/, "") // bỏ phần mở rộng
    .normalize("NFKC")
    .split("#")[0]
    .trim();

  return {
    id: index.toString(),
    title: `${total - index} - ${title}`,
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(
      file.name
    )}`,
  };
};

function shuffleArray(array) {
  const result = [...array]; // sao chép mảng để không thay đổi mảng gốc
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // chọn vị trí ngẫu nhiên từ 0 đến i
    [result[i], result[j]] = [result[j], result[i]]; // hoán đổi
  }
  return result;
}
