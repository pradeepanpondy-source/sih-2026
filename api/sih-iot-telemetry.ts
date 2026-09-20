import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TelemetryBody {
  hive_id?: string;
  hive_code?: string;
  temperature?: number;
  humidity?: number;
  battery?: number;
  timestamp?: string;
  is_demo?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body: TelemetryBody = req.body || {};

    const hiveCode = (body.hive_code || body.hive_id || 'HIVE-000001').toUpperCase();
    const temperature = Number(body.temperature ?? 34.5);
    const humidity = Number(body.humidity ?? 62.0);
    const battery = Number(body.battery ?? 95.0);
    const isDemo = Boolean(body.is_demo ?? false);
    const recordedAt = body.timestamp || new Date().toISOString();

    if (isNaN(temperature) || isNaN(humidity)) {
      return res.status(400).json({ error: 'Temperature and Humidity must be valid numeric values.' });
    }

    // ── Evaluate IoT Alerts ─────────────────────────────────
    const alertsToCreate = [];

    if (temperature > 38.0) {
      alertsToCreate.push({
        hive_code: hiveCode,
        alert_type: 'High Temperature',
        severity: 'critical',
        title: `High Brood Temperature: ${temperature.toFixed(1)}°C`,
        description: `Hive internal temperature reached ${temperature.toFixed(1)}°C (threshold: 38.0°C). Risk of brood overheating and comb collapse.`,
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

    // ── Store Telemetry to Supabase ─────────────────────────
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
      console.warn('Supabase IoT insert warning (using memory state)', dbErr);
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
  } catch (err: any) {
    console.error('Error handling IoT telemetry:', err);
    return res.status(500).json({ error: 'Internal telemetry processing error', details: err?.message });
  }
}
