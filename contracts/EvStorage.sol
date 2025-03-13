// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EvidenceStorage {
    struct Evidence {
        uint256 id;
        string ipfsHash; // Store IPFS hash
        string fileName; // Store file name
    }

    mapping(uint256 => Evidence) public evidences;
    uint256 public evidenceCount;
    Evidence[] public allEvidences; // New array to store all evidence

    event EvidenceStored(uint256 id, string ipfsHash, string fileName);

    // Store both IPFS hash and file name
   function storeEvidence(string memory _ipfsHash, string memory _fileName) public {
    Evidence memory newEvidence = Evidence(evidenceCount, _ipfsHash, _fileName);
    evidences[evidenceCount] = newEvidence;
    allEvidences.push(newEvidence);

    emit EvidenceStored(evidenceCount, _ipfsHash, _fileName);
    evidenceCount++; // Increment after storing
}

    // Retrieve all evidences
    function getAllEvidences() public view returns (Evidence[] memory) {
        return allEvidences;
    }
}