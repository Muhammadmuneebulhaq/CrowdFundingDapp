# CrowdFundingDapp
A decentralized crowd funding app using hardhat and react

## How to setup the hardhat 
### Inside the CrowdFunding Dapp
npm install --save-dev hardhat@^2.22.6
npm init -y
npm install --save-dev @nomicfoundation/hardhat-chai-matchers@^2 @nomicfoundation/hardhat-
ethers@^3 @nomicfoundation/hardhat-ignition@^0.15.0 @nomicfoundation/hardhat-ignition-
ethers@^0.15.0 @nomicfoundation/hardhat-network-helpers@^1.0.0 @nomicfoundation/hardhat-
verify@^2 @typechain/ethers-v6@^0.5.0 @typechain/hardhat@^9.0.0 chai@^4.2.0 hardhat-gas-
reporter@^2.3.0 solidity-coverage@^0.8.0 typechain@^8.3.1
npx hardhat init
Create a javascript project

npx hardhat compile
npx hardhat node

You should get some hardhat accounts along with their private keys for testing
Keep this terminal running

### Open Another terminal in the same directory
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
In the first terminal you should see that your contracts have been deployed

## Inside the crowdfunding (frontend)
npm install ethers
npm start

## Note: 
 The deploy.js copies ABI files from the artifacts/contracts to the src in crowdfunding AND 
also the deployed contracts' addresses doesn’t need to be added to app.js manually, deploy.js does 
that.

## Metamask wallet configuration for Hardhat
Network name: Hardhat Local
Default RPC URL: 127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
