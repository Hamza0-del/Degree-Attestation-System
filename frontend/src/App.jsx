import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ShieldCheck, 
  Award, 
  Search, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  UserCheck,
  Activity,
  History,
  Download,
  Key,
  Wallet
} from 'lucide-react';

// ✅ Auto-updated by deploy.js — manually change karne ki zaroorat nahi
import contractConfig from './contract-config.json';
const CONTRACT_ADDRESS = contractConfig.contractAddress;
const HARDHAT_RPC_URL = "http://127.0.0.1:8545";

// Default Hardhat Accounts for RBAC Simulation
const SIMULATED_ACCOUNTS = [
  {
    name: "System Admin (Account #0)",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    role: "Admin / University"
  },
  {
    name: "University Officer (Account #1)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    role: "Requires Authorization"
  },
  {
    name: "Student / Public (Account #2)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111e5f230219596ac2f2343685d13f06c340572eae7b36a7413d17bd3612",
    role: "Read-Only / Verify"
  }
];

const CONTRACT_ABI = [
  "function admin() public view returns (address)",
  "function isUniversity(address) public view returns (bool)",
  "function totalIssued() public view returns (uint256)",
  "function totalVerified() public view returns (uint256)",
  "function fraudAttempts() public view returns (uint256)",
  "function authorizeUniversity(address _uni) public",
  "function issueDegree(string memory _rollNumber, string memory _name, string memory _program, string memory _date) public",
  "function verifyDegree(string memory _rollNumber) public returns (string memory)",
  "function revokeDegree(string memory _rollNumber) public",
  "function ledger(string memory) public view returns (string studentName, string programName, string studentID, string issueDate, bool exists, bool isRevoked)"
];

