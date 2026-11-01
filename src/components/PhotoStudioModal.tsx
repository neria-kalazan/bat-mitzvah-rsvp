import React, { useState } from 'react';
import { X, Image as ImageIcon, Sparkles, Download, Loader2, Wand2, Leaf } from 'lucide-react';
import { EventDetails } from '../types';
import { generateBatMitzvahImage } from '../services/api';

interface PhotoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
}

export const PhotoStudioModal: React.FC<PhotoStudioModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [prompt, setPrompt] = useState(
    `תמונת מזכרת אלגנטית ויוקרתית לבת המצווה של ${event.celebrantName}, פרחים לבנים עדינים, ענפי זית ואקליפטוס בירוק מרווה, נגיעות זהב עדינות ואור נרות חם ורך`
  );
  // Affordance for 1K, 2K, and 4K resolution
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      const url = await generateBatMitzvahImage(prompt, imageSize, '1:1');
      setGeneratedImageUrl(url);
    } catch (err: any) {
      console.error(err);
      setError('אירעה שגיאה');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    if (generatedImageUrl.startsWith('data:image/svg+xml')) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = imageSize === '4K' ? 2048 : imageSize === '2K' ? 1536 : 1024;
        canvas.height = canvas.width;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `bat-mitzvah-${event.celebrantName}-${imageSize}.png`;
          a.click();
        }
      };
      img.src = generatedImageUrl;
    } else {
      const a = document.createElement('a');
      a.href = generatedImageUrl;
      a.download = `bat-mitzvah-${event.celebrantName}-${imageSize}.png`;
      a.click();
    }
  };

  const templates = [
    `איור בוטני עדין עם עלי זית, פרחים לבנים וזהב מעודן לבת המצווה של ${event.celebrantName}`,
    `כרטיס ברכה יוקרתי בסגנון צבעי מים עם רקע פשתן בהיר וענפי אקליפטוס`,
    `רקע עמדת צילום אלגנטית ומוארת בנרות לאירוע בת מצווה בקרני שומרון`,
    `מזכרת מעוצבת עם מוטיב פרחוני קלאסי ונקי המוקדש לאורי ומשפחת קלזן`,
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Rubik',sans-serif]"
    >
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-[#D5E1D3] my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3B4D38] to-[#253223] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white cursor-pointer"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-[#D2DFCE]">
            <Leaf className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              סטודיו מזכרות AI
            </span>
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white font-['Rubik',sans-serif]">
            עיצוב מזכרת אישית
          </h3>
          <p className="text-[#DEE7DC] text-xs sm:text-sm mt-0.5 font-light">
            יצירת כרטיסי ברכה ומזכרות אישיות באיכות גבוהה
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-right">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Image Size Affordance Selector (1K, 2K, 4K) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              רזולוציית התמונה (Image Size Affordance):
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#F5F8F4] rounded-xl border border-[#DFE8DC]">
              {(['1K', '2K', '4K'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setImageSize(size)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    imageSize === size
                      ? 'bg-[#3B4D38] text-white shadow-xs'
                      : 'bg-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>{size}</span>
                  <span className="text-[10px] font-normal opacity-90">
                    {size === '1K'
                      ? 'סטנדרטי מהיר'
                      : size === '2K'
                      ? 'איכות גבוהה'
                      : 'אולטרה HD'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Ideas */}
          <div>
            <div className="text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-[#546A50]" />
              <span>רעיונות להשראה:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(tpl)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#EEF4EC] hover:text-[#2A3728] text-[#41533E] transition-colors border border-[#D5E1D3] cursor-pointer"
                >
                  {tpl.slice(0, 36)}...
                </button>
              ))}
            </div>
          </div>

          {/* Prompt textarea */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              תיאור התמונה שתרצו ליצור:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#3B4D38] focus:ring-2 focus:ring-[#3B4D38]/20 text-sm outline-none transition-all resize-none"
              placeholder="תארו את הסגנון הבוטני והאווירה..."
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-3 px-4 rounded-xl bg-[#3B4D38] hover:bg-[#2A3728] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>יוצר תמונת {imageSize} ב-Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D8E6D6]" />
                <span>יצירת מזכרת ברזולוציית {imageSize}</span>
              </>
            )}
          </button>

          {/* Generated Image Result */}
          {generatedImageUrl && (
            <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-[#D5E1D3] bg-[#FAF7F2] shadow-md w-fit mx-auto">
                <img
                  src={generatedImageUrl}
                  alt="מזכרת בת מצווה"
                  className="block w-auto h-auto object-contain max-h-80 mx-auto"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  נוצרה בהצלחה בגודל {imageSize}
                </span>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2E362C] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>הורדת התמונה</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
