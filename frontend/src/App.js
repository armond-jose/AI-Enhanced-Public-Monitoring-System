import { useState, useEffect } from "react";

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

            // Filter only valid IPFS hashes
            const validEvidences = fetchedEvidences
                .filter(evidence => evidence.description)
                .map(evidence => ({
                    id: evidence.id,
                    imageUrl: `https://gateway.pinata.cloud/ipfs/${evidence.description}`, // Corrected URL
                    description: evidence.description,
                }));

            setEvidences(validEvidences);
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
                        <p><strong>Event Name:</strong> </p>
                        <img
                            src={evidence.imageUrl}
                            alt="Evidence"
                            width="300"
                            onError={(e) => {
                                console.warn(`Image not found: ${evidence.imageUrl}`);
                                e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found";
                            }}
                            style={{ display: "block", marginBottom: "5px" }}
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
