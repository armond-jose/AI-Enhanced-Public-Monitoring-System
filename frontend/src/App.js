import { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import "./App.css"; // Import a CSS file for styling

function App() {
    const [evidences, setEvidences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchHash, setSearchHash] = useState(""); // State to hold the search input value
    const [isHashValid, setIsHashValid] = useState(true); // State to track if the hash is valid

    // Function to parse the file name and extract event details
    const parseFileName = (fileName) => {
        const parts = fileName.split("_");
        if (parts.length === 5) {
            const [eventName, latitude, longitude, date, timeWithExtension] = parts;
            const time = timeWithExtension.split(".")[0]; // Remove file extension
            return {
                eventName,
                location: `${latitude}, ${longitude}`,
                date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`, // Format as YYYY-MM-DD
                time: `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`, // Format as HH:MM:SS
            };
        }
        return null;
    };

    const fetchAllEvidence = async () => {
        setLoading(true);
        setError(null);
    
        try {
            const response = await fetch("http://localhost:5000/evidences"); // Fetch from backend
            if (!response.ok) throw new Error("Failed to fetch evidence.");
    
            const fetchedEvidences = await response.json();
    
            // Map fetched evidences to include parsed event details
            const evidencesWithDetails = fetchedEvidences.map((evidence) => {
                const eventDetails = parseFileName(evidence.fileName); // Parse file name
                return {
                    id: evidence.ipfsHash, // Use IPFS hash as unique identifier
                    videoUrl: `https://bronze-tropical-lark-419.mypinata.cloud/ipfs/${evidence.ipfsHash}?pinataGatewayToken=rp3Mf9ZGsbNu9N9D2pEhZOnVnsHP3ZM2L7nFJTPJ-km3wibO95GrgKW3OtxqZCQF`,
                    ipfsHash: evidence.ipfsHash,
                    fileName: evidence.fileName,
                    ...eventDetails, // Add parsed event details
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
        fetchAllEvidence(); // Fetch once on mount

        const interval = setInterval(() => {
            fetchAllEvidence();
        }, 900000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    // Scroll and highlight evidence tile if URL contains #ipfsHash
    useEffect(() => {
        const hash = window.location.hash.substring(1); // Remove '#'
        if (hash) {
            const targetElement = document.getElementById(hash);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                targetElement.classList.add("highlight"); // Add highlight class
                setTimeout(() => targetElement.classList.remove("highlight"), 2000); // Remove highlight after 2s
                setIsHashValid(true); // Hash is valid
            } else {
                setIsHashValid(false); // Hash is invalid
            }
        }
    }, [evidences]); // Run this after evidences are loaded

    // Function to handle search
    const handleSearch = () => {
        if (searchHash) {
            const targetElement = document.getElementById(searchHash);
            if (targetElement) {
                window.location.hash = `#${searchHash}`;
                targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                targetElement.classList.add("highlight"); // Add highlight class
                setTimeout(() => targetElement.classList.remove("highlight"), 2000); // Remove highlight after 2s
                setIsHashValid(true); // Hash is valid
            } else {
                setIsHashValid(false); // Hash is invalid
            }
        }
    };

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
                <a
                    // onClick={fetchAllEvidence}
                    // disabled={loading}
                    className="refresh-button"
                    href="/"
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </a>
            </header>

            {loading ? (
                <div className="loading">Loading evidence...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : evidences.length > 0 ? (
                <div className="evidence-grid">
                    {evidences.map((evidence) => (
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
                                <ReactPlayer url={evidence.videoUrl} width="100%" height="200px" controls />
                                <p className="ipfs-hash">
                                    <strong>IPFS Hash:</strong> {evidence.ipfsHash}
                                </p>
                                {/* <a href={`#${evidence.ipfsHash}`}>View Details</a> */}
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