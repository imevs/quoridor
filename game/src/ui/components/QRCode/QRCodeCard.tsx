import { useMemo } from 'preact/hooks';
import styles from './QRCodeCard.module.css';
import { generateQrSvg } from '../../qr';

export interface QRCodeCardProps {
  link: string;
}

export function QRCodeCard({ link }: QRCodeCardProps) {
  const svgContent = useMemo(() => {
    return generateQrSvg(link, { ecc: 'M', border: 2 });
  }, [link]);

  if (!link) return null;

  return (
    <div class={styles.card} role="region" aria-label="QR Code invitation">
      <div class={styles.qrFrame}>
        <div
          class={styles.qrSvgHolder}
          role="img"
          aria-label={`QR Code to join game via ${link}`}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}
