/* eslint-disable react-hooks/exhaustive-deps */
import { LoaderCircle, Music, Pause, Play, RotateCw, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const fetchTracks = async (identifier) => {
    const res = await fetch(`https://archive.org/metadata/${identifier}`);
    const data = await res.json();
    const tracks = (data?.files ?? []).filter((f) => ["Opus"].includes(f.format));

    // Sắp xếp tracks theo số ở đầu tên file
    tracks.sort((a, b) => {
        // Lấy số đầu tiên ở tên file a
        const numA = parseInt(a.name.match(/^(\d+)/)?.[1] ?? "0", 10);
        // Lấy số đầu tiên ở tên file b
        const numB = parseInt(b.name.match(/^(\d+)/)?.[1] ?? "0", 10);
        return numA - numB;
    });

    return tracks.map((t, index) => ({
        id: index.toString(),
        title: t.name.replace(/\.[^/.]+$/, "").normalize("NFKC"),
        url: `https://archive.org/download/${identifier}/${t.name}`,
        artwork: "",
    }));
};

const updateMediaMetadata = (track, identifier) => {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track?.title || "Unknown Title",
        artist: identifier || "Unknown Artist",
        album: "Unknown Album",
        artwork: [
            {
                src: "https://yt3.googleusercontent.com/jodQngzGXTMgzCuUlgFJFg1MOvMK797ez9K7gsO40owPy9VwfR7AZlJ6UauWCVadk3DRa1VslQ=s160-c-k-c0x00ffffff-no-rj",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    });
};

function shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getNextIndex(currentIndex, tracksLength, step) {
    return (currentIndex + step + tracksLength) % tracksLength;
}

export default function ArchiveAudio() {
    const [identifier, setIdentifier] = useState("");
    const [tracks, setTracks] = useState([]);
    const [trackCurrentIndex, setTrackCurrentIndex] = useState(0);
    const [isTracksLoading, setIsTracksLoading] = useState(false);
    const [isActiveAudioLoading, setActiveAudioLoading] = useState(false);
    const [isPlay, setIsPlay] = useState(false);
    const audioRefA = useRef(null);
    const audioRefB = useRef(null);
    const audioRefC = useRef(null);
    const [activeAudioId, setActiveAudioId] = useState("A");

    const getAudios = () => {
        const audioRefs = {
            A: audioRefA.current,
            B: audioRefB.current,
            C: audioRefC.current,
        };

        const orderMap = {
            A: ["A", "B", "C"],
            B: ["B", "C", "A"],
            C: ["C", "A", "B"],
        };

        const order = orderMap[activeAudioId];

        return {
            active: audioRefs[order[0]],
            next: audioRefs[order[1]],
            prev: audioRefs[order[2]],
        };
    };

    useEffect(() => {
        const identifier = localStorage.getItem("identifier") ?? "tacgiasuthatman";
        const tracks = JSON.parse(localStorage.getItem("tracks") ?? "[]");
        const trackCurrentIndex = JSON.parse(localStorage.getItem("trackCurrentIndex") ?? "0");

        setIdentifier(identifier);
        setTracks(tracks);
        setTrackCurrentIndex(trackCurrentIndex);
    }, []);

    useEffect(() => {
        if (identifier && tracks.length === 0) onLoadIdentifier();
    }, [identifier]);

    useEffect(() => {
        if (tracks.length === 0) return;

        const currentItem = document.getElementById(`track-${trackCurrentIndex}`);
        currentItem.scrollIntoView({ block: "center" });

        if (tracks.length > 0) {
            const { active, next, prev } = getAudios();

            if (!active.src) {
                active.src = tracks[trackCurrentIndex].url;
            }

            if (active.readyState < 3) {
                setActiveAudioLoading(true);
            }

            if (isPlay) active.play();

            next.pause();
            prev.pause();

            next.src = tracks[getNextIndex(trackCurrentIndex, tracks.length, +1)].url;
            prev.src = tracks[getNextIndex(trackCurrentIndex, tracks.length, -1)].url;
        }

        if ("mediaSession" in navigator) {
            updateMediaMetadata(tracks[trackCurrentIndex], identifier);

            navigator.mediaSession.setActionHandler("previoustrack", onPrev);
            navigator.mediaSession.setActionHandler("nexttrack", onNext);
            navigator.mediaSession.setActionHandler("play", () => onPlay());
            navigator.mediaSession.setActionHandler("pause", () => onPause());
        }
    }, [trackCurrentIndex, tracks]);

    const onLoadIdentifier = async (e) => {
        const text = e?.target?.textContent || identifier;
        if (!text) return;

        setIsTracksLoading(true);
        const tracks = await fetchTracks(text);

        localStorage.setItem("identifier", text);
        localStorage.setItem("tracks", JSON.stringify(tracks));
        localStorage.setItem("trackCurrentIndex", 0);

        setTracks(tracks);
        setIdentifier(text);
        setIsTracksLoading(false);
        setTrackCurrentIndex(0);
    };

    const onTogglePlay = () => {
        const { active } = getAudios();

        if (isPlay) active.pause();
        else active.play();

        setIsPlay(!isPlay);
    };

    const onPlay = () => {
        const { active } = getAudios();
        active.play();
        setIsPlay(true);
    };

    const onPause = () => {
        const { active } = getAudios();
        active.pause();
        setIsPlay(false);
    };

    const onNext = () => {
        const { next } = getAudios();
        const index = getNextIndex(trackCurrentIndex, tracks.length, 1);

        setTrackCurrentIndex(index);
        setActiveAudioId(next.id);

        updateMediaMetadata(tracks[index], identifier);
        localStorage.setItem("trackCurrentIndex", index);
    };

    const onPrev = () => {
        const { prev } = getAudios();
        const index = getNextIndex(trackCurrentIndex, tracks.length, -1);

        setTrackCurrentIndex(index);
        setActiveAudioId(prev.id);

        updateMediaMetadata(tracks[index], identifier);
        localStorage.setItem("trackCurrentIndex", index);
    };

    const onTrack = (index) => {
        const { active } = getAudios();

        active.src = tracks[index].url;

        setTrackCurrentIndex(index);
        setActiveAudioId(active.id);

        localStorage.setItem("trackCurrentIndex", index);
    };

    const onShuffle = () => {
        const { active } = getAudios();
        const shuffledTracksa = shuffleArray(tracks);

        active.src = shuffledTracksa[0].url;

        setTracks(shuffledTracksa);
        setTrackCurrentIndex(0);
        setActiveAudioId(active.id);

        localStorage.setItem("tracks", JSON.stringify(shuffledTracksa));
        localStorage.setItem("trackCurrentIndex", 0);
    };

    const onCanPlayAudio = (e) => {
        if (e.target.id === activeAudioId) {
            setActiveAudioLoading(false);
        }
    };

    return (
        <main className="max-w-md mx-auto h-svh w-svw flex flex-col bg-black text-gray-100">
            {/* Header với identifier */}
            <div className="p-4 border-b border-gray-800">
                <p
                    contentEditable
                    suppressContentEditableWarning={true}
                    spellCheck={false}
                    onBlur={onLoadIdentifier}
                    className="focus:outline-0 text-center text-lg font-medium text-gray-300 focus:text-white transition-colors duration-200"
                >
                    {identifier || "Enter Identifier"}
                </p>
            </div>

            {tracks.length > 0 && !isTracksLoading ? (
                <>
                    {/* Player controls */}
                    <div className="p-6 border-b border-gray-800">
                        <h1 className="text-2xl text-center font-bold text-white mb-6 truncate">
                            {tracks[trackCurrentIndex]?.title}
                        </h1>

                        <audio
                            id="A"
                            ref={audioRefA}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "A" ? "block" : "hidden"}`}
                            onEnded={onNext}
                            onCanPlay={onCanPlayAudio}
                        />

                        <audio
                            id="B"
                            ref={audioRefB}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "B" ? "block" : "hidden"}`}
                            onEnded={onNext}
                            onCanPlay={onCanPlayAudio}
                        />

                        <audio
                            id="C"
                            ref={audioRefC}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "C" ? "block" : "hidden"}`}
                            onEnded={onNext}
                            onCanPlay={onCanPlayAudio}
                        />

                        <div className="flex items-center justify-evenly gap-4 mb-4">
                            <button
                                className="p-2 text-gray-400 cursor-pointer hover:text-white transition-colors"
                                onClick={onLoadIdentifier}
                            >
                                <RotateCw size={20} />
                            </button>
                            <button
                                className="p-2 text-gray-400 cursor-pointer hover:text-white transition-colors"
                                onClick={onPrev}
                            >
                                <SkipBack size={20} />
                            </button>
                            <button
                                className="p-3 bg-white cursor-pointer text-black rounded-full hover:bg-gray-200 transition-colors"
                                onClick={onTogglePlay}
                            >
                                {isActiveAudioLoading ? (
                                    <LoaderCircle className="animate-spin" />
                                ) : isPlay ? (
                                    <Pause size={24} />
                                ) : (
                                    <Play size={24} />
                                )}
                            </button>
                            <button
                                className="p-2 text-gray-400 cursor-pointer hover:text-white transition-colors"
                                onClick={onNext}
                            >
                                <SkipForward size={20} />
                            </button>
                            <button
                                className="p-2 text-gray-400 cursor-pointer hover:text-white transition-colors"
                                onClick={onShuffle}
                            >
                                <Shuffle size={20} />
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-400">
                            {trackCurrentIndex + 1} / {tracks.length} tracks
                        </div>
                    </div>

                    {/* Track list */}
                    <div className="flex-1 overflow-hidden">
                        <ul className="h-full overflow-y-auto">
                            {tracks.map((t, index) => (
                                <li
                                    id={`track-${index}`}
                                    key={t.id}
                                    onClick={() => onTrack(index)}
                                    className={`px-6 py-3 cursor-pointer transition-colors flex gap-2 justify-between w-full ${
                                        index === trackCurrentIndex
                                            ? "font-medium bg-gray-200/20"
                                            : "text-gray-200 hover:text-white hover:bg-gray-200/20"
                                    }`}
                                >
                                    <span className="truncate">{t.title}</span>
                                    {index === trackCurrentIndex && <Music className={`animate-pulse`} />}
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        {isTracksLoading ? (
                            <div className="flex items-center gap-3">
                                <LoaderCircle className="animate-spin" />
                                Loading...
                            </div>
                        ) : (
                            "Track list is empty."
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
