require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());
app.use(cors());

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Ensure ABI path is correct
const contractABI = require("../artifacts/contracts/EvStorage.sol/EvidenceStorage.json");
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

// Utility function to handle BigInt serialization
function toSerializable(obj) {
    return JSON.parse(
        JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value))
    );
}

// Store evidence
app.post("/store", async (req, res) => {
    try {
        const {  description } = req.body;
        if ( !description) {
            return res.status(400).json({ error: "Missing ipfs hash description" });
        }
        const tx = await contract.storeEvidence( description);
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Error storing evidence:", error);
        res.status(500).json({ error: error.reason || error.message });
    }
});

// Get a single piece of evidence by ID
app.get("/evidence/:id", async (req, res) => {
    try {
        const evidenceId = parseInt(req.params.id);
        const evidenceCount = await contract.evidenceCount();

        if (evidenceId < 0 || evidenceId >= evidenceCount) {
            return res.status(404).json({ error: "Evidence not found" });
        }

        const evidence = await contract.evidences(evidenceId);
        res.json(
            toSerializable({
                id: evidenceId,
                description: evidence[1],
            })
        );
    } catch (error) {
        console.error("Error fetching evidence:", error);
        res.status(500).json({ error: error.reason || error.message });
    }
});

// Get all stored evidence
app.get("/evidences", async (req, res) => {
    try {
        const evidenceCount = await contract.evidenceCount();

        if (evidenceCount.toString() === "0") {
            return res.json([]);
        }

        const evidencePromises = [];
        for (let i = 0; i < evidenceCount; i++) {
            evidencePromises.push(contract.evidences(i));
        }

        const evidences = await Promise.all(evidencePromises);
        const formattedEvidences = evidences.map((evidence, index) => ({
            id: index,
            description: evidence[1],
        }));

        res.json(toSerializable(formattedEvidences));
    } catch (error) {
        console.error("Backend Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch evidences" });
    }
});

app.listen(5000, () => console.log("✅ Backend running on http://localhost:5000"));
