import { useState, useEffect } from "react";
import { ethers } from "ethers";
import EvidenceStorage from "./EvidenceStorage.json"; // Ensure ABI is available

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
    const [evidences, setEvidences] = useState([]);

    const fetchAllEvidence = async () => {
        try {
            // Check if Metamask is installed
            if (!window.ethereum) {
                alert("Metamask is not installed! Please install it to use this application.");
                console.error("Metamask is not installed.");
                return;
            }
    
            // Request Metamask connection
            await window.ethereum.request({ method: "eth_requestAccounts" });
    
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, EvidenceStorage.abi, provider);
    
            const evidenceCount = await contract.evidenceCount();
            console.log("Total Evidence Count:", evidenceCount.toString());
    
            if (evidenceCount.toString() === "0") {
                console.warn("No evidence found in the contract.");
                return;
            }
    
            const fetchedEvidences = [];
            for (let i = 1; i <= evidenceCount; i++) {
                const evidence = await contract.getEvidence(i);
                console.log(`Evidence ${i}:`, evidence);
    
                fetchedEvidences.push({
                    id: evidence.id.toString(),
                    imageHash: evidence.imageHash,
                    description: evidence.description,
                    uploader: evidence.uploader,
                });
            }
    
            setEvidences(fetchedEvidences);
        } catch (error) {
            console.error("Error retrieving evidence:", error);
        }
    };
    

    useEffect(() => {
        fetchAllEvidence();
    }, []);

    return (
        <div>
            <h2>Stored Evidence</h2>
            {evidences.length > 0 ? (
                evidences.map((evidence) => (
                    <div key={evidence.id}>
                        <p><strong>IPFS Hash:</strong> {evidence.imageHash}</p>
                        <img src={`https://bronze-tropical-lark-419.mypinata.cloud/ipfs/${evidence.imageHash}?pinataGatewayToken=rp3Mf9ZGsbNu9N9D2pEhZOnVnsHP3ZM2L7nFJTPJ-km3wibO95GrgKW3OtxqZCQF`} alt="Evidence" width="300" />
                    </div>
                ))
            ) : (
                <p>No evidence stored yet.</p>
            )}
        </div>
    );
}

export default App;