function App() {
  const [activeTab, setActiveTab] = useState('verifier'); // verifier, university, admin
  const [blockchainMode, setBlockchainMode] = useState(false);
  const [connecting, setConnecting] = useState(true);
  
  // Wallet / Account Management State
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(0);
  const [customKeyMode, setCustomKeyMode] = useState(false);
  const [customPrivateKey, setCustomPrivateKey] = useState('');
  const [activeAddress, setActiveAddress] = useState('');
  const [ethBalance, setEthBalance] = useState('0.00');

  // Contract Metrics
  const [metrics, setMetrics] = useState({ issued: 0, verified: 0, fraud: 0 });
  const [logs, setLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form Inputs
  const [verifyRoll, setVerifyRoll] = useState('');
  const [issueForm, setIssueForm] = useState({ roll: '', name: '', program: '', date: '' });
  const [authAddress, setAuthAddress] = useState('');
  const [revokeRoll, setRevokeRoll] = useState('');

  // Verified Degree Details
  const [verifiedDegree, setVerifiedDegree] = useState(null);
  const certRef = useRef();

  // Load account address and balance
  useEffect(() => {
    async function loadAccountDetails() {
      if (!blockchainMode) return;
      try {
        const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        let wallet;
        if (customKeyMode) {
          if (customPrivateKey.startsWith('0x') && customPrivateKey.length === 66) {
            wallet = new ethers.Wallet(customPrivateKey, provider);
          } else {
            return; // Wait for valid custom private key
          }
        } else {
          wallet = new ethers.Wallet(SIMULATED_ACCOUNTS[selectedAccountIdx].privateKey, provider);
        }
        
        const addr = await wallet.getAddress();
        setActiveAddress(addr);
        const balWei = await provider.getBalance(addr);
        setEthBalance(parseFloat(ethers.formatEther(balWei)).toFixed(4));
      } catch (err) {
        console.error("Account load error", err);
      }
    }
    loadAccountDetails();
  }, [selectedAccountIdx, customKeyMode, customPrivateKey, blockchainMode]);

  // Initial connection check
  useEffect(() => {
    async function checkNode() {
      setConnecting(true);
      try {
        const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await provider.getNetwork();
        setBlockchainMode(true);
        addLog("Connected to local blockchain node successfully.", "success");
        await fetchBlockchainMetrics(provider);
      } catch (err) {
        setBlockchainMode(false);
        addLog("Error: Local Blockchain Node Offline. Please start your Hardhat Node.", "error");
      } finally {
        setConnecting(false);
      }
    }
    checkNode();
  }, []);

  // Log helper
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ text: `[${timestamp}] ${message}`, type }, ...prev].slice(0, 15));
  };

  // Fetch metrics
  const fetchBlockchainMetrics = async (customProvider = null) => {
    try {
      const provider = customProvider || new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const issued = await contract.totalIssued();
      const verified = await contract.totalVerified();
      const fraud = await contract.fraudAttempts();
      setMetrics({
        issued: Number(issued),
        verified: Number(verified),
        fraud: Number(fraud)
      });
    } catch (err) {
      console.error("Error fetching metrics", err);
    }
  };

  // Trigger metrics update
  const updateMetrics = async () => {
    if (blockchainMode) {
      await fetchBlockchainMetrics();
      // Reload active wallet balance
      const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const balWei = await provider.getBalance(activeAddress);
      setEthBalance(parseFloat(ethers.formatEther(balWei)).toFixed(4));
    }
  };

  // Get active signer wallet instance
  const getSigner = () => {
    const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
    if (customKeyMode) {
      return new ethers.Wallet(customPrivateKey, provider);
    }
    return new ethers.Wallet(SIMULATED_ACCOUNTS[selectedAccountIdx].privateKey, provider);
  };

  // 1. Authorize University
  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!authAddress) return;
    setStatusMessage(null);

    if (!blockchainMode) {
      addLog("Action Blocked: Blockchain node is offline.", "error");
      return;
    }

    try {
      const wallet = getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      
      addLog(`Sending transaction to authorize university: ${authAddress}`, "info");
      const tx = await contract.authorizeUniversity(authAddress);
      await tx.wait();
      
      addLog(`Successfully authorized university: ${authAddress}`, "success");
      setStatusMessage({ text: `University authorized successfully on Blockchain!`, type: 'success' });
      setAuthAddress('');
      await updateMetrics();
    } catch (err) {
      addLog(`Authorization failed: ${err.reason || err.message || err}`, "error");
      setStatusMessage({ text: `Authorization failed! Only Admin can authorize.`, type: 'warning' });
    }
  };

  // 2. Issue Degree
  const handleIssue = async (e) => {
    e.preventDefault();
    const { roll, name, program, date } = issueForm;
    if (!roll || !name || !program || !date) return;
    setStatusMessage(null);

    if (!blockchainMode) {
      addLog("Action Blocked: Blockchain node is offline.", "error");
      return;
    }

    try {
      const wallet = getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      
      addLog(`Submitting Degree to Blockchain: ${roll} for ${name}`, "info");
      const tx = await contract.issueDegree(roll, name, program, date);
      await tx.wait();
      
      addLog(`Degree issued on-chain: ${name} (${roll})`, "success");
      setStatusMessage({ text: `Degree issued on Blockchain successfully!`, type: 'success' });
      setIssueForm({ roll: '', name: '', program: '', date: '' });
      await updateMetrics();
    } catch (err) {
      // Reverts increment fraudAttempts automatically.
      addLog(`Issuance failed: ${err.reason || err.message || err}`, "error");
      setStatusMessage({ text: `Issuance failed! Reverted by Blockchain: ${err.reason || "Unauthorized/Duplicate ID"}`, type: 'warning' });
      await updateMetrics();
    }
  };

  // 3. Verify Degree
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyRoll) return;
    setStatusMessage(null);
    setVerifiedDegree(null);

    if (!blockchainMode) {
      addLog("Action Blocked: Blockchain node is offline.", "error");
      return;
    }

    try {
      const wallet = getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      
      addLog(`Checking ledger details for Roll Number: ${verifyRoll}`, "info");
      
      const degree = await contract.ledger(verifyRoll);
      const exists = degree.exists;
      const isRevoked = degree.isRevoked;

      const resultMsg = await contract.verifyDegree.staticCall(verifyRoll);
      
      // Submit audit request transaction (increments totalVerified/fraudAttempts counters on-chain)
      const tx = await contract.verifyDegree(verifyRoll);
      await tx.wait();
      
      await updateMetrics();

      if (exists && !isRevoked) {
        setVerifiedDegree({
          roll: degree.studentID,
          name: degree.studentName,
          program: degree.programName,
          date: degree.issueDate,
          status: "blockchain"
        });
        addLog(`Verification SUCCESS: Roll Number ${verifyRoll} is valid.`, "success");
        setStatusMessage({ text: resultMsg, type: 'success' });
      } else {
        addLog(`CRITICAL WARNING: Fraud Detected for ${verifyRoll}!`, "error");
        setStatusMessage({ text: resultMsg, type: 'warning' });
      }
    } catch (err) {
      addLog(`Verification transaction failed: ${err.message || err}`, "error");
    }
  };

  // 4. Administrative Revoke
  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeRoll) return;
    setStatusMessage(null);

    if (!blockchainMode) {
      addLog("Action Blocked: Blockchain node is offline.", "error");
      return;
    }

    try {
      const wallet = getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      
      addLog(`Sending revoke transaction for: ${revokeRoll}`, "info");
      const tx = await contract.revokeDegree(revokeRoll);
      await tx.wait();
      
      addLog(`Successfully revoked degree: ${revokeRoll}`, "success");
      setStatusMessage({ text: `Degree revoked on blockchain successfully!`, type: 'success' });
      setRevokeRoll('');
      await updateMetrics();
    } catch (err) {
      addLog(`Revocation failed: ${err.reason || err.message || err}`, "error");
      setStatusMessage({ text: `Revocation failed! Only Admin can revoke.`, type: 'warning' });
    }
  };

  // Download PDF
  const downloadPDF = () => {
    const input = certRef.current;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'px', [800, 560]);
      pdf.addImage(imgData, 'PNG', 0, 0, 800, 560);
      pdf.save(`Degree_Certificate_${verifiedDegree.roll}.pdf`);
      addLog(`Certificate PDF downloaded for ${verifiedDegree.roll}`, "success");
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon-container">
            <ShieldCheck size={28} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h1>EduCert Registry</h1>
            <span className={`badge-blockchain ${blockchainMode ? 'online' : 'offline'}`} style={{
              background: blockchainMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: blockchainMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: blockchainMode ? '#10b981' : '#ef4444'
            }}>
              {connecting ? 'Checking Connection...' : blockchainMode ? 'Blockchain Node Connected' : 'Blockchain Disconnected'}
            </span>
          </div>
        </div>

        {/* Secure Wallet & Role Switcher */}
        <div className="wallet-console-card">
          <div className="wallet-console-row">
            <span className="wallet-label"><Wallet size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Active Signing Keys</span>
            <select 
              className="wallet-select-dropdown"
              value={customKeyMode ? 'custom' : selectedAccountIdx}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setCustomKeyMode(true);
                } else {
                  setCustomKeyMode(false);
                  setSelectedAccountIdx(Number(val));
                }
              }}
              disabled={!blockchainMode}
            >
              {SIMULATED_ACCOUNTS.map((acc, idx) => (
                <option key={idx} value={idx}>{acc.name} ({acc.role})</option>
              ))}
              <option value="custom">✏️ Use Custom Private Key...</option>
            </select>
          </div>

          {customKeyMode && (
            <div className="form-group" style={{ margin: '0' }}>
              <input 
                type="password" 
                placeholder="Paste Ethereum Private Key (0x...)" 
                className="input-field" 
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                value={customPrivateKey}
                onChange={(e) => setCustomPrivateKey(e.target.value)}
              />
            </div>
          )}

          <div className="wallet-meta">
            <span>Address: <code>{activeAddress ? `${activeAddress.substring(0,6)}...${activeAddress.substring(38)}` : '0x00...00'}</code></span>
            <span>Balance: <strong style={{ color: '#fff' }}>{ethBalance} ETH</strong></span>
          </div>
        </div>
      </header>

      {/* Role Navigation Tabs */}
      <div className="role-selector">
        <button 
          className={`role-btn ${activeTab === 'verifier' ? 'active' : ''}`}
          onClick={() => { setActiveTab('verifier'); setStatusMessage(null); }}
          disabled={!blockchainMode}
        >
          <Search size={18} /> Verifier & Student Portal
        </button>
        <button 
          className={`role-btn ${activeTab === 'university' ? 'active' : ''}`}
          onClick={() => { setActiveTab('university'); setStatusMessage(null); }}
          disabled={!blockchainMode}
        >
          <PlusCircle size={18} /> University Panel
        </button>
        <button 
          className={`role-btn ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => { setActiveTab('admin'); setStatusMessage(null); }}
          disabled={!blockchainMode}
        >
          <UserCheck size={18} /> Administrative Console
        </button>
      </div>

      {/* Offline Guard */}
      {!blockchainMode && !connecting && (
        <div className="feedback-alert warning" style={{ marginBottom: '2.5rem', marginTop: '0' }}>
          <AlertTriangle size={24} />
          <div>
            <strong>Blockchain Connection Required</strong>
            <p>The application is running in secure Blockchain Mode. Please start your local Hardhat node (`npx hardhat node`) and deploy the smart contract to continue.</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid" style={{ opacity: blockchainMode ? 1 : 0.4, pointerEvents: blockchainMode ? 'auto' : 'none' }}>
        {/* Left Side Content */}
        <main className="metrics-left">
          
          {/* TAB 1: VERIFIER / STUDENT */}
          {activeTab === 'verifier' && (
            <div className="panel-card">
              <h2><Search size={22} style={{ color: 'var(--accent-blue)' }} /> Cryptographic Degree Verification</h2>
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label htmlFor="verify-roll">Roll Number / Certificate Unique ID</label>
                  <input 
                    id="verify-roll"
                    type="text" 
                    placeholder="e.g. Roll01, Roll02..." 
                    className="input-field"
                    value={verifyRoll}
                    onChange={(e) => setVerifyRoll(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={!blockchainMode}>
                  <CheckCircle size={18} /> Verify Authenticity On-Chain
                </button>
              </form>

              {/* Alerts */}
              {statusMessage && (
                <div className={`feedback-alert ${statusMessage.type === 'success' ? 'success' : 'warning'}`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <strong>{statusMessage.type === 'success' ? 'Attestation Authenticated' : 'Security Anomaly Logged'}</strong>
                    <p>{statusMessage.text}</p>
                  </div>
                </div>
              )}

              {/* Certificate & Download */}
              {verifiedDegree && (
                <div className="certificate-preview-container">
                  <h3 style={{ color: '#fff', marginBottom: '1.25rem', fontSize: '1rem', fontFamily: 'Outfit' }}>
                    <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 
                    Verified Digital Diploma
                  </h3>
                  
                  <div className="certificate-wrapper" ref={certRef}>
                    <div className="cert-header">
                      <h3>Certificate of Graduation</h3>
                    </div>
                    
                    <div className="cert-title">Academic Degree</div>
                    
                    <div className="cert-present">This diploma is proudly presented to</div>
                    
                    <div className="cert-student-name">
                      {verifiedDegree.name}
                    </div>
                    
                    <div className="cert-body">
                      who has satisfactorily completed all requirements of study for the degree of 
                      <br />
                      <span className="cert-program">{verifiedDegree.program}</span>
                      <br />
                      with all honors and rights pertaining thereto.
                    </div>
                    
                    <div className="cert-footer">
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'Playfair Display', fontStyle: 'italic', fontSize: '1.15rem', color: '#1c1917' }}>University Registrar</div>
                        <div className="cert-sig-line"></div>
                        <div className="cert-sig-text">Authorized Signature</div>
                      </div>
                      
                      <div className="cert-seal">
                        Blockchain<br />Verified<br />EduCert
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1c1917', fontFamily: 'Playfair Display' }}>
                          {verifiedDegree.date}
                        </div>
                        <div className="cert-sig-line"></div>
                        <div className="cert-sig-text">Year of Graduation</div>
                      </div>
                    </div>

                    <div className="cert-meta">
                      <span>Roll Number: {verifiedDegree.roll}</span>
                      <span>Contract: {CONTRACT_ADDRESS.substring(0, 16)}...</span>
                      <span>Security: Secure On-Chain Attestation</span>
                    </div>
                  </div>

                  <button className="btn-primary btn-download-pdf" onClick={downloadPDF}>
                    <Download size={18} /> Download Certificate (PDF)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIVERSITY */}
          {activeTab === 'university' && (
            <div className="panel-card">
              <h2><PlusCircle size={22} style={{ color: 'var(--accent-success)' }} /> Register & Issue Student Degree</h2>
              <form onSubmit={handleIssue}>
                <div className="form-group">
                  <label htmlFor="issue-roll">Roll Number (Unique ID)</label>
                  <input 
                    id="issue-roll"
                    type="text" 
                    placeholder="e.g. Roll06" 
                    className="input-field"
                    value={issueForm.roll}
                    onChange={(e) => setIssueForm({...issueForm, roll: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issue-name">Student Full Name</label>
                  <input 
                    id="issue-name"
                    type="text" 
                    placeholder="e.g. Fiona Clark" 
                    className="input-field"
                    value={issueForm.name}
                    onChange={(e) => setIssueForm({...issueForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issue-program">Degree Program Title</label>
                  <input 
                    id="issue-program"
                    type="text" 
                    placeholder="e.g. BS Computer Science" 
                    className="input-field"
                    value={issueForm.program}
                    onChange={(e) => setIssueForm({...issueForm, program: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issue-date">Graduation Year</label>
                  <input 
                    id="issue-date"
                    type="text" 
                    placeholder="e.g. 2026" 
                    className="input-field"
                    value={issueForm.date}
                    onChange={(e) => setIssueForm({...issueForm, date: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={!blockchainMode}>
                  <Award size={18} /> Sign & Publish to Blockchain Ledger
                </button>
              </form>

              {statusMessage && (
                <div className={`feedback-alert ${statusMessage.type === 'success' ? 'success' : 'warning'}`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <strong>{statusMessage.type === 'success' ? 'Attestation Successful' : 'Security Revert'}</strong>
                    <p>{statusMessage.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADMIN CONSOLE */}
          {activeTab === 'admin' && (
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div>
                <h2><UserCheck size={22} style={{ color: 'var(--accent-purple)' }} /> Grant University Authority</h2>
                <form onSubmit={handleAuthorize}>
                  <div className="form-group">
                    <label htmlFor="auth-address">University Wallet Address (0x...)</label>
                    <input 
                      id="auth-address"
                      type="text" 
                      placeholder="e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" 
                      className="input-field"
                      value={authAddress}
                      onChange={(e) => setAuthAddress(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }} disabled={!blockchainMode}>
                    <ShieldCheck size={18} /> Grant University Issuance Permissions
                  </button>
                </form>
              </div>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '2.5rem' }}>
                <h2><AlertTriangle size={22} style={{ color: 'var(--accent-warning)' }} /> Revoke Attested Degree</h2>
                <form onSubmit={handleRevoke}>
                  <div className="form-group">
                    <label htmlFor="revoke-roll">Roll Number / Unique ID to Revoke</label>
                    <input 
                      id="revoke-roll"
                      type="text" 
                      placeholder="e.g. Roll01" 
                      className="input-field"
                      value={revokeRoll}
                      onChange={(e) => setRevokeRoll(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }} disabled={!blockchainMode}>
                    <AlertTriangle size={18} /> Permanent Revocation
                  </button>
                </form>
              </div>

              {statusMessage && (
                <div className={`feedback-alert ${statusMessage.type === 'success' ? 'success' : 'warning'}`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <strong>{statusMessage.type === 'success' ? 'Success' : 'Security Alert'}</strong>
                    <p>{statusMessage.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* Right Side Stats & Audit Log */}
        <aside className="metrics-right">
          
          {/* Live Metrics */}
          <div className="panel-card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}><Activity size={20} style={{ color: 'var(--accent-blue)' }} /> Real-time System Metrics</h2>
            
            <div className="metrics-section">
              <div className="metric-card issued">
                <div className="metric-info">
                  <h3>Degrees Issued</h3>
                  <div className="metric-value">{metrics.issued}</div>
                </div>
                <div className="metric-icon-wrap">
                  <Award size={26} />
                </div>
              </div>

              <div className="metric-card verified">
                <div className="metric-info">
                  <h3>Audit Requests</h3>
                  <div className="metric-value">{metrics.verified}</div>
                </div>
                <div className="metric-icon-wrap">
                  <FileText size={26} />
                </div>
              </div>

              <div className="metric-card fraud">
                <div className="metric-info">
                  <h3>Fraud Attempts</h3>
                  <div className="metric-value">{metrics.fraud}</div>
                </div>
                <div className="metric-icon-wrap">
                  <AlertTriangle size={26} />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="panel-card history-section" style={{ padding: '1.75rem' }}>
            <h3><History size={18} style={{ color: 'var(--accent-purple)' }} /> Blockchain Event Logs</h3>
            <div className="log-container">
              {logs.map((log, idx) => (
                <div key={idx} className={`log-entry ${log.type}`}>
                  <span>{log.text}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  Awaiting blockchain transactions...
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}

export default App;
