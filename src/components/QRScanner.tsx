import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  expectedValue: string;
  language: Language;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, expectedValue, language }) => {
  const t = TRANSLATIONS[language];
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        if (decodedText === expectedValue) {
          scannerRef.current?.clear();
          onScan(decodedText);
        } else {
          // Optional: handle wrong QR code
          console.log(language === 'pl' ? "Zły kod QR:" : "Wrong QR code:", decodedText);
        }
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan, expectedValue]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl border-4 border-cyan-400 bg-white shadow-xl">
      <div id="reader" className="w-full"></div>
      <div className="p-4 text-center bg-cyan-50">
        <p className="text-sm font-medium text-cyan-800">
          {t.scannerHint}
        </p>
      </div>
    </div>
  );
};
