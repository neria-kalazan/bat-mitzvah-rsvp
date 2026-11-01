import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Calendar, Eye, Image as ImageIcon, X, CheckCircle2, Heart } from 'lucide-react';
import { RSVP, EventDetails } from '../types';
import { getGoogleCalendarUrl } from '../utils/calendar';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  rsvp: RSVP | null;
  event: EventDetails;
  onOpenInvitationImage?: () => void;
  onOpenPhotoStudio?: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  rsvp,
  event,
  onOpenInvitationImage,
  onOpenPhotoStudio,
}) => {
  useEffect(() => {
    if (isOpen && rsvp?.attending) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4A5D47', '#738C70', '#C2A676', '#DDE7DC', '#303B2E'],
        });
      } catch (e) {
        // Fallback if confetti fails
      }
    }
  }, [isOpen, rsvp?.attending]);

  if (!isOpen || !rsvp) return null;

  const handleGoogleCalendar = () => {
    const url = getGoogleCalendarUrl(event);
    window.open(url, '_blank');
  };

  const isAttending = rsvp.attending;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Rubik',sans-serif]"
    >
      <div
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 text-center border border-[#D5E1D3] animate-in fade-in zoom-in-95 duration-200"
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

        {isAttending ? (
          /* Case 1: Attending (מאשרים הגעה) */
          <>
            <div className="w-14 h-14 rounded-full bg-[#EEF5EC] text-[#435940] flex items-center justify-center mx-auto mb-3 shadow-inner border border-[#D4E2D1]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-[#2A3628] mb-1 font-['Rubik',sans-serif]">
              {rsvp.isUpdated ? 'אישור ההגעה עודכן בהצלחה' : 'אישור ההגעה נקלט בהצלחה'}
            </h3>

            <p className="text-[#596C55] text-xs sm:text-sm mb-4">
              תודה רבה <span className="font-bold text-[#2A3628]">{rsvp.name}</span>! מחכים לשמוח איתכם.
            </p>

            {/* Summary Card */}
            <div className="bg-[#FAF7F2] border border-[#DFE8DC] rounded-2xl p-4 text-right mb-5 text-xs space-y-1.5 font-['Rubik',sans-serif]">
              <div className="flex justify-between text-stone-600">
                <span>סוג אישור:</span>
                <span className="font-semibold text-[#3E523A]">
                  {rsvp.type === 'friend' ? 'חברה של ' + event.celebrantName : 'משפחה'}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>כמות מגיעים:</span>
                <span className="font-bold text-[#2A3628]">
                  {rsvp.type === 'friend' ? '1 מגיעה' : `${rsvp.count} מגיעים`}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>תאריך ושעה:</span>
                <span className="font-medium text-stone-900">יום רביעי, 2.12.26 בשעה {event.time}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>מיקום:</span>
                <span className="font-medium text-stone-900">{event.venueName}, {event.address}</span>
              </div>
            </div>

            {/* Action buttons: Calendar, Invitation, Souvenir in one row */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={handleGoogleCalendar}
                className="py-2.5 px-2 rounded-xl bg-[#EEF5FF] hover:bg-[#E0EEFF] text-[#245899] text-xs font-semibold border border-[#D0E2FA] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="הוספה ליומן Google"
              >
                <Calendar className="w-3.5 h-3.5 text-[#245899] shrink-0" />
                <span className="whitespace-nowrap">יומן</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenInvitationImage) onOpenInvitationImage();
                }}
                className="py-2.5 px-2 rounded-xl bg-[#F0F5EE] hover:bg-[#E3EDE0] text-[#3B4D38] text-xs font-semibold border border-[#D5E1D3] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="צפייה בהזמנה"
              >
                <Eye className="w-3.5 h-3.5 text-[#546A50] shrink-0" />
                <span className="whitespace-nowrap">הזמנה</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenPhotoStudio) onOpenPhotoStudio();
                }}
                className="py-2.5 px-2 rounded-xl bg-[#FBF7F0] hover:bg-[#F3EFE4] text-[#5C4F35] text-xs font-semibold border border-[#E8DFC9] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="עיצוב מזכרת"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#736343] shrink-0" />
                <span className="whitespace-nowrap">מזכרת</span>
              </button>
            </div>
          </>
        ) : (
          /* Case 2: Not Attending (לא אוכל להגיע) */
          <>
            <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#63765F] flex items-center justify-center mx-auto mb-3 shadow-inner border border-[#DFE8DC]">
              <Heart className="w-7 h-7 text-[#6B8067]" />
            </div>

            <h3 className="text-2xl font-bold text-[#2A3628] mb-1 font-['Rubik',sans-serif]">
              תודה על העדכון
            </h3>

            <p className="text-[#4E5E4A] text-sm mb-4 leading-relaxed font-normal">
              חבל שלא תוכלו להגיע, נשמח מאוד לחגוג יחד בשמחות הבאות! 🌿
            </p>

            <div className="bg-[#FAF7F2] border border-[#DFE8DC] rounded-2xl p-4 text-right mb-5 text-xs space-y-2 font-['Rubik',sans-serif]">
              <div className="text-stone-700">
                הודעת העדכון של <span className="font-bold text-[#2A3628]">{rsvp.name}</span> נמסרה למשפחה.
              </div>

              {rsvp.wishingMessage && (
                <div className="pt-2 border-t border-[#DFE8DC]">
                  <span className="text-[11px] text-[#63765F] block font-medium mb-0.5">הברכה שמסרתם לאורי:</span>
                  <p className="italic text-stone-800 font-normal">"{rsvp.wishingMessage}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenInvitationImage) onOpenInvitationImage();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#F0F5EE] hover:bg-[#E3EDE0] text-[#3B4D38] text-xs font-semibold border border-[#D5E1D3] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#546A50]" />
                <span>צפייה בהזמנה</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#2F372D] hover:bg-[#1E251D] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                סגירה
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
