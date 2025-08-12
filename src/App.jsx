/* eslint-disable react-hooks/exhaustive-deps */
import { Pause, Play, RotateCw, Shuffle, SkipBack, SkipForward } from "lucide-react";
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

function App() {
    const [identifier, setIdentifier] = useState("");
    const [tracks, setTracks] = useState([]);
    const [trackCurrentIndex, setTrackCurrentIndex] = useState(0);
    const [isTracksLoading, setIsTracksLoading] = useState(true);
    const [isPlay, setIsPlay] = useState(false);
    const audioRefA = useRef(null);
    const audioRefB = useRef(null);
    const audioRefC = useRef(null);
    const [activeAudioId, setActiveAudioId] = useState("A");

    const getAudios = () => {
        if (activeAudioId === "A")
            return [
                { current: audioRefA.current, id: "A" }, // curr
                { current: audioRefB.current, id: "B" }, // next
                { current: audioRefC.current, id: "C" }, // prev
            ];
        else if (activeAudioId === "B")
            return [
                { current: audioRefB.current, id: "B" },
                { current: audioRefC.current, id: "C" },
                { current: audioRefA.current, id: "A" },
            ];
        else if (activeAudioId === "C") {
            return [
                { current: audioRefC.current, id: "C" },
                { current: audioRefA.current, id: "A" },
                { current: audioRefB.current, id: "B" },
            ];
        }
    };

    useEffect(() => {
        const loadData = async () => {
            const identifier = localStorage.getItem("identifier") ?? "tacgiasuthatman";
            const tracks = JSON.parse(localStorage.getItem("tracks") ?? "[]");
            const trackCurrentIndex = JSON.parse(localStorage.getItem("trackCurrentIndex") ?? "0");

            setIdentifier(identifier);
            setTracks(tracks);
            setTrackCurrentIndex(trackCurrentIndex);
            setIsTracksLoading(false);
        };

        loadData();
    }, []);

    useEffect(() => {
        if (identifier && tracks.length === 0) onLoadIdentifier();
    }, [identifier]);

    useEffect(() => {
        if (tracks.length === 0) return;

        const currentItem = document.getElementById(`track-${trackCurrentIndex}`);
        currentItem.scrollIntoView({ block: "center" });

        if (tracks.length > 0) {
            const [activeAudio, nextAudio, prevAudio] = getAudios();

            if (!activeAudio.current.src) {
                activeAudio.current.src = tracks[trackCurrentIndex].url;
            }

            if (isPlay) activeAudio.current.play();

            nextAudio.current.pause();
            prevAudio.current.pause();

            nextAudio.current.src = tracks[getNextIndex(trackCurrentIndex, tracks.length, +1)].url;
            prevAudio.current.src = tracks[getNextIndex(trackCurrentIndex, tracks.length, -1)].url;
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
        const [activeAudio, _] = getAudios();

        if (isPlay) activeAudio.current.pause();
        else activeAudio.current.play();

        setIsPlay(!isPlay);
    };

    const onPlay = () => {
        const [activeAudio, _] = getAudios();
        activeAudio.current.play();
        setIsPlay(true);
    };

    const onPause = () => {
        const [activeAudio, _] = getAudios();
        activeAudio.current.pause();
        setIsPlay(false);
    };

    const onNext = () => {
        const [_, nextAudio] = getAudios();
        const index = getNextIndex(trackCurrentIndex, tracks.length, 1);

        setTrackCurrentIndex(index);
        setActiveAudioId(nextAudio.id);

        updateMediaMetadata(tracks[index], identifier);
        localStorage.setItem("trackCurrentIndex", index);
    };

    const onPrev = () => {
        const [_, __, prevAudio] = getAudios();
        const index = getNextIndex(trackCurrentIndex, tracks.length, -1);

        setTrackCurrentIndex(index);
        setActiveAudioId(prevAudio.id);

        updateMediaMetadata(tracks[index], identifier);
        localStorage.setItem("trackCurrentIndex", index);
    };

    const onTrack = (index) => {
        const [activeAudio, _] = getAudios();

        activeAudio.current.src = tracks[index].url;

        setTrackCurrentIndex(index);
        setActiveAudioId(activeAudio.id);

        localStorage.setItem("trackCurrentIndex", index);
    };

    const onShuffle = () => {
        const [activeAudio, _] = getAudios();
        const shuffledTracksa = shuffleArray(tracks);

        activeAudio.current.src = shuffledTracksa[0].url;

        setTracks(shuffledTracksa);
        setTrackCurrentIndex(0);
        setActiveAudioId(activeAudio.id);

        localStorage.setItem("tracks", JSON.stringify(shuffledTracksa));
        localStorage.setItem("trackCurrentIndex", 0);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
            <main className="p-4 w-svw h-svh max-w-4xl mx-auto">
                <div className="flex flex-col gap-4 h-full">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700/30">
                        <p
                            contentEditable
                            suppressContentEditableWarning={true}
                            spellCheck={false}
                            onBlur={onLoadIdentifier}
                            className="focus:outline-0 text-center text-lg font-medium text-gray-200 bg-transparent focus:text-white transition-colors duration-200"
                        >
                            {identifier || "Enter Identifier"}
                        </p>
                    </div>

                    {tracks.length > 0 && !isTracksLoading ? (
                        <div className="flex flex-col flex-1">
                            <div className="space-y-4 bg-gray-800/30 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/30 shadow-xl">
                                <h1 className="text-xl truncate text-center font-bold text-white">
                                    {tracks[trackCurrentIndex]?.title}
                                </h1>

                                <audio
                                    ref={audioRefA}
                                    controls
                                    playsInline
                                    preload="auto"
                                    className={`mx-auto w-full rounded-lg ${
                                        activeAudioId === "A" ? "block" : "hidden"
                                    }`}
                                    onEnded={onNext}
                                    style={{ filter: "hue-rotate(200deg) saturate(0.8)" }}
                                />

                                <audio
                                    ref={audioRefB}
                                    controls
                                    playsInline
                                    preload="auto"
                                    className={`mx-auto w-full rounded-lg ${
                                        activeAudioId === "B" ? "block" : "hidden"
                                    }`}
                                    onEnded={onNext}
                                    style={{ filter: "hue-rotate(200deg) saturate(0.8)" }}
                                />

                                <audio
                                    ref={audioRefC}
                                    controls
                                    playsInline
                                    preload="auto"
                                    className={`mx-auto w-full rounded-lg ${
                                        activeAudioId === "C" ? "block" : "hidden"
                                    }`}
                                    onEnded={onNext}
                                    style={{ filter: "hue-rotate(200deg) saturate(0.8)" }}
                                />

                                <div className="flex items-center justify-evenly text-2xl">
                                    <button
                                        className="cursor-pointer size-10 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
                                        onClick={onLoadIdentifier}
                                    >
                                        <RotateCw />
                                    </button>
                                    <button
                                        className="cursor-pointer size-10 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
                                        onClick={onPrev}
                                    >
                                        <SkipBack />
                                    </button>
                                    <button
                                        className="cursor-pointer size-12 p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 hover:scale-105 shadow-lg"
                                        onClick={onTogglePlay}
                                    >
                                        {isPlay ? <Pause /> : <Play />}
                                    </button>
                                    <button
                                        className="cursor-pointer size-10 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
                                        onClick={onNext}
                                    >
                                        <SkipForward />
                                    </button>
                                    <button
                                        className="cursor-pointer size-10 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
                                        onClick={onShuffle}
                                    >
                                        <Shuffle />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-b border-gray-600/30 pb-2 mb-2">
                                    <p className="text-gray-300 font-medium">Up next</p>
                                    <p className="text-gray-400 text-sm">
                                        {trackCurrentIndex + 1} / {tracks.length} tracks
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 relative bg-gray-800/20 backdrop-blur-sm rounded-2xl mt-4 border border-gray-700/30 overflow-hidden">
                                <ul className="absolute inset-0 overflow-y-auto">
                                    {tracks.map((t, index) => (
                                        <li
                                            id={`track-${index}`}
                                            key={t.id}
                                            onClick={() => onTrack(index)}
                                            className={`truncate py-3 px-4 transition-all duration-200 border-l-4 ${
                                                index === trackCurrentIndex
                                                    ? "font-bold bg-blue-600/20 text-white border-l-blue-500 pointer-events-none"
                                                    : "hover:bg-gray-700/30 cursor-pointer text-gray-300 hover:text-white border-l-transparent hover:border-l-gray-500"
                                            }`}
                                        >
                                            <span className="truncate">{t.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
                                <p className="text-center text-gray-400 text-lg">
                                    {isTracksLoading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </div>
                                    ) : (
                                        "No tracks"
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
