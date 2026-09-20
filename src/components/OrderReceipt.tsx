import React, { useRef, useState, useEffect } from 'react';
import {
  CheckCircle, Package, Truck, Mail, Phone,
  MapPin, Calendar, Download, Printer, Send,
  ArrowLeft, ShieldCheck, QrCode, ExternalLink
} from 'lucide-react';
import { generateQRCodeDataURL } from '../utils/qrCode';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  batch_id?: string;
}

export interface ReceiptData {
  receiptNumber: string;
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  tax: number;
  shippingCharge: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  estimatedDelivery?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  honeyBatchId?: string;
  honeyBatchCode?: string;
}

interface OrderReceiptProps {
  data: ReceiptData;
  onClose?: () => void;
  onEmailResend?: () => void;
  emailSending?: boolean;
}

/** Format currency in INR */
const inr = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);

/** Status badge style */
const statusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'paid')    return 'bg-green-100 text-green-700';
  if (s === 'shipped')                       return 'bg-blue-100 text-blue-700';
  if (s === 'processing')                    return 'bg-amber-100 text-amber-700';
  if (s === 'cancelled' || s === 'failed')   return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600'; // pending
};

const OrderReceipt: React.FC<OrderReceiptProps> = ({
  data, onClose, onEmailResend, emailSending
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const batchCode = data.honeyBatchCode || data.honeyBatchId || 'HB-2026-000001';

  useEffect(() => {
    let isMounted = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://beebridge.vercel.app';
    const verifyUrl = `${origin}/verify/${batchCode}`;

    generateQRCodeDataURL(verifyUrl, { width: 300, margin: 1 })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('Error generating receipt QR code', err));

    return () => {
      isMounted = false;
    };
  }, [batchCode]);

  // ── Print / PDF ────────────────────────────────────────────
  const handlePrint = () => {
    // Inject print-specific stylesheet to isolate the receipt on A4
    const printStyle = `
      @media print {
        body * { visibility: hidden !important; }
        #bee-receipt, #bee-receipt * { visibility: visible !important; }
        #bee-receipt {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          padding: 24px !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print { display: none !important; }
        @page { size: A4; margin: 16mm; }
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = printStyle;
    styleEl.id = 'receipt-print-style';
    document.head.appendChild(styleEl);
    window.print();
    // Cleanup after print dialog closes
    setTimeout(() => {
      const el = document.getElementById('receipt-print-style');
      if (el) el.remove();
    }, 1000);
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Action bar — hidden on print */}
      <div className="no-print max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onEmailResend && (
            <button
              onClick={onEmailResend}
              disabled={emailSending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {emailSending ? 'Sending…' : 'Email Receipt'}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-honeybee-secondary text-white hover:bg-black transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Receipt Card ─────────────────────────────────────── */}
      <div
        id="bee-receipt"
        ref={receiptRef}
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-honeybee-secondary px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-black text-honeybee-primary">Bee</span>
              <span className="text-2xl font-black text-white">Bridge</span>
            </div>
            <p className="text-white/50 text-xs">Farm-to-Home Honey Marketplace</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-0.5">Receipt</p>
            <p className="text-white font-black text-xl">#{data.receiptNumber}</p>
            <p className="text-white/50 text-xs mt-0.5">{today}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-green-50 border-b border-green-100 px-8 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-semibold">
            Order confirmed! Thank you for shopping with Bee Bridge.
          </p>
        </div>

        <div className="px-6 md:px-8 py-7 space-y-7">

          {/* Meta grid: Order / Payment / Delivery */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
              <p className="text-honeybee-secondary font-bold text-sm break-all">{data.orderId}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Date</p>
              <p className="text-honeybee-secondary font-bold text-sm">{data.orderDate}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 col-span-2 md:col-span-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusStyle(data.orderStatus)}`}>
                {data.orderStatus}
              </span>
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Customer Details</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="font-semibold w-16 flex-shrink-0 text-gray-500">Name</span>
                  <span className="font-bold text-honeybee-secondary">{data.customerName || '—'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="break-all">{data.customerEmail}</span>
                </div>
                {data.customerPhone && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{data.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Shipping Address</h3>
              {data.shippingAddress ? (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{data.shippingAddress}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Not provided</p>
              )}
              {data.estimatedDelivery && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Calendar className="w-4 h-4 text-honeybee-primary flex-shrink-0" />
                  <span className="text-gray-600">
                    Estimated delivery: <strong className="text-honeybee-secondary">{data.estimatedDelivery}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Items Ordered
            </h3>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left px-4 py-3 font-semibold text-xs">Product</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Unit Price</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((item, i) => (
                    <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-honeybee-secondary">{item.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{inr(item.price)}</td>
                      <td className="px-4 py-3 text-right font-bold text-honeybee-secondary">
                        {inr(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-2.5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Summary</h3>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold">{inr(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount {data.couponCode ? `(${data.couponCode})` : ''}</span>
                <span className="font-semibold">−{inr(data.discount)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST / Tax</span>
                <span className="font-semibold">{inr(data.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span className="font-semibold">
                {data.shippingCharge === 0 ? (
                  <span className="text-green-600 font-bold">FREE</span>
                ) : inr(data.shippingCharge)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-2.5 flex justify-between items-center">
              <span className="font-black text-honeybee-secondary text-base">Grand Total</span>
              <span className="font-black text-honeybee-primary text-xl">{inr(data.grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
              <p className="text-honeybee-secondary font-bold text-sm capitalize">{data.paymentMethod}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusStyle(data.paymentStatus)}`}>
                {data.paymentStatus}
              </span>
            </div>
          </div>

          {/* Razorpay Transaction IDs */}
          {(data.razorpayPaymentId || data.razorpayOrderId) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.razorpayPaymentId && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Razorpay Payment ID</p>
                  <p className="text-honeybee-secondary font-mono text-xs break-all">{data.razorpayPaymentId}</p>
                </div>
              )}
              {data.razorpayOrderId && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Razorpay Order ID</p>
                  <p className="text-honeybee-secondary font-mono text-xs break-all">{data.razorpayOrderId}</p>
                </div>
              )}
            </div>
          )}

          {/* ── HoneyChain Blockchain Authenticity & Traceability ──── */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/70 border-2 border-amber-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/60">
                <span>🛡️ Blockchain Authenticity Verified</span>
              </div>
              <h4 className="text-sm font-black text-gray-900">
                Honey Batch ID: <span className="font-mono text-amber-800">{batchCode}</span>
              </h4>
              <p className="text-xs text-gray-600 max-w-sm leading-relaxed">
                Every honey jar from Bee Bridge is harvested by government-verified beekeepers and anchored to Polygon Amoy Blockchain.
              </p>
              <div className="pt-0.5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <a
                  href={`/verify/${batchCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                >
                  <span>Verify online: /verify/{batchCode}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center flex-shrink-0 bg-white p-3 rounded-2xl border border-amber-200/90 shadow-sm text-center">
              <div className="w-24 h-24 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${batchCode}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin" />
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-600 mt-1 max-w-[120px] leading-tight">
                Scan to verify authenticity.
              </span>
            </div>
          </div>

          {/* Delivery banner */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <Truck className="w-5 h-5 text-honeybee-primary flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Your order is being prepared for dispatch. You will receive a shipping confirmation by email.
            </p>
          </div>

          {/* Trust / Support */}
          <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-700 mb-0.5">Return Policy</p>
                <p>7-day hassle-free returns for quality issues. Contact support within 7 days of delivery.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-honeybee-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-700 mb-0.5">Customer Support</p>
                <p>support@beebridge.vercel.app<br />Mon–Sat, 9 AM – 6 PM IST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-honeybee-secondary px-8 py-5 text-center">
          <p className="text-white font-bold text-base mb-0.5">🐝 Thank you for choosing Bee Bridge!</p>
          <p className="text-white/50 text-xs">Pure honey. Verified farmers. Delivered to your door.</p>
          <p className="text-white/30 text-[10px] mt-2">
            © {new Date().getFullYear()} Bee Bridge · beebridge.vercel.app ·
            This is a computer-generated receipt and requires no signature.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderReceipt;
