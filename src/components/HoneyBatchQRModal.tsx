import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  ExternalLink,
  Check,
  Copy,
  ShieldCheck,
  QrCode,
  Sparkles
} from 'lucide-react';
import {
  generateQRCodeDataURL,
  generateQRCodeSVG,
  downloadQRCodeFile,
  printQRCodeLabel,
  BatchLabelInfo,
} from '../utils/qrCode';

interface HoneyBatchQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: {
    batch_code: string;
    hive_code?: string;
    variety?: string;
    extraction_date?: string;
    quality_grade?: string;
    blockchain_tx_hash?: string;
    farmer_name?: string;
    location_label?: string;
  };
}

export const HoneyBatchQRModal: React.FC<HoneyBatchQRModalProps> = ({
  isOpen,
  onClose,
  batch,
}) => {
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const verificationUrl = `${window.location.origin}/verify/${batch.batch_code}`;
  const polygonScanUrl = batch.blockchain_tx_hash
    ? `https://amoy.polygonscan.com/tx/${batch.blockchain_tx_hash}`
    : 'https://amoy.polygonscan.com';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const generateCodes = async () => {
      try {
        const [png, svg] = await Promise.all([
          generateQRCodeDataURL(verificationUrl, { width: 512, margin: 2 }),
          generateQRCodeSVG(verificationUrl, { margin: 2 }),
        ]);

        if (isMounted) {
          setPngDataUrl(png);
          setSvgString(svg);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to generate QR code', err);
        if (isMounted) setLoading(false);
      }
    };

    generateCodes();

    return () => {
      isMounted = false;
    };
  }, [isOpen, verificationUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!pngDataUrl) return;
    downloadQRCodeFile(pngDataUrl, `QR-${batch.batch_code}`, 'png');
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    downloadQRCodeFile(svgString, `QR-${batch.batch_code}`, 'svg');
  };

  const handlePrint = () => {
    if (!pngDataUrl) return;
    const labelInfo: BatchLabelInfo = {
      batchCode: batch.batch_code,
      hiveCode: batch.hive_code,
      variety: batch.variety,
      harvestDate: batch.extraction_date,
      qualityGrade: batch.quality_grade,
      farmerName: batch.farmer_name,
      sourceLocation: batch.location_label,
      blockchainTxHash: batch.blockchain_tx_hash,
    };
    printQRCodeLabel(pngDataUrl, labelInfo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl">
              🍯
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white leading-tight">
                Authenticity QR Code
              </h3>
              <p className="text-xs text-amber-100/90 font-mono">
                {batch.batch_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Trust Banner */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Cryptographically anchored on Polygon Amoy Blockchain</span>
          </div>

          {/* QR Display Card */}
          <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 p-6 flex flex-col items-center justify-center text-center">
            {loading ? (
              <div className="w-48 h-48 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-amber-400 border-t-amber-600 rounded-full animate-spin" />
                <span className="text-xs text-amber-800 font-medium">Generating High-Res QR...</span>
              </div>
            ) : (
              <div className="relative group">
                <div className="w-52 h-52 bg-white p-3.5 rounded-2xl shadow-md border border-amber-200/80 flex items-center justify-center">
                  <img
                    src={pngDataUrl}
                    alt={`QR for ${batch.batch_code}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> SIH VERIFIED
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4 max-w-xs">
              Direct verification link encoded into QR code for instant honey jar verification.
            </p>
          </div>

          {/* Verification URL Input with Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Verification URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verificationUrl}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleDownloadPNG}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Download PNG
            </button>
            <button
              onClick={handleDownloadSVG}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              Download SVG
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              Print Label
            </button>
            <a
              href={polygonScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
              View Blockchain
            </a>
          </div>

          {/* Public Verification Link */}
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-md shadow-amber-500/20"
          >
            <span>Open Public Verification Page</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
