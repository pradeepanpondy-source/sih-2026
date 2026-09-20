# 🔗 SIH 2026 — Blockchain Setup Guide (HoneyChain.sol)

Setup, compile, test, and deploy the HoneyChain smart contract on Polygon Amoy.

---

## 1. Network Configuration

| Property | Value |
| :--- | :--- |
| **Network Name** | Polygon Amoy Testnet |
| **Chain ID** | `80002` |
| **Currency Symbol** | `MATIC` / `POL` |
| **RPC URL** | `https://rpc-amoy.polygon.technology` |
| **Block Explorer** | `https://amoy.polygonscan.com` |

---

## 2. Directory Structure

```
blockchain/
├── contracts/
│   └── HoneyChain.sol        # Main Solidity Smart Contract
├── scripts/
│   └── deploy.js             # Hardhat deployment script
├── test/
│   └── HoneyChain.test.js    # Comprehensive Mocha/Chai test suite
├── hardhat.config.js         # Hardhat configuration (Solidity 0.8.24 + viaIR)
├── package.json              # Blockchain dependencies
└── .env.example              # Private key and RPC URL template
```

---

## 3. Installation & Testing

```bash
# Navigate to blockchain directory
cd blockchain

# Install Hardhat and dependencies
npm install

# Compile smart contracts with viaIR enabled
npx hardhat compile

# Run test suite
npx hardhat test
```

---

## 4. Deploying to Polygon Amoy Testnet

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
2. Add your wallet private key (with Amoy testnet MATIC):
```env
BLOCKCHAIN_PRIVATE_KEY=0x...
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
```
3. Run the deployment script:
```bash
npx hardhat run scripts/deploy.js --network amoy
```
The script will output the deployed contract address and save it in `deployments/amoy.json`.
