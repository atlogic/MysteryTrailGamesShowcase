import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Lock } from 'lucide-react';
import { Language, Checkpoint } from '../types';
import { TRANSLATIONS } from '../constants';

interface PrintPageProps {
  onBack: () => void;
  language: Language;
  checkpoints?: Checkpoint[];
  gameId?: string;
}

export const PrintPage: React.FC<PrintPageProps> = ({ onBack, language, checkpoints, gameId }) => {
  const t = TRANSLATIONS[language];
  // Generate 30 numbered QR codes
  const qrCodes = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} /> {t.back}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
          >
            <Printer size={20} /> {t.printButton}
          </button>
        </div>

        <div className="text-center mb-12 print:mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{t.printTitle} (1-30)</h1>
          <p className="text-gray-600 mt-2">{t.printDesc}</p>
        </div>

        {checkpoints && checkpoints.some(cp => cp.passcode) && (
          <div className="mb-12 p-8 bg-yellow-50 rounded-3xl border-4 border-yellow-200 break-inside-avoid">
            <h2 className="text-2xl font-black text-yellow-800 mb-4 flex items-center gap-2">
              <Lock size={24} /> {t.noPrinter}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {checkpoints.map((cp, idx) => (
                <div key={cp.id} className="bg-white p-4 rounded-xl border-2 border-yellow-100 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block">KROK {idx + 1}</span>
                    <span className="font-bold text-gray-800">{cp.name}</span>
                  </div>
                  <div className="bg-yellow-100 px-4 py-2 rounded-lg font-black text-yellow-900 text-xl tracking-widest border-2 border-yellow-200">
                    {cp.passcode || '---'}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-yellow-700 font-medium italic">
              {language === 'pl' 
                ? 'Napisz te hasła na jajkach lub karteczkach i ukryj je zamiast kodów QR.'
                : 'Write these passcodes on eggs or notes and hide them instead of QR codes.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 print:gap-4">
          {qrCodes.map((num) => (
            <div key={num} className="border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center space-y-2 break-inside-avoid shadow-sm">
              <div className="text-xl font-black text-green-600">#{num}</div>
              <div className="bg-white p-2 border border-gray-100 rounded-lg">
                <QRCodeSVG value={`egg_hunt_qr_${num}`} size={100} />
              </div>
              <div className="text-[10px] text-gray-400 font-mono">ID: {num}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 print:hidden">
          <h3 className="font-bold text-blue-800 mb-2">{language === 'pl' ? 'Instrukcja:' : 'Instructions:'}</h3>
          <p className="text-sm text-blue-700">
            {language === 'pl' 
              ? 'Aplikacja automatycznie przypisuje Twój pierwszy punkt do kodu #1, drugi do kodu #2 i tak dalej. Wydrukuj ten arkusz raz i miej zapas kodów na każdą okazję!'
              : 'The app automatically assigns your first point to code #1, second to code #2, and so on. Print this sheet once and have a supply of codes for every occasion!'}
          </p>
        </div>
      </div>
    </div>
  );
};
