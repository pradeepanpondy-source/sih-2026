// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HoneyChain
 * @author SIH 2026 - Bee Bridge Team
 * @notice Blockchain-based honey traceability smart contract.
 *         Deployed on Polygon Amoy Testnet.
 *
 * WORKFLOW:
 *   1. Owner verifies a farmer by storing SHA-256 hash of their Agriculture ID
 *   2. Verified farmer registers hives (unique HIVE-XXXXXX codes)
 *   3. Farmer registers honey batches (unique HB-2026-XXXXXX codes)
 *   4. Trace events are appended to each batch (immutable audit log)
 *   5. Consumers can verify any batch is authentic and unmodified
 *
 * PRIVACY: Raw Agriculture IDs and Aadhaar are NEVER stored on-chain.
 *          Only SHA-256 hashes are stored.
 */
contract HoneyChain is Ownable, ReentrancyGuard {

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Farmer {
        address wallet;          // Ethereum address
        bytes32 agriIdHash;      // SHA-256 hash of Agriculture ID (never raw)
        bool isVerified;
        uint256 verifiedAt;
        string farmerName;       // Display name only (no sensitive data)
    }

    struct Hive {
        uint256 hiveId;
        string hiveCode;         // "HIVE-000001"
        address farmer;
        string location;
        string hiveType;         // "Langstroth", "Top-bar", etc.
        uint256 registeredAt;
        bool isActive;
    }

    struct HoneyBatch {
        uint256 batchId;
        string batchCode;        // "HB-2026-000001"
        uint256 hiveId;
        address farmer;
        string variety;          // e.g., "Wild Forest", "Jamun"
        uint256 quantityGrams;
        string qualityGrade;     // "A", "B", "C"
        uint256 harvestDate;     // Unix timestamp
        uint256 registeredAt;
        bool isActive;
        uint256 traceEventCount;
    }

    struct TraceEvent {
        uint256 batchId;
        string eventType;        // "Harvested", "Quality Checked", "Packed", "Listed", "Sold", "Delivered"
        string description;
        string location;
        address actor;           // Who performed the action
        uint256 timestamp;
    }

    // ─── State Variables ──────────────────────────────────────────────────────

    // Farmers
    mapping(address => Farmer) private farmers;
    mapping(bytes32 => bool) private usedAgriHashes; // prevent duplicate registrations
    address[] private farmerList;

    // Hives
    uint256 private hiveCounter;
    mapping(uint256 => Hive) private hives;
    mapping(string => bool) private usedHiveCodes;   // prevent duplicate hive codes
    mapping(address => uint256[]) private farmerHives;

    // Batches
    uint256 private batchCounter;
    mapping(uint256 => HoneyBatch) private batches;
    mapping(string => bool) private usedBatchCodes;  // prevent duplicate batch codes
    mapping(uint256 => uint256[]) private hiveBatches;

    // Trace Events (batchId → array of events)
    mapping(uint256 => TraceEvent[]) private traceEvents;

    // ─── Events ───────────────────────────────────────────────────────────────

    event FarmerVerified(
        address indexed farmer,
        bytes32 indexed agriIdHash,
        uint256 verifiedAt
    );

    event HiveRegistered(
        uint256 indexed hiveId,
        string hiveCode,
        address indexed farmer,
        string location,
        uint256 timestamp
    );

    event HoneyBatchRegistered(
        uint256 indexed batchId,
        string batchCode,
        uint256 indexed hiveId,
        address indexed farmer,
        string variety,
        uint256 quantityGrams,
        uint256 timestamp
    );

    event TraceEventAdded(
        uint256 indexed batchId,
        string eventType,
        address indexed actor,
        uint256 timestamp
    );

    event FarmerRevoked(address indexed farmer, uint256 revokedAt);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyVerifiedFarmer() {
        require(farmers[msg.sender].isVerified, "HoneyChain: Caller is not a verified farmer");
        _;
    }

    modifier batchExists(uint256 batchId) {
        require(batchId > 0 && batchId <= batchCounter, "HoneyChain: Batch does not exist");
        require(batches[batchId].isActive, "HoneyChain: Batch is not active");
        _;
    }

    modifier hiveExists(uint256 hiveId) {
        require(hiveId > 0 && hiveId <= hiveCounter, "HoneyChain: Hive does not exist");
        require(hives[hiveId].isActive, "HoneyChain: Hive is not active");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Admin Functions (Owner Only) ─────────────────────────────────────────

    /**
     * @notice Verify a farmer's Agriculture ID. Only contract owner (admin) can call.
     * @param farmerAddress The farmer's Ethereum wallet address
     * @param agriIdHash SHA-256 hash of the Agriculture ID (computed off-chain, never raw ID)
     * @param farmerName Display name (no sensitive data)
     */
    function verifyFarmer(
        address farmerAddress,
        bytes32 agriIdHash,
        string calldata farmerName
    ) external onlyOwner {
        require(farmerAddress != address(0), "HoneyChain: Invalid farmer address");
        require(!farmers[farmerAddress].isVerified, "HoneyChain: Farmer already verified");
        require(!usedAgriHashes[agriIdHash], "HoneyChain: Agriculture ID hash already registered");
        require(bytes(farmerName).length > 0, "HoneyChain: Farmer name required");

        farmers[farmerAddress] = Farmer({
            wallet: farmerAddress,
            agriIdHash: agriIdHash,
            isVerified: true,
            verifiedAt: block.timestamp,
            farmerName: farmerName
        });

        usedAgriHashes[agriIdHash] = true;
        farmerList.push(farmerAddress);

        emit FarmerVerified(farmerAddress, agriIdHash, block.timestamp);
    }

    /**
     * @notice Revoke a farmer's verification (e.g., fraud detected)
     */
    function revokeFarmer(address farmerAddress) external onlyOwner {
        require(farmers[farmerAddress].isVerified, "HoneyChain: Farmer not verified");
        farmers[farmerAddress].isVerified = false;
        emit FarmerRevoked(farmerAddress, block.timestamp);
    }

    // ─── Farmer Functions ─────────────────────────────────────────────────────

    /**
     * @notice Register a beehive. Only verified farmers can call.
     * @param hiveCode Unique code e.g. "HIVE-000001" (server-generated)
     * @param location Human-readable location string
     * @param hiveType Type of hive e.g. "Langstroth"
     * @return hiveId The numeric ID of the registered hive
     */
    function registerHive(
        string calldata hiveCode,
        string calldata location,
        string calldata hiveType
    ) external onlyVerifiedFarmer nonReentrant returns (uint256 hiveId) {
        require(bytes(hiveCode).length > 0, "HoneyChain: Hive code required");
        require(!usedHiveCodes[hiveCode], "HoneyChain: Hive code already registered");
        require(bytes(location).length > 0, "HoneyChain: Location required");

        hiveCounter++;
        hiveId = hiveCounter;

        hives[hiveId] = Hive({
            hiveId: hiveId,
            hiveCode: hiveCode,
            farmer: msg.sender,
            location: location,
            hiveType: hiveType,
            registeredAt: block.timestamp,
            isActive: true
        });

        usedHiveCodes[hiveCode] = true;
        farmerHives[msg.sender].push(hiveId);

        emit HiveRegistered(hiveId, hiveCode, msg.sender, location, block.timestamp);
    }

    /**
     * @notice Register a honey batch. Only the hive's farmer can register.
     * @param hiveId The blockchain hive ID this batch came from
     * @param batchCode Unique batch code e.g. "HB-2026-000001" (server-generated)
     * @param variety Honey variety name
     * @param quantityGrams Quantity in grams
     * @param qualityGrade Quality grade: "A", "B", or "C"
     * @param harvestDate Unix timestamp of harvest date
     * @return batchId The numeric ID of the registered batch
     */
    function registerHoneyBatch(
        uint256 hiveId,
        string calldata batchCode,
        string calldata variety,
        uint256 quantityGrams,
        string calldata qualityGrade,
        uint256 harvestDate
    ) external onlyVerifiedFarmer hiveExists(hiveId) nonReentrant returns (uint256 batchId) {
        require(hives[hiveId].farmer == msg.sender, "HoneyChain: Not the hive owner");
        require(bytes(batchCode).length > 0, "HoneyChain: Batch code required");
        require(!usedBatchCodes[batchCode], "HoneyChain: Batch code already registered");
        require(quantityGrams > 0, "HoneyChain: Quantity must be greater than 0");
        require(harvestDate <= block.timestamp, "HoneyChain: Harvest date cannot be in the future");

        batchCounter++;
        batchId = batchCounter;

        batches[batchId] = HoneyBatch({
            batchId: batchId,
            batchCode: batchCode,
            hiveId: hiveId,
            farmer: msg.sender,
            variety: variety,
            quantityGrams: quantityGrams,
            qualityGrade: qualityGrade,
            harvestDate: harvestDate,
            registeredAt: block.timestamp,
            isActive: true,
            traceEventCount: 0
        });

        usedBatchCodes[batchCode] = true;
        hiveBatches[hiveId].push(batchId);

        // Automatically add "Harvested" trace event
        _addTraceEvent(batchId, "Harvested", "Honey batch harvested and registered on blockchain", hives[hiveId].location);

        emit HoneyBatchRegistered(batchId, batchCode, hiveId, msg.sender, variety, quantityGrams, block.timestamp);
    }

    /**
     * @notice Add a trace event to a batch. Farmer or owner can add events.
     * @param batchId Target batch
     * @param eventType One of: "Quality Checked", "Packed", "Listed", "Sold", "Delivered"
     * @param description Human-readable description
     * @param location Where the event occurred
     */
    function addTraceEvent(
        uint256 batchId,
        string calldata eventType,
        string calldata description,
        string calldata location
    ) external batchExists(batchId) {
        require(
            batches[batchId].farmer == msg.sender || owner() == msg.sender,
            "HoneyChain: Not authorized to add trace events"
        );
        require(bytes(eventType).length > 0, "HoneyChain: Event type required");

        _addTraceEvent(batchId, eventType, description, location);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _addTraceEvent(
        uint256 batchId,
        string memory eventType,
        string memory description,
        string memory location
    ) internal {
        TraceEvent memory newEvent = TraceEvent({
            batchId: batchId,
            eventType: eventType,
            description: description,
            location: location,
            actor: msg.sender,
            timestamp: block.timestamp
        });

        traceEvents[batchId].push(newEvent);
        batches[batchId].traceEventCount++;

        emit TraceEventAdded(batchId, eventType, msg.sender, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get full batch details
     */
    function getBatch(uint256 batchId)
        external
        view
        batchExists(batchId)
        returns (HoneyBatch memory batch, Farmer memory farmer, Hive memory hive)
    {
        batch = batches[batchId];
        farmer = farmers[batch.farmer];
        hive = hives[batch.hiveId];
    }

    /**
     * @notice Get all trace events for a batch
     */
    function getTraceEvents(uint256 batchId)
        external
        view
        batchExists(batchId)
        returns (TraceEvent[] memory)
    {
        return traceEvents[batchId];
    }

    /**
     * @notice Verify a batch is authentic and on-chain
     * @return isAuthentic True if batch is active and registered
     * @return batchCode The unique batch code
     * @return farmerName The verified farmer's name
     * @return traceCount Number of trace events
     */
    function verifyBatch(uint256 batchId)
        external
        view
        returns (
            bool isAuthentic,
            string memory batchCode,
            string memory farmerName,
            uint256 traceCount,
            uint256 registeredAt
        )
    {
        if (batchId == 0 || batchId > batchCounter) {
            return (false, "", "", 0, 0);
        }
        HoneyBatch memory batch = batches[batchId];
        if (!batch.isActive) {
            return (false, batch.batchCode, "", 0, batch.registeredAt);
        }
        Farmer memory farmer = farmers[batch.farmer];
        return (
            true,
            batch.batchCode,
            farmer.farmerName,
            batch.traceEventCount,
            batch.registeredAt
        );
    }

    /**
     * @notice Get farmer details by address
     */
    function getFarmer(address farmerAddress)
        external
        view
        returns (Farmer memory)
    {
        return farmers[farmerAddress];
    }

    /**
     * @notice Get all hive IDs for a farmer
     */
    function getFarmerHives(address farmerAddress)
        external
        view
        returns (uint256[] memory)
    {
        return farmerHives[farmerAddress];
    }

    /**
     * @notice Get hive details by ID
     */
    function getHive(uint256 hiveId)
        external
        view
        hiveExists(hiveId)
        returns (Hive memory)
    {
        return hives[hiveId];
    }

    /**
     * @notice Check if an address is a verified farmer
     */
    function isVerifiedFarmer(address farmerAddress) external view returns (bool) {
        return farmers[farmerAddress].isVerified;
    }

    /**
     * @notice Get total counts for dashboard stats
     */
    function getStats()
        external
        view
        returns (
            uint256 totalFarmers,
            uint256 totalHives,
            uint256 totalBatches
        )
    {
        return (farmerList.length, hiveCounter, batchCounter);
    }

    /**
     * @notice Check if a hive code is already registered
     */
    function isHiveCodeUsed(string calldata hiveCode) external view returns (bool) {
        return usedHiveCodes[hiveCode];
    }

    /**
     * @notice Check if a batch code is already registered
     */
    function isBatchCodeUsed(string calldata batchCode) external view returns (bool) {
        return usedBatchCodes[batchCode];
    }
}
