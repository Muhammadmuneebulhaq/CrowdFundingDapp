// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IKYCRegistry {
    function isVerified(address _user) external view returns (bool);
    function admin() external view returns (address);
}

contract Crowdfunding_Muneeb {
    
    IKYCRegistry public kycRegistry;
    
    enum CampaignStatus { Active, Completed, Withdrawn }
    
    struct Campaign {
        uint256 id;
        string title;
        string description;
        uint256 goal;
        uint256 fundsRaised;
        address payable creator;
        CampaignStatus status;
        bool exists;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    uint256 public campaignCount;
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        string description,
        uint256 goal,
        address indexed creator
    );
    
    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    
    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );
    
    event CampaignCompleted(uint256 indexed campaignId);
    
    modifier onlyVerifiedOrAdmin() {
        require(
            kycRegistry.isVerified(msg.sender) || msg.sender == kycRegistry.admin(),
            "Only verified users or admin can create campaigns"
        );
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        _;
    }
    
    modifier onlyCreator(uint256 _campaignId) {
        require(
            campaigns[_campaignId].creator == msg.sender,
            "Only campaign creator can perform this action"
        );
        _;
    }
    
    constructor(address _kycRegistryAddress) {
        kycRegistry = IKYCRegistry(_kycRegistryAddress);
        campaignCount = 0;
    }
    
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal
    ) public onlyVerifiedOrAdmin {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_goal > 0, "Goal must be greater than 0");
        
        campaignCount++;
        
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            title: _title,
            description: _description,
            goal: _goal,
            fundsRaised: 0,
            creator: payable(msg.sender),
            status: CampaignStatus.Active,
            exists: true
        });
        
        emit CampaignCreated(campaignCount, _title, _description, _goal, msg.sender);
    }
    
    function contribute(uint256 _campaignId) 
        public 
        payable 
        campaignExists(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.status == CampaignStatus.Active, "Campaign is not active");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        campaign.fundsRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;
        
        emit ContributionMade(_campaignId, msg.sender, msg.value);
        
        // Check if goal is reached
        if (campaign.fundsRaised >= campaign.goal) {
            campaign.status = CampaignStatus.Completed;
            emit CampaignCompleted(_campaignId);
        }
    }
    
    function withdrawFunds(uint256 _campaignId) 
        public 
        campaignExists(_campaignId)
        onlyCreator(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(
            campaign.status == CampaignStatus.Completed,
            "Campaign must be completed before withdrawal"
        );
        
        uint256 amount = campaign.fundsRaised;
        require(amount > 0, "No funds to withdraw");
        
        campaign.status = CampaignStatus.Withdrawn;
        
        (bool success, ) = campaign.creator.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(_campaignId, campaign.creator, amount);
    }
    
    function getCampaign(uint256 _campaignId) 
        public 
        view 
        campaignExists(_campaignId)
        returns (
            uint256 id,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 fundsRaised,
            address creator,
            CampaignStatus status
        )
    {
        Campaign memory campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.title,
            campaign.description,
            campaign.goal,
            campaign.fundsRaised,
            campaign.creator,
            campaign.status
        );
    }
    
    function getAllCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        
        for (uint256 i = 1; i <= campaignCount; i++) {
            allCampaigns[i - 1] = campaigns[i];
        }
        
        return allCampaigns;
    }
    
    function getContribution(uint256 _campaignId, address _contributor) 
        public 
        view 
        returns (uint256) 
    {
        return contributions[_campaignId][_contributor];
    }
    
    function getCampaignStatus(uint256 _campaignId) 
        public 
        view 
        campaignExists(_campaignId)
        returns (CampaignStatus) 
    {
        return campaigns[_campaignId].status;
    }
}