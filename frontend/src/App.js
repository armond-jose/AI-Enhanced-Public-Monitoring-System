import { useState, useEffect } from "react";
import ReactPlayer from "react-player";

function App() {
    const [evidences, setEvidences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAllEvidence = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("http://localhost:5000/evidences"); // Fetch from backend
            if (!response.ok) throw new Error("Failed to fetch evidence.");

            const fetchedEvidences = await response.json();

            // Filter only valid IPFS hashes and remove duplicates
            const uniqueEvidences = Array.from(new Map(fetchedEvidences
                .filter(evidence => evidence.description)
                .map(evidence => [evidence.description, {
                    id: evidence.id,
                    videoUrl: `https://bronze-tropical-lark-419.mypinata.cloud/ipfs/${evidence.description}?pinataGatewayToken=rp3Mf9ZGsbNu9N9D2pEhZOnVnsHP3ZM2L7nFJTPJ-km3wibO95GrgKW3OtxqZCQF`,
                    description: evidence.description,
                }])
            ).values());

            // Sort in descending order based on id
            uniqueEvidences.sort((a, b) => b.id - a.id);

            setEvidences(uniqueEvidences);
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
        }, 20000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h2>Stored Evidence</h2>
            <button onClick={fetchAllEvidence} disabled={loading} style={{ marginBottom: "10px" }}>
                {loading ? "Refreshing..." : "Refresh Evidence"}
            </button>

            {loading ? (
                <p>Loading evidence...</p>
            ) : error ? (
                <p style={{ color: "red" }}>{error}</p>
            ) : evidences.length > 0 ? (
                evidences.map((evidence) => (
                    <div key={evidence.id} style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                        <p><strong>Event Name:</strong></p>

                        <ReactPlayer
                            url={evidence.videoUrl}
                            width="300px"
                            height="200px"
                            controls
                            fallback={<p>Video loading...</p>}
                            onError={(e) => {
                                console.warn(`Video not found: ${evidence.videoUrl}`);
                            }}
                        />

                        <p>IPFS Hash: {evidence.description}</p>
                        <p><strong>Timestamp:</strong> Date</p>
                    </div>
                ))
            ) : (
                <p>No valid evidence stored yet.</p>
            )}
        </div>
    );
}

export default App;
