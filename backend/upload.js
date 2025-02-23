require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { ethers } = require("ethers");
const EvidenceStorage = require("../artifacts/contracts/EvStorage.sol/EvidenceStorage.json");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, EvidenceStorage.abi, wallet);

function isValidIPFSHash(hash) {
    // IPFS CIDv0 starts with "Qm" and CIDv1 is base58-encoded
    return typeof hash === "string" && hash.length >= 46 && hash.startsWith("Qm");
}

async function uploadToIPFS(imagePath) {
    console.log("Uploading file:", imagePath);

    if (!fs.existsSync(imagePath)) {
        console.error("❌ File does not exist!");
        return;
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const pinataMetadata = JSON.stringify({ name: "evidence_image" });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append("pinataOptions", pinataOptions);

    try {
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
                    "pinata_api_key": process.env.PINATA_API_KEY,
                    "pinata_secret_api_key": process.env.PINATA_SECRET_API_KEY
                }
            }
        );

        const ipfsHash = response.data.IpfsHash;
        console.log("✅ Uploaded Successfully!");
        console.log("IPFS Hash:", ipfsHash);

        // 🚀 Only store if a valid IPFS hash exists
        if (isValidIPFSHash(ipfsHash)) {
            await storeInBlockchain(ipfsHash);
        } else {
            console.log("⚠️ Invalid IPFS hash, skipping blockchain storage.");
        }

        return ipfsHash;
    } catch (error) {
        console.error("❌ Upload Error:", error.response?.data || error.message);
    }
}

// 🛠 Store ONLY valid IPFS hashes in the blockchain
async function storeInBlockchain(ipfsHash) {
    try {
        if (!process.env.PRIVATE_KEY) {
            console.error("❌ PRIVATE_KEY not found in .env");
            return;
        }

        const tx = await contract.storeEvidence(ipfsHash);
        console.log("⏳ Storing in blockchain...");
        await tx.wait();
        console.log("✅ Evidence stored successfully in smart contract!");
    } catch (error) {
        console.error("❌ Blockchain Storage Error:", error);
    }
}

// Run Upload + Store
uploadToIPFS("./test.mp4").then(ipfsHash => console.log("Stored Hash:", ipfsHash));
