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
    const [isTracksLoading, setIsTracksLoading] = useState(false);
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
        <main className="max-w-4xl mx-auto h-svh w-svw flex flex-col bg-black text-gray-100">
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
                            ref={audioRefA}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "A" ? "block" : "hidden"}`}
                            onEnded={onNext}
                        />

                        <audio
                            ref={audioRefB}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "B" ? "block" : "hidden"}`}
                            onEnded={onNext}
                        />

                        <audio
                            ref={audioRefC}
                            controls
                            playsInline
                            preload="auto"
                            className={`w-full mb-6 ${activeAudioId === "C" ? "block" : "hidden"}`}
                            onEnded={onNext}
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
                                {isPlay ? <Pause size={24} /> : <Play size={24} />}
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
                        <div className="h-full overflow-y-auto">
                            {tracks.map((t, index) => (
                                <div
                                    id={`track-${index}`}
                                    key={t.id}
                                    onClick={() => onTrack(index)}
                                    className={`px-6 py-3 cursor-pointer transition-colors ${
                                        index === trackCurrentIndex
                                            ? "bg-gray-900 text-white"
                                            : "text-gray-300 hover:text-white hover:bg-gray-900/50"
                                    }`}
                                >
                                    <div className="truncate">{t.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        {isTracksLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
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

export default App;
