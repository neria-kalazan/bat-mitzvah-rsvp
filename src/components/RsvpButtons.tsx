import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { EventDetails, RSVP } from '../types';

interface RsvpButtonsProps {
  event: EventDetails;
  onSelectFriend: () => void;
  onSelectFamily: () => void;
  hasAlreadyRSVPed?: boolean;
  primaryRsvp?: RSVP | null;
}

export const RsvpButtons: React.FC<RsvpButtonsProps> = ({
  event,
  onSelectFriend,
  onSelectFamily,
  hasAlreadyRSVPed,
  primaryRsvp,
}) => {
  return (
    <section id="rsvp-section" className="max-w-4xl mx-auto px-4 sm:px-6 mb-10 scroll-mt-16">
      <div className="text-center mb-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#273424] tracking-tight font-['Rubik',sans-serif]">
          אז איך חוגגים איתנו? ✨
        </h2>
        <p className="text-[#596B55] text-xs sm:text-sm mt-1.5 max-w-none mx-auto font-normal sm:whitespace-nowrap px-2">
          נשמח שתעדכנו אם אתם מגיעים, כדי שנוכל להתכונן ולחגוג יחד!
        </p>

        {primaryRsvp ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EEF6ED] text-[#2F612A] text-xs font-semibold rounded-full border border-[#C5E0C0] shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              אישור קיים עבור <strong className="font-bold">{primaryRsvp.name}</strong> ({primaryRsvp.attending ? (primaryRsvp.type === 'friend' ? 'מגיעה בשמחה' : `${primaryRsvp.count} מגיעים`) : 'לא מגיעים'}) — לחצו לעדכון הפרטים
            </span>
          </div>
        ) : hasAlreadyRSVPed ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF6ED] text-[#2F612A] text-xs font-semibold rounded-full border border-[#C5E0C0]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>אישור ההגעה נקלט בהצלחה! אפשר לעדכן בכל עת</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* BUTTON 1: אני חברה של אורי */}
        <button
          onClick={onSelectFriend}
          type="button"
          className="group relative text-right p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#435940] via-[#384C35] to-[#2B3B28] text-white shadow-md hover:shadow-lg hover:shadow-[#435940]/20 transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8BA886] cursor-pointer overflow-hidden border border-[#526B4E]"
        >
          {/* Subtle botanical glow */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              {/* Icon + Title together in one row */}
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform border border-white/20 shrink-0">
                  ✨
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Rubik',sans-serif]">
                  אני חברה של אורי
                </h3>
              </div>

              <p className="text-[#DEE7DC] text-xs sm:text-sm leading-relaxed font-normal pr-1">
                מעדכנת הגעה ומצטרפת לחגיגה של אורי 💚
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-white group-hover:text-[#E8F0E6] transition-colors">
                לאישור הגעה אישי
              </span>
              <div className="w-7 h-7 rounded-full bg-white text-[#384C35] flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </button>

        {/* BUTTON 2: אנחנו משפחה */}
        <button
          onClick={onSelectFamily}
          type="button"
          className="group relative text-right p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#2E362C] via-[#242C23] to-[#1A2119] text-white shadow-md hover:shadow-lg hover:shadow-black/20 transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8BA886] cursor-pointer overflow-hidden border border-[#3E4A3C]"
        >
          {/* Subtle botanical glow */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#9FB79A]/10 rounded-full blur-2xl -translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              {/* Icon + Title together in one row */}
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform border border-white/20 shrink-0">
                  🌿
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Rubik',sans-serif]">
                  אנחנו משפחה וחברים
                </h3>
              </div>

              <p className="text-[#D3DED1] text-xs sm:text-sm leading-relaxed font-normal pr-1">
                מעדכנים את מספר המגיעים מטעמנו ומחכים לחגוג יחד!
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#E3ECE1] group-hover:text-white transition-colors">
                לאישור הגעה (משפחות וחברים)
              </span>
              <div className="w-7 h-7 rounded-full bg-[#E5EFE3] text-[#242C23] flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
};
