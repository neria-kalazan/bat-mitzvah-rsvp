import React from 'react';
import { Calendar, Navigation } from 'lucide-react';
import { EventDetails } from '../types';
import { getGoogleCalendarUrl } from '../utils/calendar';

interface HeroSectionProps {
  event: EventDetails;
  onOpenInvitationImage?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  event,
}) => {
  const handleAddGoogleCalendar = () => {
    const url = getGoogleCalendarUrl(event);
    window.open(url, '_blank');
  };

  // Emblem divider component matching the invitation
  const InvitationDivider = () => (
    <div className="flex items-center justify-center gap-2.5 my-1.5 sm:my-2 text-[#8E9C8A]">
      <div className="h-[1px] w-16 sm:w-28 bg-[#D3DDD1]" />
      <svg className="w-2.5 h-2.5 fill-[#8E9C8A]" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <div className="h-[1px] w-16 sm:w-28 bg-[#D3DDD1]" />
    </div>
  );

  return (
    <section className="relative overflow-hidden pt-2 sm:pt-4 pb-4 px-3 sm:px-6">
      {/* Subtle organic ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-56 bg-gradient-to-b from-[#E7EFE5]/40 via-[#FAF7F0]/20 to-transparent blur-2xl pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto text-center">
        {/* Invitation Card styled faithfully like the original invitation */}
        <div className="relative bg-[#FAF7F0] border border-[#E3DBD0] rounded-3xl sm:rounded-[2rem] px-5 py-6 sm:px-10 sm:py-8 shadow-[0_10px_35px_-8px_rgba(58,68,55,0.08)] mb-4 sm:mb-6 overflow-hidden">
          {/* Top Botanical Arrangement - scaled down and anchored as requested */}
          <div className="absolute top-0 left-0 right-0 w-full pointer-events-none select-none z-0 flex justify-end">
            <img
              src="/assets/floral-top.png"
              alt=""
              className="w-[74%] sm:w-[64%] max-w-[400px] h-auto object-contain"
            />
          </div>

          {/* Bottom Botanical Arrangement - scaled down and anchored as requested */}
          <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none select-none z-0 flex justify-start">
            <img
              src="/assets/floral-bottom.png"
              alt=""
              className="w-[74%] sm:w-[64%] max-w-[400px] h-auto object-contain"
            />
          </div>

          {/* Card Content - lowered so opening text sits comfortably below top floral branches */}
          <div className="relative z-10 flex flex-col items-center pt-6 sm:pt-9">
            {/* 1. Opening invitation heading */}
            <p className="text-xl sm:text-2xl text-[#394537] font-medium tracking-wide mb-1 font-['Rubik',sans-serif]">
              מוזמנים לחגוג איתנו
            </p>
            <p className="text-base sm:text-lg text-[#556653] tracking-wide mb-2 sm:mb-2.5 font-normal font-['Rubik',sans-serif]">
              את בת המצווה של
            </p>

            {/* 2. Signature calligraphy for Ori with flourishes matching the invitation - scaled down gracefully */}
            <div className="my-1 sm:my-1.5 flex items-center justify-center w-full max-w-sm">
              <img
                src="/assets/ori-calligraphy.png"
                alt="אורי"
                className="h-14 sm:h-20 md:h-24 w-auto max-w-[85%] object-contain select-none filter contrast-105"
              />
            </div>

            {/* Divider 1 */}
            <InvitationDivider />

            {/* 3. Date & Time block - centered text with icon-only button to the left */}
            <div className="relative w-full max-w-sm mx-auto flex items-center justify-center min-h-[70px]">
              {/* Centered text */}
              <div className="text-center px-10">
                <div className="text-sm sm:text-base text-[#4E5C4C] font-normal font-['Rubik',sans-serif]">
                  יום רביעי, כב' כסלו
                </div>
                <div className="text-2xl sm:text-3xl font-semibold text-[#242E22] font-['Rubik',sans-serif] tracking-wide my-0.5">
                  2.12.26
                </div>
                <div className="text-sm sm:text-base text-[#4E5C4C] font-normal font-['Rubik',sans-serif]">
                  בשעה 19:00
                </div>
              </div>

              {/* Direct Add to Google Calendar button to the left (icon only) */}
              <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={handleAddGoogleCalendar}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EFF5ED] hover:bg-[#E2EDE0] active:scale-95 text-[#2F4A2C] border border-[#CCDCCD] flex items-center justify-center shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                  title="הוספה ליומן גוגל"
                  aria-label="הוספה ליומן גוגל"
                >
                  <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#3D563A]" />
                </button>
              </div>
            </div>

            {/* Divider 2 */}
            <InvitationDivider />

            {/* 4. Venue & Location block - centered text with icon-only button to the left */}
            <div className="relative w-full max-w-sm mx-auto flex items-center justify-center min-h-[56px]">
              {/* Centered text */}
              <div className="text-center px-10">
                <div className="text-base sm:text-lg font-semibold text-[#242E22] font-['Rubik',sans-serif] leading-snug">
                  {event.venueName}
                </div>
                <div className="text-sm sm:text-base text-[#4E5C4C] font-normal font-['Rubik',sans-serif] mt-0.5">
                  {event.address}
                </div>
              </div>

              {/* Direct Waze navigation button to the left (icon only) */}
              <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2">
                <a
                  href={event.wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EEF5FF] hover:bg-[#DFEDFF] active:scale-95 text-[#1B4B88] border border-[#C5DCF8] flex items-center justify-center shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                  title="ניווט ב-Waze"
                  aria-label="ניווט ב-Waze"
                >
                  <Navigation className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1B4B88]" />
                </a>
              </div>
            </div>

            {/* Divider 3 */}
            <InvitationDivider />

            {/* 5. Host closing footer */}
            <div className="text-center pt-0.5 pb-1">
              <div className="text-base sm:text-lg text-[#556453] font-normal font-['Rubik',sans-serif]">
                מחכים לכם,
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#273325] mt-0.5 font-['Rubik',sans-serif]">
                משפחת קלזן
              </div>
            </div>

            {/* 6. Dairy event note (*האירוע חלבי) - positioned at bottom-left exactly like the original invitation */}
            <div className="w-full flex justify-end text-left pt-3 sm:pt-4">
              <span className="text-xs sm:text-sm md:text-base font-bold text-[#273325] tracking-wide font-['Rubik',sans-serif] select-none">
                *האירוע חלבי
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
