require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

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

        console.log("✅ Uploaded Successfully!");
        console.log("IPFS Hash:", response.data.IpfsHash);
        return response.data.IpfsHash;
    } catch (error) {
        console.error("❌ Upload Error:", error.response?.data || error.message);
    }
}

// Run Upload
uploadToIPFS("./pic.png").then(ipfsHash => console.log("Stored Hash:", ipfsHash));
