const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n🍯 HoneyChain Deployment Script");
  console.log("================================");
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.error("\n❌ Zero balance! Get free Amoy MATIC from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  console.log("\n⏳ Deploying HoneyChain contract...");

  const HoneyChain = await ethers.getContractFactory("HoneyChain");
  const honeyChain = await HoneyChain.deploy();
  await honeyChain.waitForDeployment();

  const contractAddress = await honeyChain.getAddress();

  console.log("\n✅ HoneyChain deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Owner (admin):", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", network.chainId.toString());

  if (network.chainId === 80002n) {
    console.log("\n🔗 View on Polygonscan (Amoy):");
    console.log(`   https://amoy.polygonscan.com/address/${contractAddress}`);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
  };

  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save latest.json for easy reference
  fs.writeFileSync(
    path.join(deploymentPath, "latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", `blockchain/deployments/${filename}`);
  console.log("\n⚠️  Add this to your .env files:");
  console.log(`   HONEYCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   BLOCKCHAIN_CHAIN_ID=${network.chainId.toString()}`);
  console.log("\n🎉 Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
