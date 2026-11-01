import React from 'react';
import { Calendar, X, Globe, ExternalLink } from 'lucide-react';
import { EventDetails } from '../types';
import { getGoogleCalendarUrl } from '../utils/calendar';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
}

export const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  if (!isOpen) return null;

  const handleGoogle = () => {
    const url = getGoogleCalendarUrl(event);
    window.open(url, '_blank');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Rubik',sans-serif]"
    >
      <div
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 text-right border border-[#D5E1D3] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-500 cursor-pointer"
          aria-label="סגירה"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF5EC] text-[#435940] flex items-center justify-center border border-[#D4E2D1]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#2A3628] font-['Rubik',sans-serif]">
              הוספת האירוע ליומן
            </h3>
            <p className="text-xs text-[#5E715A]">
              בת המצווה של {event.celebrantName.includes('קלזן') ? event.celebrantName : `${event.celebrantName} קלזן`} · יום רביעי, 2.12.26
            </p>
          </div>
        </div>

        <p className="text-[#4E5E4B] text-xs sm:text-sm mb-5 leading-relaxed font-light">
          שמרו את מועד בת המצווה ביומן גוגל שלכם לקבלת תזכורת אוטומטית לפני החגיגה בקרני שומרון:
        </p>

        <div className="space-y-3">
          {/* Google Calendar Option */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full p-4 rounded-2xl border-2 border-[#DCE8DB] hover:border-emerald-600 hover:bg-[#EEF5EC]/60 transition-all flex items-center justify-between group cursor-pointer text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2D5028] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 group-hover:text-[#2D5028] transition-colors">
                  יומן Google (Google Calendar)
                </div>
                <div className="text-[11px] text-stone-500">
                  נפתח ישירות באפליקציה או בדפדפן
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-emerald-700 transition-colors" />
          </button>
        </div>

        <div className="mt-5 p-3 rounded-xl bg-[#FAF7F2] border border-[#DFE8DC] text-[11px] text-[#556952] text-center">
          כולל תזכורות אוטומטיות יום לפני ושעתיים לפני תחילת האירוע 🌿
        </div>
      </div>
    </div>
  );
};
