/**
 * POST /api/sih-verify-farmer
 * Admin endpoint: Approve or reject a beekeeper's Agriculture ID verification.
 * On approval → calls HoneyChain.verifyFarmer() on blockchain.
 * 
 * SECURITY: This endpoint is admin-only. It reads SUPABASE_SERVICE_ROLE_KEY.
 * Do NOT expose this endpoint to the public frontend without auth middleware.
 * For SIH demo: call this from backend/admin panel only.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// HoneyChain ABI — only the functions we need
const HONEYCHAIN_ABI = [
  "function verifyFarmer(address farmerAddress, bytes32 agriIdHash, string farmerName) external",
  "function isVerifiedFarmer(address farmerAddress) external view returns (bool)",
  "event FarmerVerified(address indexed farmer, bytes32 indexed agriIdHash, uint256 verifiedAt)",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      beekeeper_id,
      action,              // 'approve' | 'reject'
      rejected_reason,
      admin_secret,        // Simple admin auth for SIH demo
    } = req.body;

    // ── Admin auth (simple secret for SIH demo) ────────────────────────────
    const expectedSecret = process.env.SIH_ADMIN_SECRET || 'sih_admin_2026';
    if (admin_secret !== expectedSecret) {
      return res.status(403).json({ error: 'Unauthorized. Invalid admin secret.' });
    }

    if (!beekeeper_id) return res.status(400).json({ error: 'beekeeper_id is required' });
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    // ── Init Supabase ──────────────────────────────────────────────────────
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ── Fetch beekeeper ────────────────────────────────────────────────────
    const { data: beekeeper, error: fetchError } = await supabase
      .from('sih_beekeepers')
      .select('*')
      .eq('id', beekeeper_id)
      .single();

    if (fetchError || !beekeeper) {
      return res.status(404).json({ error: 'Beekeeper not found' });
    }

    if (beekeeper.verification_status !== 'pending') {
      return res.status(409).json({
        error: `Beekeeper is already ${beekeeper.verification_status}`,
        current_status: beekeeper.verification_status,
      });
    }

    // ── Handle Rejection ───────────────────────────────────────────────────
    if (action === 'reject') {
      await supabase
        .from('sih_beekeepers')
        .update({
          verification_status: 'rejected',
          rejected_reason: rejected_reason || 'Verification failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', beekeeper_id);

      return res.status(200).json({
        success: true,
        action: 'rejected',
        message: 'Beekeeper verification rejected.',
      });
    }

    // ── Handle Approval → Blockchain Transaction ───────────────────────────
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const contractAddress = process.env.HONEYCHAIN_CONTRACT_ADDRESS;
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';

    // Check if blockchain is configured
    const blockchainEnabled = !!(privateKey && contractAddress);
    let txHash: string | null = null;
    let blockNumber: number | null = null;

    if (blockchainEnabled) {
      console.log('[sih-verify-farmer] Broadcasting to blockchain...');

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey!, provider);
      const contract = new ethers.Contract(contractAddress!, HONEYCHAIN_ABI, wallet);

      // Prepare farmer wallet address (use beekeeper's saved address or generate from hash)
      const farmerAddress = beekeeper.blockchain_address || wallet.address;
      const agriIdHashBytes32 = '0x' + beekeeper.agri_id_hash.padEnd(64, '0');

      const tx = await contract.verifyFarmer(
        farmerAddress,
        agriIdHashBytes32,
        beekeeper.full_name
      );

      const receipt = await tx.wait();
      txHash = receipt.hash;
      blockNumber = receipt.blockNumber;

      console.log(`[sih-verify-farmer] ✅ Blockchain TX: ${txHash}`);

      // Save blockchain record
      await supabase.from('sih_blockchain_records').insert({
        beekeeper_id: beekeeper.id,
        record_type: 'farmer_verified',
        tx_hash: txHash,
        block_number: blockNumber,
        contract_address: contractAddress,
        network: 'polygon-amoy',
        data_summary: `Farmer ${beekeeper.full_name} verified. Agri ID hash stored on-chain.`,
      });
    } else {
      console.warn('[sih-verify-farmer] ⚠️  Blockchain not configured — approving in DB only');
      txHash = `SIMULATED-${Date.now()}`; // For demo without blockchain
    }

    // ── Update beekeeper status in DB ─────────────────────────────────────
    await supabase
      .from('sih_beekeepers')
      .update({
        verification_status: 'approved',
        verified_at: new Date().toISOString(),
        blockchain_tx_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', beekeeper_id);

    return res.status(200).json({
      success: true,
      action: 'approved',
      beekeeper_id,
      blockchain_tx_hash: txHash,
      block_number: blockNumber,
      blockchain_enabled: blockchainEnabled,
      message: blockchainEnabled
        ? `Farmer verified on blockchain. TX: ${txHash}`
        : 'Farmer approved in database. Blockchain not configured.',
    });

  } catch (err: any) {
    console.error('[sih-verify-farmer] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
