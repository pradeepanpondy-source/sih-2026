require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Local Hardhat node (for development)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Polygon Amoy Testnet
    amoy: {
      url: AMOY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80002,
      gasPrice: 25000000000, // 25 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
