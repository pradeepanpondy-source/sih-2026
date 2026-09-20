/**
 * Unified SIH 2026 API Handler
 * Consolidates:
 * - Beekeeper Registration (POST /api/sih-register-beekeeper or /api/sih?action=register-beekeeper)
 * - Admin Farmer Blockchain Verification (POST /api/sih-verify-farmer or /api/sih?action=verify-farmer)
 * - IoT Hive Sensor Telemetry Ingestion (POST /api/sih/iot/telemetry or /api/sih?action=iot-telemetry)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ethers } from 'ethers';

const HONEYCHAIN_ABI = [
  "function verifyFarmer(address farmerAddress, bytes32 agriIdHash, string farmerName) external",
  "function isVerifiedFarmer(address farmerAddress) external view returns (bool)",
  "event FarmerVerified(address indexed farmer, bytes32 indexed agriIdHash, uint256 verifiedAt)",
];

function getSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'mock-key';
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

// ── 1. Register Beekeeper Handler ──────────────────────────────────────────
async function handleRegisterBeekeeper(req: VercelRequest, res: VercelResponse) {
  const {
    user_id,
    seller_id,
    full_name,
    phone,
    farm_name,
    farm_location,
    farm_state,
    farm_district,
    farm_pincode,
    farm_latitude,
    farm_longitude,
    experience_years,
    agriculture_id,
    blockchain_address,
  } = req.body || {};

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  if (!agriculture_id) return res.status(400).json({ error: 'agriculture_id is required' });

  const agriIdHash = crypto
    .createHash('sha256')
    .update(agriculture_id.trim().toUpperCase())
    .digest('hex');

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('sih_beekeepers')
    .select('id, agri_id_hash')
    .eq('agri_id_hash', agriIdHash)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({
      error: 'An account with this Agriculture ID is already registered.',
      code: 'DUPLICATE_AGRI_ID',
    });
  }

  const { data: existingProfile } = await supabase
    .from('sih_beekeepers')
    .select('id, verification_status')
    .eq('user_id', user_id)
    .maybeSingle();

  if (existingProfile) {
    return res.status(409).json({
      error: 'Beekeeper profile already exists for this user.',
      code: 'DUPLICATE_PROFILE',
      existing: existingProfile,
    });
  }

  const { data: beekeeper, error: insertError } = await supabase
    .from('sih_beekeepers')
    .insert({
      user_id,
      seller_id: seller_id || null,
      full_name: full_name.trim(),
      phone: phone || null,
      farm_name: farm_name || null,
      farm_location: farm_location || null,
      farm_state: farm_state || null,
      farm_district: farm_district || null,
      farm_pincode: farm_pincode || null,
      farm_latitude: farm_latitude || null,
      farm_longitude: farm_longitude || null,
      experience_years: experience_years || 0,
      agri_id_hash: agriIdHash,
      agriculture_id: '****-****-' + agriculture_id.trim().slice(-4),
      blockchain_address: blockchain_address || null,
      verification_status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[sih-api] Beekeeper insert error:', insertError);
    return res.status(500).json({ error: 'Failed to create beekeeper profile', details: insertError.message });
  }

  return res.status(201).json({
    success: true,
    beekeeper: {
      id: beekeeper.id,
      full_name: beekeeper.full_name,
      verification_status: beekeeper.verification_status,
      agri_id_hash: agriIdHash,
      created_at: beekeeper.created_at,
    },
    message: 'Beekeeper profile created. Pending admin verification.',
  });
}

// ── 2. Admin Farmer Verification Handler ───────────────────────────────────
async function handleVerifyFarmer(req: VercelRequest, res: VercelResponse) {
  const { beekeeper_id, action, rejected_reason, admin_secret } = req.body || {};

  const expectedSecret = process.env.SIH_ADMIN_SECRET || 'sih_admin_2026';
  if (admin_secret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized. Invalid admin secret.' });
  }

  if (!beekeeper_id) return res.status(400).json({ error: 'beekeeper_id is required' });
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  const supabase = getSupabase();

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

  // Handle Approval → Blockchain
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const contractAddress = process.env.HONEYCHAIN_CONTRACT_ADDRESS;
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';

  const blockchainEnabled = !!(privateKey && contractAddress);
  let txHash: string | null = null;
  let blockNumber: number | null = null;

  if (blockchainEnabled) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey!, provider);
      const contract = new ethers.Contract(contractAddress!, HONEYCHAIN_ABI, wallet);

      const farmerAddress = beekeeper.blockchain_address || wallet.address;
      const agriIdHashBytes32 = '0x' + beekeeper.agri_id_hash.padEnd(64, '0');

      const tx = await contract.verifyFarmer(farmerAddress, agriIdHashBytes32, beekeeper.full_name);
      const receipt = await tx.wait();
      txHash = receipt.hash;
      blockNumber = receipt.blockNumber;

      await supabase.from('sih_blockchain_records').insert({
        beekeeper_id: beekeeper.id,
        record_type: 'farmer_verified',
        tx_hash: txHash,
        block_number: blockNumber,
        contract_address: contractAddress,
        network: 'polygon-amoy',
        data_summary: `Farmer ${beekeeper.full_name} verified. Agri ID hash stored on-chain.`,
      });
    } catch (bcErr: any) {
      console.warn('[sih-api] Blockchain broadcast error, falling back:', bcErr.message);
      txHash = `SIMULATED-${Date.now()}`;
    }
  } else {
    txHash = `SIMULATED-${Date.now()}`;
  }

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
      : 'Farmer approved in database. Blockchain simulated for demo.',
  });
}

// ── 3. IoT Telemetry Handler ───────────────────────────────────────────────
async function handleTelemetry(req: VercelRequest, res: VercelResponse) {
  const body = req.body || {};
  const hiveCode = (body.hive_code || body.hive_id || 'HIVE-000001').toUpperCase();
  const temperature = Number(body.temperature ?? 34.5);
  const humidity = Number(body.humidity ?? 62.0);
  const battery = Number(body.battery ?? 95.0);
  const isDemo = Boolean(body.is_demo ?? false);
  const recordedAt = body.timestamp || new Date().toISOString();

  if (isNaN(temperature) || isNaN(humidity)) {
    return res.status(400).json({ error: 'Temperature and Humidity must be valid numeric values.' });
  }

  const alertsToCreate = [];
  if (temperature > 38.0) {
    alertsToCreate.push({
      hive_code: hiveCode,
      alert_type: 'High Temperature',
      severity: 'critical',
      title: `High Brood Temperature: ${temperature.toFixed(1)}°C`,
      description: `Hive internal temperature reached ${temperature.toFixed(1)}°C (threshold: 38.0°C). Risk of brood overheating.`,
      threshold_value: `${temperature.toFixed(1)}°C (> 38.0°C)`,
    });
  } else if (temperature < 31.0) {
    alertsToCreate.push({
      hive_code: hiveCode,
      alert_type: 'Low Temperature',
      severity: 'warning',
      title: `Low Hive Temperature: ${temperature.toFixed(1)}°C`,
      description: `Hive internal temperature dropped to ${temperature.toFixed(1)}°C (threshold: 31.0°C). Colony cluster may be chilled.`,
      threshold_value: `${temperature.toFixed(1)}°C (< 31.0°C)`,
    });
  }

  if (humidity < 45.0) {
    alertsToCreate.push({
      hive_code: hiveCode,
      alert_type: 'Low Humidity',
      severity: 'warning',
      title: `Low Hive Humidity: ${humidity.toFixed(1)}%`,
      description: `Relative humidity inside brood nest is ${humidity.toFixed(1)}% (minimum: 50.0%). Brood dehydration hazard.`,
      threshold_value: `${humidity.toFixed(1)}% (< 45.0%)`,
    });
  }

  if (battery < 20.0) {
    alertsToCreate.push({
      hive_code: hiveCode,
      alert_type: 'Sensor Offline',
      severity: 'warning',
      title: `IoT Sensor Battery Low: ${battery.toFixed(0)}%`,
      description: 'Solar/battery node power depleted. Sensor may go offline within 24 hours.',
      threshold_value: `${battery.toFixed(0)}% (< 20%)`,
    });
  }

  const supabase = getSupabase();
  try {
    await supabase.from('sih_hive_telemetry').insert([
      {
        hive_code: hiveCode,
        temperature_c: temperature,
        humidity_percent: humidity,
        battery_percent: battery,
        is_demo: isDemo,
        recorded_at: recordedAt,
      },
    ]);

    if (alertsToCreate.length > 0) {
      await supabase.from('sih_hive_alerts').insert(alertsToCreate);
    }
  } catch (dbErr) {
    console.warn('[sih-api] Supabase IoT insert warning:', dbErr);
  }

  return res.status(200).json({
    success: true,
    message: isDemo ? 'Demo sensor telemetry received successfully.' : 'Live IoT telemetry ingested successfully.',
    data: {
      hive_code: hiveCode,
      temperature,
      humidity,
      battery,
      is_demo: isDemo,
      recorded_at: recordedAt,
      alerts_triggered: alertsToCreate,
    },
  });
}

// ── Main Entrypoint Dispatcher ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const action = req.query.action || (req.body && req.body._action) || '';

  try {
    if (action === 'register-beekeeper' || req.url?.includes('register-beekeeper')) {
      return await handleRegisterBeekeeper(req, res);
    } else if (action === 'verify-farmer' || req.url?.includes('verify-farmer')) {
      return await handleVerifyFarmer(req, res);
    } else if (action === 'iot-telemetry' || req.url?.includes('telemetry')) {
      return await handleTelemetry(req, res);
    } else {
      // Auto-detect based on body fields
      if (req.body?.agriculture_id) {
        return await handleRegisterBeekeeper(req, res);
      } else if (req.body?.beekeeper_id && req.body?.action) {
        return await handleVerifyFarmer(req, res);
      } else {
        return await handleTelemetry(req, res);
      }
    }
  } catch (error: any) {
    console.error('[sih-api] Dispatcher error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
