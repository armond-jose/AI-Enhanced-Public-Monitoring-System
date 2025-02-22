import React, { useState, useEffect } from "react";
import axios from "axios";

const EvidenceDisplay = () => {
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    const fetchEvidence = async () => {
      const res = await axios.get("http://localhost:5000/evidence/1");
      setEvidence(res.data);
    };
    fetchEvidence();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Stored Evidence</h1>
      {evidence.imageHash ? (
        <div className="mt-4">
          <img
            src={`https://ipfs.io/ipfs/${evidence.imageHash}`}
            alt="Evidence"
            className="w-64 h-64 object-cover"
          />
          <p>{evidence.description}</p>
          <p>Uploaded by: {evidence.uploader}</p>
        </div>
      ) : (
        <p>No evidence found</p>
      )}
    </div>
  );
};

export default EvidenceDisplay;
