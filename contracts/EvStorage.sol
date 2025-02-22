// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EvidenceStorage {
    struct Evidence {
        uint256 id;
        string imageHash; // IPFS hash of the image
        string description;
        uint256 timestamp;
        address uploader;
    }

    mapping(uint256 => Evidence) public evidences;
    uint256 public evidenceCount;
    Evidence[] public allEvidences; // New array to store all evidence

    event EvidenceStored(uint256 id, string imageHash, string description, uint256 timestamp, address uploader);

    function storeEvidence(string memory _imageHash, string memory _description) public {
        evidenceCount++;
        Evidence memory newEvidence = Evidence(evidenceCount, _imageHash, _description, block.timestamp, msg.sender);
        evidences[evidenceCount] = newEvidence;
        allEvidences.push(newEvidence); // Store in array for retrieval

        emit EvidenceStored(evidenceCount, _imageHash, _description, block.timestamp, msg.sender);
    }

    function getAllEvidences() public view returns (Evidence[] memory) {
        return allEvidences;
    }
}
