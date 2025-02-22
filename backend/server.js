require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());
app.use(cors());

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PROVIDER = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(PRIVATE_KEY, PROVIDER);
const contractABI = require("../artifacts/contracts/EvStorage.sol/EvidenceStorage.json");

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

app.post("/store", async (req, res) => {
    try {
        const { imageHash, description } = req.body;
        const tx = await contract.storeEvidence(imageHash, description);
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Error storing evidence:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/evidence/:id", async (req, res) => {
    try {
        const evidence = await contract.evidences(req.params.id);
        res.json(evidence);
    } catch (error) {
        console.error("Error fetching evidence:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/evidences", async (req, res) => {
    try {
        const evidenceCount = await contract.evidenceCount();
        let evidences = [];
        for (let i = 1; i <= evidenceCount; i++) {
            const evidence = await contract.evidences(i);
            evidences.push(evidence);
        }
        res.json(evidences);
    } catch (error) {
        console.error("Error fetching all evidences:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log("Backend running on port 5000"));
