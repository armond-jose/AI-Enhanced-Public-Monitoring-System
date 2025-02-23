// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EvidenceStorage {
    struct Evidence {
        uint256 id;
        string description;
    }

    mapping(uint256 => Evidence) public evidences;
    uint256 public evidenceCount;
    Evidence[] public allEvidences; // New array to store all evidence

    event EvidenceStored(uint256 id, string description);

    function storeEvidence( string memory _description) public {
        evidenceCount++;
        Evidence memory newEvidence = Evidence(evidenceCount, _description);
        evidences[evidenceCount] = newEvidence;
        allEvidences.push(newEvidence); // Store in array for retrieval

        emit EvidenceStored(evidenceCount, _description);
    }

    function getAllEvidences() public view returns (Evidence[] memory) {
        return allEvidences;
    }
}
