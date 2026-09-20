/**
 * POST /api/sih-register-beekeeper
 * Register a new beekeeper profile linked to existing auth user.
 * The agriculture_id is NOT stored raw — only a SHA-256 hash is stored.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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
      agriculture_id,    // Raw ID — hashed server-side, never stored raw
      blockchain_address,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    if (!full_name) return res.status(400).json({ error: 'full_name is required' });
    if (!agriculture_id) return res.status(400).json({ error: 'agriculture_id is required' });

    // ── Hash the Agriculture ID (SHA-256) ─────────────────────────────────
    // The raw agriculture_id is NEVER stored anywhere in the database
    const agriIdHash = crypto
      .createHash('sha256')
      .update(agriculture_id.trim().toUpperCase())  // Normalize before hashing
      .digest('hex');

    // ── Init Supabase (service role for writes) ────────────────────────────
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ── Check for duplicate agriculture_id hash ────────────────────────────
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

    // ── Check if user already has a beekeeper profile ─────────────────────
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

    // ── Insert beekeeper profile ───────────────────────────────────────────
    // agriculture_id is NOT in the insert — only the hash is stored
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
        // Store masked display version: show only last 4 chars
        agriculture_id: '****-****-' + agriculture_id.trim().slice(-4),
        blockchain_address: blockchain_address || null,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[sih-register-beekeeper] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create beekeeper profile', details: insertError.message });
    }

    console.log(`[sih-register-beekeeper] ✅ Beekeeper registered: ${beekeeper.id} | ${full_name}`);

    return res.status(201).json({
      success: true,
      beekeeper: {
        id: beekeeper.id,
        full_name: beekeeper.full_name,
        verification_status: beekeeper.verification_status,
        agri_id_hash: agriIdHash, // Return hash (public — goes to blockchain on approval)
        created_at: beekeeper.created_at,
      },
      message: 'Beekeeper profile created. Pending admin verification.',
    });

  } catch (err: any) {
    console.error('[sih-register-beekeeper] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
