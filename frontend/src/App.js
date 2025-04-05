import { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import "./App.css";

function App() {
    const [evidences, setEvidences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchHash, setSearchHash] = useState("");
    const [isHashValid, setIsHashValid] = useState(true);
    const [videoCache, setVideoCache] = useState(new Map()); // Cache for videos

    // Function to cache a video
    const cacheVideo = async (url) => {
        // Check if video is already cached
        if (videoCache.has(url)) return;

        try {
            // Fetch the video
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch video');
            
            // Create a blob URL for the video
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Update the cache
            setVideoCache(prevCache => {
                const newCache = new Map(prevCache);
                newCache.set(url, blobUrl);
                return newCache;
            });
        } catch (error) {
            console.error('Error caching video:', error);
        }
    };

    const parseFileName = (fileName) => {
        const parts = fileName.split("_");
        if (parts.length === 5) {
            const [eventName, latitude, longitude, date, timeWithExtension] = parts;
            const time = timeWithExtension.split(".")[0];
            return {
                eventName,
                location: `${latitude}, ${longitude}`,
                date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
                time: `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`,
            };
        }
        return null;
    };

    const fetchAllEvidence = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("http://localhost:5000/evidences");
            if (!response.ok) throw new Error("Failed to fetch evidence.");

            const fetchedEvidences = await response.json();

            const evidencesWithDetails = fetchedEvidences.map((evidence) => {
                const eventDetails = parseFileName(evidence.fileName);
                const videoUrl = `https://azure-giant-ostrich-778.mypinata.cloud/ipfs/${evidence.ipfsHash}?pinataGatewayToken=XxmxSqhtlOOYs6OVWJ-9prF8lTs8eUgddvm5tA-dZhqjmy3xHrtyRl04eGuvlTn1`;
                
                // Cache the video in the background
                cacheVideo(videoUrl);

                return {
                    id: evidence.ipfsHash,
                    videoUrl,
                    ipfsHash: evidence.ipfsHash,
                    fileName: evidence.fileName,
                    ...eventDetails,
                };
            });

            setEvidences(evidencesWithDetails);
        } catch (error) {
            console.error("Error fetching evidence:", error);
            setError("Failed to fetch evidence.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllEvidence();
        
        // Clean up blob URLs when component unmounts
        return () => {
            videoCache.forEach(blobUrl => {
                URL.revokeObjectURL(blobUrl);
            });
        };
    }, []);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetElement = document.getElementById(hash);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                targetElement.classList.add("highlight");
                setTimeout(() => targetElement.classList.remove("highlight"), 2000);
                setIsHashValid(true);
            } else {
                setIsHashValid(false);
            }
        }
    }, [evidences]);

    const handleSearch = () => {
        if (searchHash) {
            const targetElement = document.getElementById(searchHash);
            if (targetElement) {
                window.location.hash = `#${searchHash}`;
                targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                targetElement.classList.add("highlight");
                setTimeout(() => targetElement.classList.remove("highlight"), 2000);
                setIsHashValid(true);
            } else {
                setIsHashValid(false);
            }
        }
    };

    const reversedEvidences = [...evidences].reverse();

    return (
        <div className="app-container">
            <header className="header">
                <h1>Verbose Eureka</h1>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Enter IPFS Hash"
                        value={searchHash}
                        onChange={(e) => setSearchHash(e.target.value)}
                        className="search-input"
                    />
                    <button onClick={handleSearch} className="search-button">
                        Search
                    </button>
                </div>
                {!isHashValid && (
                    <div className="warning-message">
                        Warning: The entered IPFS hash is not valid.
                    </div>
                )}
                <button
                    onClick={fetchAllEvidence}
                    disabled={loading}
                    className="refresh-button"
                >
                    {loading ? "Refreshing..." : "Refresh Manually"}
                </button>
            </header>

            {loading ? (
                <div className="loading">Loading evidence...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : evidences.length > 0 ? (
                <div className="evidence-grid">
                    {reversedEvidences.map((evidence) => (
                        <div key={evidence.ipfsHash} id={evidence.ipfsHash} className="evidence-card">
                            <div className="card-header">
                                <h3>{evidence.eventName}</h3>
                                <p className="timestamp">{evidence.date} at {evidence.time}</p>
                            </div>
                            <div className="card-body">
                                <p className="location">
                                    <strong>Location:</strong> {evidence.location}{" "}
                                    <a href={`https://www.google.com/maps?q=${evidence.location}`} target="_blank" rel="noopener noreferrer">
                                        (View on Map)
                                    </a>
                                </p>
                                <ReactPlayer 
                                    url={videoCache.get(evidence.videoUrl) || evidence.videoUrl}
                                    width="100%" 
                                    height="200px" 
                                    controls 
                                    config={{
                                        file: {
                                            attributes: {
                                                controlsList: 'nodownload' // Prevent download option
                                            }
                                        }
                                    }}
                                />
                                <p className="ipfs-hash">
                                    <strong>IPFS Hash:</strong> {evidence.ipfsHash}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-evidence">No valid evidence stored yet.</div>
            )}
        </div>
    );
}

export default App;