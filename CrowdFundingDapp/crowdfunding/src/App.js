import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import contract ABIs and addresses
import KYCRegistryABI from './contracts/KYCRegistry_Muneeb.json';
import CrowdfundingABI from './contracts/Crowdfunding_Muneeb.json';
import { CONTRACT_ADDRESSES } from './contracts/config.js';

function App() {
  // State variables
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [kycContract, setKycContract] = useState(null);
  const [crowdfundingContract, setCrowdfundingContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  // KYC State
  const [kycName, setKycName] = useState('');
  const [kycCnic, setKycCnic] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Campaign State
  const [campaigns, setCampaigns] = useState([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaignFilter, setCampaignFilter] = useState('All');

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setMessage('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      setAccount(address);
      setBalance(ethers.formatEther(balance));
      setProvider(provider);
      setSigner(signer);

      // Initialize contracts using addresses from config
      const kycContract = new ethers.Contract(
        CONTRACT_ADDRESSES.KYCRegistry,
        KYCRegistryABI.abi,
        signer
      );
      const crowdfundingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.Crowdfunding,
        CrowdfundingABI.abi,
        signer
      );

      setKycContract(kycContract);
      setCrowdfundingContract(crowdfundingContract);

      // Check if user is admin
      const adminAddress = await kycContract.admin();
      setIsAdmin(adminAddress.toLowerCase() === address.toLowerCase());

      // Check if user is verified
      const verified = await kycContract.isVerified(address);
      setIsVerified(verified);

      // Get KYC status
      const kycDetails = await kycContract.getKYCDetails(address);
      if (kycDetails[3]) { // exists
        if (kycDetails[2]) { // verified
          setKycStatus('Verified');
        } else if (kycDetails[4]) { // rejected
          setKycStatus('Rejected');
        } else {
          setKycStatus('Pending');
        }
      } else {
        setKycStatus('Not Submitted');
      }

      setMessage('Wallet connected successfully!');
      
      // Load campaigns
      await loadCampaigns(crowdfundingContract);
      
      // Load pending requests if admin
      if (adminAddress.toLowerCase() === address.toLowerCase()) {
        await loadPendingRequests(kycContract);
      }

    } catch (error) {
      console.error('Error connecting wallet:', error);
      setMessage('Error connecting wallet: ' + error.message);
    }
  };

  // Load all campaigns
  const loadCampaigns = async (contract) => {
    try {
      const allCampaigns = await contract.getAllCampaigns();
      const formattedCampaigns = allCampaigns.map((campaign, index) => ({
        id: campaign.id.toString(),
        title: campaign.title,
        description: campaign.description,
        goal: ethers.formatEther(campaign.goal),
        fundsRaised: ethers.formatEther(campaign.fundsRaised),
        creator: campaign.creator,
        status: ['Active', 'Completed', 'Withdrawn'][campaign.status]
      }));
      setCampaigns(formattedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  // Load pending KYC requests
  const loadPendingRequests = async (contract) => {
    try {
      const pending = await contract.getPendingRequests();
      const requestDetails = await Promise.all(
        pending.map(async (address) => {
          const details = await contract.getKYCDetails(address);
          return {
            address,
            name: details[0],
            cnic: details[1]
          };
        })
      );
      setPendingRequests(requestDetails);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  // Submit KYC
  const submitKYC = async () => {
    if (!kycName || !kycCnic) {
      setMessage('Please enter both name and CNIC');
      return;
    }

    try {
      setLoading(true);
      setMessage('Submitting KYC request...');
      
      const tx = await kycContract.submitKYC(kycName, kycCnic);
      await tx.wait();
      
      setMessage('KYC request submitted successfully!');
      setKycStatus('Pending ⏳');
      setKycName('');
      setKycCnic('');
    } catch (error) {
      console.error('Error submitting KYC:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve KYC
  const approveKYC = async (userAddress) => {
    try {
      setLoading(true);
      setMessage('Approving KYC...');
      
      const tx = await kycContract.approveKYC(userAddress);
      await tx.wait();
      
      setMessage('KYC approved successfully!');
      await loadPendingRequests(kycContract);
    } catch (error) {
      console.error('Error approving KYC:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reject KYC
  const rejectKYC = async (userAddress) => {
    try {
      setLoading(true);
      setMessage('Rejecting KYC...');
      
      const tx = await kycContract.rejectKYC(userAddress);
      await tx.wait();
      
      setMessage('KYC rejected!');
      await loadPendingRequests(kycContract);
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Campaign
  const createCampaign = async () => {
    if (!campaignTitle || !campaignDescription || !campaignGoal) {
      setMessage('Please fill all campaign fields');
      return;
    }

    try {
      setLoading(true);
      setMessage('Creating campaign...');
      
      const goalInWei = ethers.parseEther(campaignGoal);
      const tx = await crowdfundingContract.createCampaign(
        campaignTitle,
        campaignDescription,
        goalInWei
      );
      await tx.wait();
      
      setMessage('Campaign created successfully!');
      setCampaignTitle('');
      setCampaignDescription('');
      setCampaignGoal('');
      
      await loadCampaigns(crowdfundingContract);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Contribute to Campaign
  const contribute = async (campaignId, amount) => {
    if (!amount || amount <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setMessage('Processing contribution...');
      
      const amountInWei = ethers.parseEther(amount);
      const tx = await crowdfundingContract.contribute(campaignId, {
        value: amountInWei
      });
      await tx.wait();
      
      setMessage('Contribution successful!');
      await loadCampaigns(crowdfundingContract);
      
      // Update balance
      const newBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(newBalance));
    } catch (error) {
      console.error('Error contributing:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw Funds
  const withdrawFunds = async (campaignId) => {
    try {
      setLoading(true);
      setMessage('Withdrawing funds...');
      
      const tx = await crowdfundingContract.withdrawFunds(campaignId);
      await tx.wait();
      
      setMessage('Funds withdrawn successfully!');
      await loadCampaigns(crowdfundingContract);
      
      // Update balance
      const newBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(newBalance));
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter campaigns based on selected filter
  const getFilteredCampaigns = () => {
    if (campaignFilter === 'All') {
      return campaigns;
    }
    return campaigns.filter(campaign => campaign.status === campaignFilter);
  };

  // Account change handler
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          setAccount('');
          setBalance('');
        }
      });
    }
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>🌟 Decentralized Crowdfunding Platform</h1>
        <p className="developer-info">Developed by Muhammad Muneeb Ul Haq, Roll_No: 22i-1321</p>
        
        {!account ? (
          <button className="connect-btn" onClick={connectWallet}>
            Connect MetaMask
          </button>
        ) : (
          <div className="wallet-info">
            <p><strong>Account:</strong> {account.substring(0, 6)}...{account.substring(38)}</p>
            <p><strong>Balance:</strong> {parseFloat(balance).toFixed(4)} ETH</p>
            <p><strong>KYC Status:</strong> {kycStatus}</p>
            {isAdmin && <span className="admin-badge">Admin</span>}
          </div>
        )}
      </header>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {account && (
        <>
          <nav className="tabs">
            <button 
              className={activeTab === 'campaigns' ? 'active' : ''} 
              onClick={() => setActiveTab('campaigns')}
            >
              Campaigns
            </button>
            <button 
              className={activeTab === 'create' ? 'active' : ''} 
              onClick={() => setActiveTab('create')}
            >
              Create Campaign
            </button>
            <button 
              className={activeTab === 'kyc' ? 'active' : ''} 
              onClick={() => setActiveTab('kyc')}
            >
              KYC
            </button>
            {isAdmin && (
              <button 
                className={activeTab === 'admin' ? 'active' : ''} 
                onClick={() => setActiveTab('admin')}
              >
                Admin Panel
              </button>
            )}
          </nav>

          <main className="main-content">
            {activeTab === 'campaigns' && (
              <section className="campaigns-section">
                <div className="campaigns-header">
                  <h2>All Campaigns</h2>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${campaignFilter === 'All' ? 'active' : ''}`}
                      onClick={() => setCampaignFilter('All')}
                    >
                      All
                    </button>
                    <button 
                      className={`filter-btn ${campaignFilter === 'Active' ? 'active' : ''}`}
                      onClick={() => setCampaignFilter('Active')}
                    >
                      Active
                    </button>
                    <button 
                      className={`filter-btn ${campaignFilter === 'Completed' ? 'active' : ''}`}
                      onClick={() => setCampaignFilter('Completed')}
                    >
                      Completed
                    </button>
                    <button 
                      className={`filter-btn ${campaignFilter === 'Withdrawn' ? 'active' : ''}`}
                      onClick={() => setCampaignFilter('Withdrawn')}
                    >
                      Withdrawn
                    </button>
                  </div>
                </div>
                {getFilteredCampaigns().length === 0 ? (
                  <p className="no-data">No {campaignFilter.toLowerCase()} campaigns found.</p>
                ) : (
                  <div className="campaigns-grid">
                    {getFilteredCampaigns().map((campaign) => (
                      <div key={campaign.id} className="campaign-card">
                        <h3>{campaign.title}</h3>
                        <p className="description">{campaign.description}</p>
                        <div className="campaign-details">
                          <p><strong>Goal:</strong> {campaign.goal} ETH</p>
                          <p><strong>Raised:</strong> {campaign.fundsRaised} ETH</p>
                          <p><strong>Status:</strong> <span className={`status ${campaign.status.toLowerCase()}`}>{campaign.status}</span></p>
                          <p className="creator"><strong>Creator:</strong> {campaign.creator.substring(0, 6)}...{campaign.creator.substring(38)}</p>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress" 
                            style={{width: `${Math.min((campaign.fundsRaised / campaign.goal) * 100, 100)}%`}}
                          ></div>
                        </div>
                        <p className="progress-text">
                          {((campaign.fundsRaised / campaign.goal) * 100).toFixed(2)}% funded
                        </p>
                        
                        {campaign.status === 'Active' && (
                          <div className="contribute-section">
                            <input 
                              type="number" 
                              placeholder="Amount in ETH" 
                              step="0.01"
                              id={`amount-${campaign.id}`}
                            />
                            <button 
                              onClick={() => {
                                const amount = document.getElementById(`amount-${campaign.id}`).value;
                                contribute(campaign.id, amount);
                              }}
                              disabled={loading}
                            >
                              Contribute
                            </button>
                          </div>
                        )}
                        
                        {campaign.status === 'Completed' && 
                         campaign.creator.toLowerCase() === account.toLowerCase() && (
                          <button 
                            className="withdraw-btn" 
                            onClick={() => withdrawFunds(campaign.id)}
                            disabled={loading}
                          >
                            Withdraw Funds
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'create' && (
              <section className="create-section">
                <h2>Create New Campaign</h2>
                {!isVerified && !isAdmin ? (
                  <div className="warning">
                    ⚠️ You need to be KYC verified to create campaigns. Please submit your KYC request in the KYC tab.
                  </div>
                ) : (
                  <div className="form">
                    <input
                      type="text"
                      placeholder="Campaign Title"
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                    />
                    <textarea
                      placeholder="Campaign Description"
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                      rows="4"
                    />
                    <input
                      type="number"
                      placeholder="Funding Goal (in ETH)"
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                      step="0.01"
                    />
                    <button 
                      className="submit-btn" 
                      onClick={createCampaign}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Campaign'}
                    </button>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'kyc' && (
              <section className="kyc-section">
                <h2>KYC Verification</h2>
                <div className="kyc-status-card">
                  <h3>Your KYC Status: {kycStatus}</h3>
                </div>
                
                {kycStatus === 'Not Submitted' && (
                  <div className="form">
                    <h3>Submit KYC Request</h3>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={kycName}
                      onChange={(e) => setKycName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="CNIC Number"
                      value={kycCnic}
                      onChange={(e) => setKycCnic(e.target.value)}
                    />
                    <button 
                      className="submit-btn" 
                      onClick={submitKYC}
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : 'Submit KYC'}
                    </button>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'admin' && isAdmin && (
              <section className="admin-section">
                <h2>Admin Panel - KYC Requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="no-data">No pending KYC requests</p>
                ) : (
                  <div className="requests-list">
                    {pendingRequests.map((request, index) => (
                      <div key={index} className="request-card">
                        <p><strong>Name:</strong> {request.name}</p>
                        <p><strong>CNIC:</strong> {request.cnic}</p>
                        <p><strong>Address:</strong> {request.address}</p>
                        <div className="action-buttons">
                          <button 
                            className="approve-btn" 
                            onClick={() => approveKYC(request.address)}
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button 
                            className="reject-btn" 
                            onClick={() => rejectKYC(request.address)}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing transaction...</p>
        </div>
      )}
    </div>
  );
}

export default App;