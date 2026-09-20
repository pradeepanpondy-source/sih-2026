import QRCode from 'qrcode';

export interface BatchLabelInfo {
  batchCode: string;
  hiveCode?: string;
  variety?: string;
  harvestDate?: string;
  qualityGrade?: string;
  farmerName?: string;
  sourceLocation?: string;
  blockchainTxHash?: string;
}

/**
 * Generate high-resolution PNG Data URL for a verification link
 */
export async function generateQRCodeDataURL(
  text: string,
  options: { width?: number; margin?: number; darkColor?: string; lightColor?: string } = {}
): Promise<string> {
  const {
    width = 400,
    margin = 2,
    darkColor = '#1F160E', // Honey dark tone
    lightColor = '#FFFFFF',
  } = options;

  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate scalable SVG string for a verification link
 */
export async function generateQRCodeSVG(
  text: string,
  options: { margin?: number; darkColor?: string; lightColor?: string } = {}
): Promise<string> {
  const {
    margin = 2,
    darkColor = '#1F160E',
    lightColor = '#FFFFFF',
  } = options;

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Download QR Code as PNG or SVG
 */
export function downloadQRCodeFile(
  data: string,
  filename: string,
  type: 'png' | 'svg'
): void {
  const link = document.createElement('a');

  if (type === 'svg') {
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.svg`;
  } else {
    link.href = data;
    link.download = `${filename}.png`;
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convenience download helper by batchCode
 */
export async function downloadQRCode(
  batchCode: string,
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://beebridge.vercel.app';
  const url = `${origin}/verify/${batchCode}`;
  if (format === 'svg') {
    const svg = await generateQRCodeSVG(url);
    downloadQRCodeFile(svg, `honey-batch-${batchCode}`, 'svg');
  } else {
    const png = await generateQRCodeDataURL(url, { width: 500 });
    downloadQRCodeFile(png, `honey-batch-${batchCode}`, 'png');
  }
}

/**
 * Convenience print helper by BatchLabelInfo
 */
export async function printHoneyJarLabel(info: BatchLabelInfo): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://beebridge.vercel.app';
  const url = `${origin}/verify/${info.batchCode}`;
  const qrDataUrl = await generateQRCodeDataURL(url, { width: 400 });
  printQRCodeLabel(qrDataUrl, info);
}

/**
 * Print Honey Batch authenticity label with QR code
 */
export function printQRCodeLabel(
  qrDataUrl: string,
  info: BatchLabelInfo
): void {
  const printWindow = window.open('', '_blank', 'width=650,height=750');
  if (!printWindow) {
    alert('Please allow popups to print the authenticity label.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bee Bridge Authenticity Label - ${info.batchCode}</title>
        <style>
          @page {
            size: 4in 4in;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f9fafb;
            padding: 16px;
          }
          .label-card {
            width: 360px;
            background: #ffffff;
            border: 2px solid #D97706;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-bottom: 8px;
          }
          .brand {
            font-size: 20px;
            font-weight: 900;
            color: #D97706;
            letter-spacing: -0.5px;
          }
          .brand span {
            color: #1F2937;
          }
          .badge {
            display: inline-block;
            background: #ECFDF5;
            color: #065F46;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 9999px;
            border: 1px solid #A7F3D0;
            margin-bottom: 12px;
          }
          .qr-wrapper {
            margin: 10px auto;
            width: 170px;
            height: 170px;
            background: #ffffff;
            padding: 8px;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .batch-id {
            font-family: monospace;
            font-size: 15px;
            font-weight: 800;
            color: #111827;
            margin-top: 8px;
          }
          .scan-note {
            font-size: 11px;
            color: #6B7280;
            margin-top: 4px;
            margin-bottom: 12px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            text-align: left;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            padding: 10px;
            border-radius: 8px;
            font-size: 10px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            color: #9CA3AF;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
          }
          .meta-val {
            color: #1F2937;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .footer-bar {
            margin-top: 14px;
            font-size: 9px;
            color: #9CA3AF;
            border-top: 1px dashed #E5E7EB;
            padding-top: 8px;
          }
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .label-card {
              box-shadow: none;
              border: 1.5px solid #000;
              margin: 0 auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-card">
          <div class="header">
            <span style="font-size: 22px;">🐝</span>
            <span class="brand">Bee<span>Bridge</span></span>
          </div>
          <div class="badge">🛡️ Blockchain Verified Honey</div>

          <div class="qr-wrapper">
            <img src="${qrDataUrl}" alt="Batch QR Code" />
          </div>

          <div class="batch-id">${info.batchCode}</div>
          <div class="scan-note">Scan to verify authenticity & farm origin</div>

          <div class="details-grid">
            <div class="meta-item">
              <span class="meta-label">Hive ID</span>
              <span class="meta-val">${info.hiveCode || 'HIVE-000001'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Variety</span>
              <span class="meta-val">${info.variety || 'Raw Wild Forest'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Harvest Date</span>
              <span class="meta-val">${info.harvestDate || '2026-09'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Grade</span>
              <span class="meta-val">${info.qualityGrade || 'Grade A'}</span>
            </div>
          </div>

          <div class="footer-bar">
            Polygon Amoy Blockchain · Smart Contract Traceability · beebridge.vercel.app
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
