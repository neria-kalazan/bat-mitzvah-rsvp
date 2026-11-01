import React, { useState, useEffect } from 'react';
import { X, Users, Minus, Plus, Heart, Check, Wand2, Leaf, UserCheck, UserPlus } from 'lucide-react';
import { RSVP, EventDetails } from '../types';

interface FamilyRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
  onSubmit: (rsvpData: Partial<RSVP>) => Promise<void>;
  initialData?: RSVP | null;
}

export const FamilyRsvpModal: React.FC<FamilyRsvpModalProps> = ({
  isOpen,
  onClose,
  event,
  onSubmit,
  initialData,
}) => {
  const [fullName, setFullName] = useState('');
  const [count, setCount] = useState<number>(3);
  const [attending, setAttending] = useState(true);
  const [wishingMessage, setWishingMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.type === 'family') {
        setFullName(initialData.name || '');
        setCount(initialData.count && initialData.count > 0 ? initialData.count : 3);
        setAttending(initialData.attending !== undefined ? initialData.attending : true);
        setWishingMessage(initialData.wishingMessage || '');
        setEditingId(initialData.id || null);
      } else {
        setFullName('');
        setCount(3);
        setAttending(true);
        setWishingMessage('');
        setEditingId(null);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleStartNewFamily = () => {
    setFullName('');
    setCount(3);
    setAttending(true);
    setWishingMessage('');
    setEditingId(null);
  };

  const handleIncrement = () => {
    setCount((prev) => Math.min(20, prev + 1));
  };

  const handleDecrement = () => {
    setCount((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('אנא רשמו את שמכם');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        id: editingId || undefined,
        type: 'family',
        name: fullName.trim(),
        count: attending ? count : 0,
        attending,
        wishingMessage: wishingMessage.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'חלה שגיאה בשמירת אישור ההגעה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateQuickWish = () => {
    const wishes = [
      `לאורי היקרה ולמשפחת קלזן המקסימה, מזל טוב ענק לרגל הגיעה של אורי לגיל מצוות! שתזכו לרוות ממנה נחת ושמחה, בריאות והצלחה בכל מעשיה. מחכים מאוד לחגוג איתכם בקרני שומרון! 🌿`,
      `ברכות חמות מעומק הלב לרגל בת המצווה של אורי! שתמשיך לצמוח, לשמוח ולהסב גאווה רבה לכל המשפחה. נתראה בשמחה!`,
      `למשפחת קלזן היקרה, מזל טוב ושפע ברכות בהגיע אורי לבת מצווה! שתזכו לגדלה לחופה ולמעשים טובים מתוך שפע ואושר. ✨`,
    ];
    const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
    setWishingMessage(randomWish);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Rubik',sans-serif]"
    >
      <div
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#D5E1D3] my-6 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2F372D] to-[#1E251D] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white cursor-pointer"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-[#D2DFCE]">
            <Leaf className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">
              אישור הגעה למשפחה וחברים
            </span>
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white font-['Rubik',sans-serif]">
            שלום משפחה וחברים יקרים
          </h3>
          <p className="text-[#DEE7DC] text-xs sm:text-sm mt-0.5 font-normal">
            רשמו את שמכם וכמה תגיעו:
          </p>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-right">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Active smart identity banner if editing existing RSVP */}
          {editingId && (
            <div className="bg-[#F0F6EF] border border-[#CCDCCD] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#2B3B28]">
                <UserCheck className="w-4 h-4 text-[#3E553A] shrink-0" />
                <span>
                  אישור קיים עבור <strong className="font-bold">{initialData?.name}</strong> (מצב עדכון)
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartNewFamily}
                className="inline-flex items-center gap-1 text-[#3E553A] font-bold hover:underline cursor-pointer text-[11px]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>רושמים עבור משפחה נוספת?</span>
              </button>
            </div>
          )}

          {/* Attending Toggle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-[#F5F8F4] rounded-xl border border-[#DFE8DC]">
            <button
              type="button"
              onClick={() => setAttending(true)}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                attending
                  ? 'bg-[#2F372D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ✓ מאשרים הגעה בשמחה
            </button>
            <button
              type="button"
              onClick={() => setAttending(false)}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                !attending
                  ? 'bg-stone-300 text-stone-800 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              לצערנו לא נוכל להגיע
            </button>
          </div>

          {/* Unified Name field (single field!) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              שם המשפחה / שמות המגיעים <span className="text-[#384A35]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="למשל: משפחת כהן / דוד ומיכל"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#384A35] focus:ring-2 focus:ring-[#384A35]/20 text-sm outline-none transition-all"
            />
          </div>

          {/* Head count (How many are attending) */}
          {attending && (
            <div className="bg-[#FAF7F2] border border-[#DFE8DC] rounded-2xl p-4">
              <label className="block text-xs font-bold text-[#2A3628] mb-2">
                כמה תגיעו? <span className="text-[#384A35]">*</span>
              </label>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-10 h-10 rounded-xl bg-white border border-[#CBD8C9] hover:bg-[#EEF4EC] flex items-center justify-center text-[#2A3628] font-bold transition-colors cursor-pointer"
                    aria-label="הפחתת מספר"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-14 text-center">
                    <span className="text-2xl font-bold text-[#222B20] tabular-nums font-['Rubik',sans-serif]">
                      {count}
                    </span>
                    <span className="block text-[11px] text-[#556952] font-normal">
                      {count === 1 ? 'אורח 1' : `${count} אורחים`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-10 h-10 rounded-xl bg-white border border-[#CBD8C9] hover:bg-[#EEF4EC] flex items-center justify-center text-[#2A3628] font-bold transition-colors cursor-pointer"
                    aria-label="הוספת מספר"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick selector buttons */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCount(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        count === num
                          ? 'bg-[#2F372D] text-white'
                          : 'bg-white border border-[#CBD8C9] text-[#2A3628] hover:bg-[#EEF4EC]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Family Blessing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-[#5A7156]" />
                <span>ברכה מכל המשפחה</span>
              </label>
              <button
                type="button"
                onClick={generateQuickWish}
                className="text-[11px] font-semibold text-[#3E523A] hover:text-[#253323] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Wand2 className="w-3 h-3" />
                <span>הצעת ברכה</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={wishingMessage}
              onChange={(e) => setWishingMessage(e.target.value)}
              placeholder="איחולים לבביים לאורי ולמשפחת קלזן..."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:border-[#384A35] focus:ring-2 focus:ring-[#384A35]/20 text-sm outline-none transition-all resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#2F372D] hover:bg-[#1E251D] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>שומרים אישור...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {editingId
                      ? `עדכון אישור הגעה (${count === 1 ? 'אורח 1' : `${count} אורחים`})`
                      : attending
                      ? `אישור הגעה (${count === 1 ? 'אורח 1' : `${count} אורחים`})`
                      : 'שליחת עדכון'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
