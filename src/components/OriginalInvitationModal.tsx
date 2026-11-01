import React from 'react';
import { X, Download } from 'lucide-react';

interface OriginalInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OriginalInvitationModal: React.FC<OriginalInvitationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const imagePath = '/assets/aistudio/WhatsApp_Image_2026-11-01_at_16.18.53_6c288987.jpeg';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div
        className="relative w-fit max-w-[95vw] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-[#FAF7F0] border border-[#E3DBD0]/40"
        role="dialog"
        aria-modal="true"
      >
        {/* Download Icon Button - Top Right (no text) */}
        <a
          href={imagePath}
          download="הזמנת-בת-מצווה-אורי.jpeg"
          title="הורדת ההזמנה"
          aria-label="הורדת ההזמנה"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
        >
          <Download className="w-5 h-5" />
        </a>

        {/* Close Button - Top Left */}
        <button
          type="button"
          onClick={onClose}
          title="סגירה"
          aria-label="סגירה"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Invitation Image only - hugs exact image dimensions without empty margins */}
        <img
          src={imagePath}
          alt="ההזמנה של בת המצווה של אורי"
          className="block w-auto h-auto max-h-[88vh] max-w-[92vw] sm:max-w-[85vw] object-contain mx-auto select-none"
        />
      </div>
    </div>
  );
};
