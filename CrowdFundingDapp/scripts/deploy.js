const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy KYCRegistry contract
  console.log("Deploying KYCRegistry_Muneeb...");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry_Muneeb");
  const kycRegistry = await KYCRegistry.deploy();
  await kycRegistry.waitForDeployment();
  const kycAddress = await kycRegistry.getAddress();
  
  console.log("✅ KYCRegistry_Muneeb deployed to:", kycAddress);
  console.log("Admin address:", deployer.address, "\n");

  // Deploy Crowdfunding contract
  console.log("Deploying Crowdfunding_Muneeb...");
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding_Muneeb");
  const crowdfunding = await Crowdfunding.deploy(kycAddress);
  await crowdfunding.waitForDeployment();
  const crowdfundingAddress = await crowdfunding.getAddress();
  
  console.log("✅ Crowdfunding_Muneeb deployed to:", crowdfundingAddress);
  console.log("Linked to KYCRegistry at:", kycAddress, "\n");

  // Save deployment addresses to a file
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      KYCRegistry: kycAddress,
      Crowdfunding: crowdfundingAddress
    },
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    `${deploymentsDir}/deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📝 Deployment info saved to deployments/deployment-" + hre.network.name + ".json\n");

  // Copy ABI files to React frontend
  console.log("📋 Copying ABI files to React frontend...\n");
  
  const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts");
  const frontendPath = path.join(__dirname, "..", "crowdfunding", "src", "contracts");

  // Create contracts directory in frontend if it doesn't exist
  if (!fs.existsSync(frontendPath)) {
    fs.mkdirSync(frontendPath, { recursive: true });
  }

  // Copy KYCRegistry ABI
  const kycArtifactPath = path.join(artifactsPath, "KYCRegistry_Muneeb.sol", "KYCRegistry_Muneeb.json");
  const kycDestPath = path.join(frontendPath, "KYCRegistry_Muneeb.json");
  
  if (fs.existsSync(kycArtifactPath)) {
    fs.copyFileSync(kycArtifactPath, kycDestPath);
    console.log("✅ Copied KYCRegistry_Muneeb.json to frontend");
  } else {
    console.log("❌ KYCRegistry artifact not found at:", kycArtifactPath);
  }

  // Copy Crowdfunding ABI
  const crowdfundingArtifactPath = path.join(artifactsPath, "Crowdfunding_Muneeb.sol", "Crowdfunding_Muneeb.json");
  const crowdfundingDestPath = path.join(frontendPath, "Crowdfunding_Muneeb.json");
  
  if (fs.existsSync(crowdfundingArtifactPath)) {
    fs.copyFileSync(crowdfundingArtifactPath, crowdfundingDestPath);
    console.log("✅ Copied Crowdfunding_Muneeb.json to frontend");
  } else {
    console.log("❌ Crowdfunding artifact not found at:", crowdfundingArtifactPath);
  }

  // Create config file for contract addresses
  const configPath = path.join(frontendPath, "config.js");
  const configContent = `export const CONTRACT_ADDRESSES = {
  KYCRegistry: "${kycAddress}",
  Crowdfunding: "${crowdfundingAddress}",
  network: "${hre.network.name}"
};
`;

  fs.writeFileSync(configPath, configContent);
  console.log("✅ Created config.js with contract addresses\n");

  // Display contract addresses for frontend integration
  console.log("=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", hre.network.name);
  console.log("KYCRegistry Address:", kycAddress);
  console.log("Crowdfunding Address:", crowdfundingAddress);
  console.log("Admin Address:", deployer.address);
  console.log("\n✅ ABI files and contract addresses automatically configured in React app!");
  console.log("==========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });