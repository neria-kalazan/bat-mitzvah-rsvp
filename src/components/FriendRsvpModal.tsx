import React, { useState, useEffect } from 'react';
import { X, Heart, Check, Wand2, Leaf, Music, UserCheck, UserPlus } from 'lucide-react';
import { RSVP, EventDetails } from '../types';

interface FriendRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetails;
  onSubmit: (rsvpData: Partial<RSVP>) => Promise<void>;
  initialData?: RSVP | null;
}

export const FriendRsvpModal: React.FC<FriendRsvpModalProps> = ({
  isOpen,
  onClose,
  event,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState(true);
  const [songRequest, setSongRequest] = useState('');
  const [wishingMessage, setWishingMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.type === 'friend') {
        setName(initialData.name || '');
        setAttending(initialData.attending !== undefined ? initialData.attending : true);
        setSongRequest(initialData.songRequest || '');
        setWishingMessage(initialData.wishingMessage || '');
        setEditingId(initialData.id || null);
      } else {
        setName('');
        setAttending(true);
        setSongRequest('');
        setWishingMessage('');
        setEditingId(null);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleStartNewFriend = () => {
    setName('');
    setAttending(true);
    setSongRequest('');
    setWishingMessage('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('אנא כתבי את שמך');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        id: editingId || undefined,
        type: 'friend',
        name: name.trim(),
        count: attending ? 1 : 0,
        attending,
        songRequest: songRequest.trim() || undefined,
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
      `לאורי המקסימה והיקרה! המון מזל טוב לבת המצווה! מאחלת לך שפע של בריאות, שמחה, הצלחה והגשמת כל המשאלות. כל כך שמחה לחגוג איתך! 🌿`,
      `אורי אהובה, מזל טוב ענק לגיל מצוות! שתמשיכי להאיר בחיוך שלך, להצליח בכל מה שאת עושה ותמיד תהיי מוקפת באהבה ובחברות טובות. מחכה לחגוג איתך!`,
      `מזל טוב מכל הלב לאורי היקרה! שתזכי לשנה נפלאה של התחלות חדשות, חוויות טובות והמון רגעים משמחים. נתראה בשמחה בקרני שומרון! ✨`,
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
        <div className="bg-gradient-to-r from-[#4A5D47] to-[#344432] p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white cursor-pointer"
            aria-label="סגירה"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-[#D5E2D2]">
            <Leaf className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">
              אישור הגעה לחברות
            </span>
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white font-['Rubik',sans-serif]">
            שלום חברה של {event.celebrantName}
          </h3>
          <p className="text-[#DEE7DC] text-xs sm:text-sm mt-0.5 font-normal">
            רשמי את שמך, שיר שתרצי שיושמע וברכה לאורי:
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
                onClick={handleStartNewFriend}
                className="inline-flex items-center gap-1 text-[#3E553A] font-bold hover:underline cursor-pointer text-[11px]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>ממלאת עבור חברה נוספת?</span>
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
                  ? 'bg-[#435940] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ✓ מאשרת הגעה בשמחה
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
              לצערי לא אוכל להגיע
            </button>
          </div>

          {/* Friend Name (Only name!) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              השם שלך <span className="text-[#435940]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: תמר שרון"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#435940] focus:ring-2 focus:ring-[#435940]/20 text-sm outline-none transition-all"
            />
          </div>

          {/* Song Request (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#546A50]" />
                <span>שיר שתרצי שיושמע ברחבה 🎶</span>
              </label>
              <span className="text-[11px] text-stone-400 font-normal">אופציונלי</span>
            </div>
            <input
              type="text"
              value={songRequest}
              onChange={(e) => setSongRequest(e.target.value)}
              placeholder="שם השיר או הזמר/ת שירקידו אותנו..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#435940] focus:ring-2 focus:ring-[#435940]/20 text-sm outline-none transition-all placeholder:text-stone-400"
            />
          </div>

          {/* Wishing Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-[#5A7156]" />
                <span>ברכה אישית לאורי</span>
              </label>
              <button
                type="button"
                onClick={generateQuickWish}
                className="text-[11px] font-semibold text-[#485E45] hover:text-[#2E3C2C] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Wand2 className="w-3 h-3" />
                <span>הצעת ברכה</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={wishingMessage}
              onChange={(e) => setWishingMessage(e.target.value)}
              placeholder="כתבי כמה מילים חמות לכלת הבת מצווה..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#435940] focus:ring-2 focus:ring-[#435940]/20 text-sm outline-none transition-all resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#435940] hover:bg-[#344732] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>שומרת אישור...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {editingId
                      ? 'עדכון אישור הגעה'
                      : attending
                      ? 'מאשרת הגעה'
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
