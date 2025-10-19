// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KYCRegistry_Muneeb {
    
    address public admin;
    
    struct KYCRequest {
        string name;
        string cnic;
        bool isVerified;
        bool exists;
        bool isRejected;
    }
    
    mapping(address => KYCRequest) public kycRequests;
    address[] public pendingRequests;
    
    event KYCSubmitted(address indexed user, string name, string cnic);
    event KYCApproved(address indexed user, string name);
    event KYCRejected(address indexed user, string name);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier notVerified() {
        require(!kycRequests[msg.sender].isVerified, "Already verified");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function submitKYC(string memory _name, string memory _cnic) public notVerified {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_cnic).length > 0, "CNIC cannot be empty");
        require(!kycRequests[msg.sender].exists, "KYC request already submitted");
        
        kycRequests[msg.sender] = KYCRequest({
            name: _name,
            cnic: _cnic,
            isVerified: false,
            exists: true,
            isRejected: false
        });
        
        pendingRequests.push(msg.sender);
        
        emit KYCSubmitted(msg.sender, _name, _cnic);
    }
    
    function approveKYC(address _user) public onlyAdmin {
        require(kycRequests[_user].exists, "KYC request does not exist");
        require(!kycRequests[_user].isVerified, "Already verified");
        
        kycRequests[_user].isVerified = true;
        kycRequests[_user].isRejected = false;
        
        removePendingRequest(_user);
        
        emit KYCApproved(_user, kycRequests[_user].name);
    }
    
    function rejectKYC(address _user) public onlyAdmin {
        require(kycRequests[_user].exists, "KYC request does not exist");
        require(!kycRequests[_user].isVerified, "Already verified");
        
        kycRequests[_user].isRejected = true;
        
        removePendingRequest(_user);
        
        emit KYCRejected(_user, kycRequests[_user].name);
    }
    
    function isVerified(address _user) public view returns (bool) {
        return kycRequests[_user].isVerified;
    }
    
    function getPendingRequests() public view returns (address[] memory) {
        return pendingRequests;
    }
    
    function getKYCDetails(address _user) public view returns (
        string memory name,
        string memory cnic,
        bool verified,
        bool exists,
        bool rejected
    ) {
        KYCRequest memory request = kycRequests[_user];
        return (
            request.name,
            request.cnic,
            request.isVerified,
            request.exists,
            request.isRejected
        );
    }
    
    function removePendingRequest(address _user) private {
        for (uint i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == _user) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
    }
}