const hre = require("hardhat");

async function main() {
    const EvidenceStorage = await hre.ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = await EvidenceStorage.deploy();
    await evidenceStorage.waitForDeployment();

    const contractAddress = await evidenceStorage.getAddress(); // Get contract address properly
    console.log(`Contract deployed at: ${contractAddress}`);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
