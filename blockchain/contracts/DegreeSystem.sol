// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DegreeSystem {
    address public admin; // Main controller of the system

    // Structure defining what a digital degree looks like
    struct Degree {
        string studentName;
        string programName;
        string studentID;
        string issueDate;
        bool exists;
        bool isRevoked;
    }

    // Role mappings 
    mapping(address => bool) public isUniversity;
    mapping(string => Degree) public ledger; // Maps RollNumber/Hash to Degree data

    // Live Metrics for Reporting & Dashboard
    uint256 public totalIssued = 0;
    uint256 public totalVerified = 0;
    uint256 public fraudAttempts = 0;

    // Events to maintain immutable transaction logs
    event DegreeIssued(string rollNumber, string name, address indexed university);
    event DegreeVerified(string rollNumber, bool isValid, address indexed verifier);
    event UnauthorizedAccess(address indexed offender, string action);

    constructor() {
        admin = msg.sender; // The creator becomes the main Admin
        isUniversity[msg.sender] = true; // Auto-authorize the admin as a university for testing 
    }

    // 1. Role Control Module
    function authorizeUniversity(address _uni) public {
        require(msg.sender == admin, "Only Admin can authorize universities!");
        isUniversity[_uni] = true;
    }

    // 2. Degree Issuance Module
    function issueDegree(string memory _rollNumber, string memory _name, string memory _program, string memory _date) public {
        // RBAC Check 
        if (!isUniversity[msg.sender]) {
            fraudAttempts++;
            emit UnauthorizedAccess(msg.sender, "ISSUANCE_ATTEMPT");
            revert("Unauthorized: Only registered Universities can issue degrees!");
        }
        
        // Edge Case: Prevent Duplicate Issuance Attack
        if (ledger[_rollNumber].exists) {
            fraudAttempts++;
            revert("Security Block: This Degree ID/Hash already exists on the blockchain!");
        }

        ledger[_rollNumber] = Degree(_name, _program, _rollNumber, _date, true, false);
        totalIssued++;
        emit DegreeIssued(_rollNumber, _name, msg.sender); // Log transaction
    }

    // 3. Degree Verification Module
    function verifyDegree(string memory _rollNumber) public returns (string memory) {
        totalVerified++; // Update audit requests counter 
        
        // Edge Case: Check if degree exists and is not revoked
        if (ledger[_rollNumber].exists && !ledger[_rollNumber].isRevoked) {
            emit DegreeVerified(_rollNumber, true, msg.sender);
            return "SUCCESS: This Degree is Authentic & Tamper-Proof on Private Blockchain.";
        } else {
            fraudAttempts++; // Log anomaly detection 
            emit DegreeVerified(_rollNumber, false, msg.sender);
            return "CRITICAL WARNING: Fraud Detected! Degree data does not match ledger records.";
        }
    }

    // Optional: Administrative Revocation logic
    function revokeDegree(string memory _rollNumber) public {
        require(msg.sender == admin, "Only admin can revoke");
        if (ledger[_rollNumber].exists) {
            ledger[_rollNumber].isRevoked = true;
        }
    }
}
