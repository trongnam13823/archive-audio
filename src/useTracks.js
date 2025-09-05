import { useState, useCallback } from "react";

export default () => {
  const [identifier, setIdentifier] = useState("tiktok-tacgiasuthatman");
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fetchTracks = useCallback(async () => {
    if (!identifier) return;
    setTracksLoading(true);
    try {
      const res = await fetch(`https://archive.org/metadata/${identifier}`);
      const data = await res.json();
      const allFiles = data?.files ?? [];

      const filtered = allFiles.filter((f) =>
        ["Opus", "VBR MP3"].includes(f.format)
      );

      filtered.sort((a, b) => b.mtime - a.mtime);

      const mapped = filtered.map((t, i) => {
        const title = t.name
          .replace(/\.[^/.]+$/, "")
          .normalize("NFKC")
          .split("#")[0]
          .trim();

        return {
          id: i.toString(),
          title: `${filtered.length - i} - ${title}`,
          url: `https://archive.org/download/${identifier}/${encodeURIComponent(
            t.name
          )}`,
        };
      });

      setTracks(mapped);
    } catch (err) {
      console.error(err);
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, [identifier]);

  return {
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
  };
};
