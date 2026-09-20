/**
 * Local Dev API Server — mirrors the Vercel /api routes during `npm run dev`
 *
 * Listens on port 3001. Vite proxies /api/* to here.
 * NOT used in production — Vercel handles api/ automatically.
 */

import 'dotenv/config';
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// ─── CORS (Vite dev is on 5174) ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── POST /api/create-order ──────────────────────────────────────────────────
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || typeof amount !== 'number' || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is 100 paise (₹1).' });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('[create-order] Razorpay keys missing from .env');
      return res.status(500).json({ error: 'Razorpay keys are not configured on the server.' });
    }

    const instance = new Razorpay({
      key_id:     RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    console.log(`[create-order] ✅ Order created: ${order.id} | ₹${amount / 100}`);
    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
    });

  } catch (err) {
    console.error('[create-order] ❌ Error:', err);
    if (err.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed — check KEY_ID and KEY_SECRET.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create Razorpay order.' });
  }
});

// ─── POST /api/verify-payment ────────────────────────────────────────────────
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature' });
    }

    if (!RAZORPAY_KEY_SECRET) {
      console.error('[verify-payment] Razorpay secret missing from .env');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log(`[verify-payment] ✅ Signature valid for payment: ${razorpay_payment_id}`);
      return res.status(200).json({ success: true, message: 'Payment verified successfully.' });
    } else {
      console.warn(`[verify-payment] ❌ Invalid signature for payment: ${razorpay_payment_id}`);
      return res.status(400).json({ error: 'Invalid payment signature. Payment not verified.' });
    }

  } catch (err) {
    console.error('[verify-payment] ❌ Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to verify payment.' });
  }
});

// ─── POST /api/sih/iot/telemetry ──────────────────────────────────────────
const handleTelemetry = (req, res) => {
  try {
    const { hive_id, hive_code, temperature = 34.5, humidity = 62.0, battery = 95.0, is_demo = false } = req.body || {};
    const code = (hive_code || hive_id || 'HIVE-000001').toUpperCase();
    const tempNum = Number(temperature);
    const humNum = Number(humidity);
    const batNum = Number(battery);

    const alerts = [];
    if (tempNum > 38.0) {
      alerts.push({ alert_type: 'High Temperature', severity: 'critical', title: `Brood Temp Spike: ${tempNum}°C` });
    } else if (tempNum < 31.0) {
      alerts.push({ alert_type: 'Low Temperature', severity: 'warning', title: `Low Temp: ${tempNum}°C` });
    }
    if (humNum < 45.0) {
      alerts.push({ alert_type: 'Low Humidity', severity: 'warning', title: `Low Humidity: ${humNum}%` });
    }

    console.log(`[iot-telemetry] ✅ ${code} - Temp: ${tempNum}°C, Hum: ${humNum}%, Bat: ${batNum}% (Alerts: ${alerts.length})`);
    return res.status(200).json({
      success: true,
      data: {
        hive_code: code,
        temperature: tempNum,
        humidity: humNum,
        battery: batNum,
        is_demo: Boolean(is_demo),
        alerts_triggered: alerts,
        recorded_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Telemetry error' });
  }
};

app.post('/api/sih/iot/telemetry', handleTelemetry);
app.post('/api/sih-iot-telemetry', handleTelemetry);

// ─── Proxy any other /api/* to a helpful message ──────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No local handler for ${req.method} ${req.path}` });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🍯 Bee Bridge Local API Server running at http://localhost:${PORT}`);
  console.log(`   Razorpay KEY_ID: ${RAZORPAY_KEY_ID ? RAZORPAY_KEY_ID.slice(0, 12) + '...' : '❌ MISSING'}`);
  console.log(`   Razorpay SECRET: ${RAZORPAY_KEY_SECRET ? '✅ loaded' : '❌ MISSING'}\n`);
});
