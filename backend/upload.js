require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path"); // Add this line to use the path module
const FormData = require("form-data");
const { ethers } = require("ethers");
const EvidenceStorage = require("../artifacts/contracts/EvStorage.sol/EvidenceStorage.json");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, EvidenceStorage.abi, wallet);

function isValidIPFSHash(hash) {    
    return hash.length >= 5;
}

async function uploadToIPFS(videoPath) {
    console.log("Uploading file:", videoPath);

    if (!fs.existsSync(videoPath)) {
        console.error("❌ File does not exist!");
        return;
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(videoPath));

    // Extract the file name from the videoPath
    const fileName = path.basename(videoPath);

    // Use the original file name in the pinataMetadata
    const pinataMetadata = JSON.stringify({ name: fileName });
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
            await storeInBlockchain(ipfsHash, fileName); // Pass both IPFS hash and file name
        } else {
            console.log("⚠️ Invalid IPFS hash, skipping blockchain storage.");
        }

        return ipfsHash;
    } catch (error) {
        console.error("❌ Upload Error:", error.response?.data || error.message);
    }
}

// 🛠 Store both IPFS hash and file name in the blockchain
async function storeInBlockchain(ipfsHash, fileName) {
    try {
        if (!process.env.PRIVATE_KEY) {
            console.error("❌ PRIVATE_KEY not found in .env");
            return;
        }

        const tx = await contract.storeEvidence(ipfsHash, fileName);
        console.log("⏳ Storing in blockchain...");

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("✅ Transaction mined. Block number:", receipt.blockNumber);

        console.log("✅ Evidence stored successfully in smart contract!");
    } catch (error) {
        console.error("❌ Blockchain Storage Error:", error);
    }
}

// Run Upload + Store
uploadToIPFS("./ACCIDENT_11.920361_75.378466_20250313_040653.mp4").then(ipfsHash => console.log("Stored Hash:", ipfsHash));