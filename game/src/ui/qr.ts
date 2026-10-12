import { renderSVG } from 'uqr';

export interface QrOptions {
  ecc?: 'L' | 'M' | 'Q' | 'H';
  border?: number;
  blackColor?: string;
  whiteColor?: string;
}

/**
 * Generates an SVG string representation of a QR code for the given text.
 * Uses high-contrast forest ink (#1d3319) by default to match the Quoridors design theme.
 */
export function generateQrSvg(text: string, options?: QrOptions): string {
  if (!text) return '';
  const ecc = options?.ecc ?? 'M';
  const border = options?.border ?? 2;
  const blackColor = options?.blackColor ?? '#1d3319';
  const whiteColor = options?.whiteColor ?? '#ffffff';

  return renderSVG(text, {
    ecc,
    border,
    blackColor,
    whiteColor,
  });
}

/**
 * Initiates browser download of the QR code as an SVG vector file.
 */
export function downloadQrSvg(svgContent: string, filename = 'quoridor-invite-qr.svg'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Renders the SVG QR code onto a canvas and triggers a PNG download.
 */
export async function downloadQrPng(
  svgContent: string,
  filename = 'quoridor-invite-qr.png',
  size = 600,
): Promise<void> {
  if (typeof document === 'undefined') return;

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
            resolve();
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}
