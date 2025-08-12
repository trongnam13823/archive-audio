/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";

const fetchTracks = async (identifier) => {
    const res = await fetch(`https://archive.org/metadata/${identifier}`);
    const data = await res.json();
    const tracks = (data?.files ?? []).filter((f) => ["Opus"].includes(f.format));
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
            const identifier = localStorage.getItem("identifier") ?? "";
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
            navigator.mediaSession.setActionHandler("play", () => onTogglePlay());
            navigator.mediaSession.setActionHandler("pause", () => onTogglePlay());
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
        <main className="p-4 w-svw h-svh">
            <div className="flex flex-col gap-4 h-full">
                <p
                    contentEditable
                    suppressContentEditableWarning={true}
                    spellCheck={false}
                    onBlur={onLoadIdentifier}
                    className="focus:outline-0 text-center"
                >
                    {identifier || "Enter Identifier"}
                </p>

                {tracks.length > 0 && !isTracksLoading ? (
                    <div className="flex flex-col flex-1">
                        <div className="space-y-4">
                            <h1 className="text-xl truncate text-center font-bold">
                                {tracks[trackCurrentIndex]?.title}
                            </h1>

                            <audio
                                ref={audioRefA}
                                controls
                                playsInline
                                preload="auto"
                                className={`mx-auto w-full ${activeAudioId === "A" ? "block" : "hidden"}`}
                                onEnded={onNext}
                            />

                            <audio
                                ref={audioRefB}
                                controls
                                playsInline
                                preload="auto"
                                className={`mx-auto w-full ${activeAudioId === "B" ? "block" : "hidden"}`}
                                onEnded={onNext}
                            />

                            <audio
                                ref={audioRefC}
                                controls
                                playsInline
                                preload="auto"
                                className={`mx-auto w-full ${activeAudioId === "C" ? "block" : "hidden"}`}
                                onEnded={onNext}
                            />

                            <div className="flex items-center justify-evenly text-2xl">
                                <button className="cursor-pointer size-10" onClick={onLoadIdentifier}>
                                    <i className="ri-refresh-line" />
                                </button>
                                <button className="cursor-pointer size-10" onClick={onPrev}>
                                    <i className="ri-skip-left-fill" />
                                </button>
                                <button className="cursor-pointer size-10" onClick={onTogglePlay}>
                                    {isPlay ? <i className="ri-pause-fill" /> : <i className="ri-play-fill" />}
                                </button>
                                <button className="cursor-pointer size-10" onClick={onNext}>
                                    <i className="ri-skip-right-fill" />
                                </button>
                                <button className="cursor-pointer size-10" onClick={onShuffle}>
                                    <i className="ri-shuffle-line" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-b pb-2 mb-2">
                                <p>Up next</p>
                                <p>
                                    {trackCurrentIndex + 1} / {tracks.length} tracks
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 relative">
                            <ul className="absolute inset-0 overflow-y-auto">
                                {tracks.map((t, index) => (
                                    <li
                                        id={`track-${index}`}
                                        key={t.id}
                                        onClick={() => onTrack(index)}
                                        className={`truncate py-2 px-1 ${
                                            index === trackCurrentIndex
                                                ? "font-bold bg-white text-black pointer-events-none"
                                                : "hover:bg-black/10 cursor-pointer"
                                        }`}
                                    >
                                        {t.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <p className="text-center">{isTracksLoading ? "Loading..." : "No tracks"}</p>
                )}
            </div>
        </main>
    );
}

export default App;
