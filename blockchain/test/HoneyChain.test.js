const { expect } = require("chai");
const { ethers } = require("hardhat");
const crypto = require("crypto");

describe("HoneyChain", function () {
  let honeyChain;
  let owner;
  let farmer1;
  let farmer2;
  let unauthorized;

  // Helper: compute SHA-256 as bytes32 (mimics server-side hash)
  function hashAgriId(agriId) {
    const hash = crypto.createHash("sha256").update(agriId).digest("hex");
    return "0x" + hash;
  }

  beforeEach(async function () {
    [owner, farmer1, farmer2, unauthorized] = await ethers.getSigners();
    const HoneyChain = await ethers.getContractFactory("HoneyChain");
    honeyChain = await HoneyChain.deploy();
    await honeyChain.waitForDeployment();
  });

  // ─── Farmer Verification ────────────────────────────────────────────────────

  describe("verifyFarmer", function () {
    it("should allow owner to verify a farmer", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");

      await expect(
        honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar")
      )
        .to.emit(honeyChain, "FarmerVerified")
        .withArgs(farmer1.address, agriHash, await getTimestamp());

      expect(await honeyChain.isVerifiedFarmer(farmer1.address)).to.be.true;

      const farmerData = await honeyChain.getFarmer(farmer1.address);
      expect(farmerData.farmerName).to.equal("Rajesh Kumar");
      expect(farmerData.isVerified).to.be.true;
    });

    it("should reject non-owner from verifying farmers", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await expect(
        honeyChain.connect(unauthorized).verifyFarmer(farmer1.address, agriHash, "Test")
      ).to.be.revertedWithCustomError(honeyChain, "OwnableUnauthorizedAccount");
    });

    it("should prevent duplicate Agriculture ID hash", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Farmer One");

      await expect(
        honeyChain.verifyFarmer(farmer2.address, agriHash, "Farmer Two")
      ).to.be.revertedWith("HoneyChain: Agriculture ID hash already registered");
    });

    it("should prevent double verification of same farmer", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Farmer One");

      const agriHash2 = hashAgriId("AGRI-2026-005678");
      await expect(
        honeyChain.verifyFarmer(farmer1.address, agriHash2, "Farmer One Again")
      ).to.be.revertedWith("HoneyChain: Farmer already verified");
    });

    it("should allow owner to revoke farmer", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Farmer One");
      expect(await honeyChain.isVerifiedFarmer(farmer1.address)).to.be.true;

      await honeyChain.revokeFarmer(farmer1.address);
      expect(await honeyChain.isVerifiedFarmer(farmer1.address)).to.be.false;
    });
  });

  // ─── Hive Registration ─────────────────────────────────────────────────────

  describe("registerHive", function () {
    beforeEach(async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar");
    });

    it("should allow verified farmer to register a hive", async function () {
      await expect(
        honeyChain.connect(farmer1).registerHive("HIVE-000001", "Tamil Nadu, India", "Langstroth")
      )
        .to.emit(honeyChain, "HiveRegistered")
        .withArgs(1, "HIVE-000001", farmer1.address, "Tamil Nadu, India", await getTimestamp());

      const hive = await honeyChain.getHive(1);
      expect(hive.hiveCode).to.equal("HIVE-000001");
      expect(hive.farmer).to.equal(farmer1.address);
      expect(hive.isActive).to.be.true;
    });

    it("should reject unverified farmer from registering a hive", async function () {
      await expect(
        honeyChain.connect(unauthorized).registerHive("HIVE-000002", "Location", "Langstroth")
      ).to.be.revertedWith("HoneyChain: Caller is not a verified farmer");
    });

    it("should prevent duplicate hive codes", async function () {
      await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Location A", "Langstroth");
      await expect(
        honeyChain.connect(farmer1).registerHive("HIVE-000001", "Location B", "Top-bar")
      ).to.be.revertedWith("HoneyChain: Hive code already registered");
    });

    it("should correctly track farmer's hives", async function () {
      await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Location A", "Langstroth");
      await honeyChain.connect(farmer1).registerHive("HIVE-000002", "Location B", "Top-bar");

      const hiveIds = await honeyChain.getFarmerHives(farmer1.address);
      expect(hiveIds.length).to.equal(2);
      expect(hiveIds[0]).to.equal(1n);
      expect(hiveIds[1]).to.equal(2n);
    });
  });

  // ─── Honey Batch Registration ──────────────────────────────────────────────

  describe("registerHoneyBatch", function () {
    let hiveId;

    beforeEach(async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar");
      const tx = await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Tamil Nadu, India", "Langstroth");
      const receipt = await tx.wait();
      hiveId = 1n;
    });

    it("should allow verified farmer to register a honey batch", async function () {
      const harvestDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        honeyChain.connect(farmer1).registerHoneyBatch(
          hiveId,
          "HB-2026-000001",
          "Wild Forest",
          5000,  // 5000 grams = 5 kg
          "A",
          harvestDate
        )
      ).to.emit(honeyChain, "HoneyBatchRegistered");

      const [batch] = await honeyChain.getBatch(1);
      expect(batch.batchCode).to.equal("HB-2026-000001");
      expect(batch.variety).to.equal("Wild Forest");
      expect(batch.quantityGrams).to.equal(5000n);
      expect(batch.qualityGrade).to.equal("A");
    });

    it("should automatically add Harvested trace event on batch creation", async function () {
      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await honeyChain.connect(farmer1).registerHoneyBatch(hiveId, "HB-2026-000001", "Jamun", 3000, "B", harvestDate);

      const events = await honeyChain.getTraceEvents(1);
      expect(events.length).to.equal(1);
      expect(events[0].eventType).to.equal("Harvested");
    });

    it("should reject non-hive-owner from registering a batch", async function () {
      const agriHash2 = hashAgriId("AGRI-2026-005678");
      await honeyChain.verifyFarmer(farmer2.address, agriHash2, "Another Farmer");

      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        honeyChain.connect(farmer2).registerHoneyBatch(hiveId, "HB-2026-000002", "Tulsi", 2000, "A", harvestDate)
      ).to.be.revertedWith("HoneyChain: Not the hive owner");
    });

    it("should prevent duplicate batch codes", async function () {
      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await honeyChain.connect(farmer1).registerHoneyBatch(hiveId, "HB-2026-000001", "Wild Forest", 5000, "A", harvestDate);
      await expect(
        honeyChain.connect(farmer1).registerHoneyBatch(hiveId, "HB-2026-000001", "Jamun", 3000, "B", harvestDate)
      ).to.be.revertedWith("HoneyChain: Batch code already registered");
    });
  });

  // ─── Trace Events ──────────────────────────────────────────────────────────

  describe("addTraceEvent", function () {
    beforeEach(async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar");
      await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Tamil Nadu, India", "Langstroth");
      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await honeyChain.connect(farmer1).registerHoneyBatch(1, "HB-2026-000001", "Wild Forest", 5000, "A", harvestDate);
    });

    it("should allow farmer to add trace events in order", async function () {
      await honeyChain.connect(farmer1).addTraceEvent(1, "Quality Checked", "Lab test passed - 98% purity", "Chennai Lab");
      await honeyChain.connect(farmer1).addTraceEvent(1, "Packed", "Packed in 500g glass jars", "Farm Packaging Unit");
      await honeyChain.connect(farmer1).addTraceEvent(1, "Listed", "Listed on Bee Bridge marketplace", "Online");

      const events = await honeyChain.getTraceEvents(1);
      expect(events.length).to.equal(4); // Harvested + 3 manual
      expect(events[1].eventType).to.equal("Quality Checked");
      expect(events[2].eventType).to.equal("Packed");
      expect(events[3].eventType).to.equal("Listed");
    });

    it("should reject unauthorized actor from adding trace events", async function () {
      await expect(
        honeyChain.connect(unauthorized).addTraceEvent(1, "Sold", "Sold to customer", "Online")
      ).to.be.revertedWith("HoneyChain: Not authorized to add trace events");
    });

    it("should allow owner (admin) to add trace events", async function () {
      await expect(
        honeyChain.connect(owner).addTraceEvent(1, "Delivered", "Delivered to customer", "Mumbai")
      ).to.emit(honeyChain, "TraceEventAdded");
    });
  });

  // ─── Batch Verification ────────────────────────────────────────────────────

  describe("verifyBatch", function () {
    beforeEach(async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar");
      await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Tamil Nadu, India", "Langstroth");
      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await honeyChain.connect(farmer1).registerHoneyBatch(1, "HB-2026-000001", "Wild Forest", 5000, "A", harvestDate);
    });

    it("should return isAuthentic=true for valid batch", async function () {
      const [isAuthentic, batchCode, farmerName, traceCount] = await honeyChain.verifyBatch(1);
      expect(isAuthentic).to.be.true;
      expect(batchCode).to.equal("HB-2026-000001");
      expect(farmerName).to.equal("Rajesh Kumar");
      expect(traceCount).to.equal(1n); // Harvested event
    });

    it("should return isAuthentic=false for non-existent batch", async function () {
      const [isAuthentic] = await honeyChain.verifyBatch(999);
      expect(isAuthentic).to.be.false;
    });
  });

  // ─── Stats ─────────────────────────────────────────────────────────────────

  describe("getStats", function () {
    it("should return correct counts", async function () {
      const agriHash = hashAgriId("AGRI-2026-001234");
      await honeyChain.verifyFarmer(farmer1.address, agriHash, "Rajesh Kumar");
      await honeyChain.connect(farmer1).registerHive("HIVE-000001", "Location", "Langstroth");
      const harvestDate = Math.floor(Date.now() / 1000) - 3600;
      await honeyChain.connect(farmer1).registerHoneyBatch(1, "HB-2026-000001", "Wildflower", 5000, "A", harvestDate);

      const [totalFarmers, totalHives, totalBatches] = await honeyChain.getStats();
      expect(totalFarmers).to.equal(1n);
      expect(totalHives).to.equal(1n);
      expect(totalBatches).to.equal(1n);
    });
  });

  // ─── Helper ────────────────────────────────────────────────────────────────

  async function getTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
