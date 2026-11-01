import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Music, Leaf } from 'lucide-react';
import { RSVP, EventDetails } from '../types';

interface WishesWallProps {
  rsvps: RSVP[];
  event: EventDetails;
}

export const WishesWall: React.FC<WishesWallProps> = ({ rsvps, event }) => {
  // Only guests who wrote a blessing will appear in the guestbook
  const wishes = rsvps.filter(
    (r) => typeof r.wishingMessage === 'string' && r.wishingMessage.trim().length > 0
  );

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [slideIndex, setSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Monitor screen width (desktop: 2 items, mobile: 1 item)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 1 : 2;
  const canSlide = wishes.length > itemsPerPage;

  // Duplicate items at the end to create seamless infinite loop
  const slides = canSlide ? [...wishes, ...wishes.slice(0, itemsPerPage)] : wishes;

  // Reset index if out of bounds on resize
  useEffect(() => {
    setSlideIndex((prev) => (prev >= wishes.length ? 0 : prev));
  }, [itemsPerPage, wishes.length]);

  const handleNext = useCallback(() => {
    if (!canSlide) return;
    setIsTransitioning(true);
    setSlideIndex((prev) => prev + 1);
  }, [canSlide]);

  const handlePrev = useCallback(() => {
    if (!canSlide) return;
    setIsTransitioning(true);
    setSlideIndex((prev) => {
      if (prev <= 0) {
        return wishes.length - 1;
      }
      return prev - 1;
    });
  }, [canSlide, wishes.length]);

  const handleDotClick = (index: number) => {
    setIsTransitioning(true);
    setSlideIndex(index);
  };

  // Seamless reset at the end of infinite loop
  const handleTransitionEnd = () => {
    if (slideIndex >= wishes.length) {
      setIsTransitioning(false);
      setSlideIndex(0);
    }
  };

  // Autoplay timer: auto-advances every 2.8 seconds (2-3 seconds as requested)
  useEffect(() => {
    if (!canSlide || isPaused) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setSlideIndex((prev) => prev + 1);
    }, 2800);

    return () => clearInterval(timer);
  }, [canSlide, isPaused, wishes.length]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left (in RTL: advance forward)
        handleNext();
      } else {
        // Swiped right (in RTL: go backward)
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  if (wishes.length === 0) return null;

  const activeDotIndex = slideIndex % wishes.length;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-14 font-['Rubik',sans-serif]">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#485E45] bg-[#EAF1E8] px-3.5 py-1 rounded-full border border-[#CFDEC9] mb-1.5">
          <Leaf className="w-3.5 h-3.5 text-[#546A50]" />
          <span>ספר האורחים</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#273424] tracking-tight">
          איחולים וברכות ל{event.celebrantName}
        </h2>
        <p className="text-[#596B55] text-xs sm:text-sm mt-0.5 font-normal">
          הברכות החמות שהשארתם לכבודה של כלת הבת מצווה
        </p>
      </div>

      {/* Carousel Container */}
      <div
        className="relative group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Navigation Arrows (Visible if carousel can slide) */}
        {canSlide && (
          <>
            {/* Prev Button (Right side in RTL) */}
            <button
              type="button"
              onClick={handlePrev}
              title="הברכה הקודמת"
              aria-label="הברכה הקודמת"
              className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-[#EEF5EC] text-[#2F402C] border border-[#CCD8CA] shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Next Button (Left side in RTL) */}
            <button
              type="button"
              onClick={handleNext}
              title="הברכה הבאה"
              aria-label="הברכה הבאה"
              className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-[#EEF5EC] text-[#2F402C] border border-[#CCD8CA] shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Carousel Window */}
        <div
          className="overflow-hidden w-full py-1.5 px-0.5"
          dir="ltr"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`flex items-stretch ${
              isTransitioning ? 'transition-transform duration-500 ease-out' : ''
            }`}
            style={{
              transform: `translateX(-${slideIndex * (100 / itemsPerPage)}%)`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="w-full md:w-1/2 shrink-0 px-2 sm:px-2.5 flex"
              >
                {/* Wish Card */}
                <div
                  dir="rtl"
                  className="w-full bg-white/95 border border-[#E3EDE1] rounded-2xl p-4 sm:p-5 shadow-xs text-right relative flex flex-col justify-between hover:border-[#CBDACA] hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-bold text-sm sm:text-base text-[#273424] flex items-center gap-1.5">
                        {item.type === 'friend' ? '✨' : '🏡'} {item.name}
                      </span>
                      <span className="text-[11px] text-[#6E826B] bg-[#F2F6F1] px-2 py-0.5 rounded-full border border-[#DFE8DE]">
                        {new Date(item.createdAt).toLocaleDateString('he-IL')}
                      </span>
                    </div>

                    <p className="text-[#3A4A38] text-xs sm:text-sm leading-relaxed mb-3 italic font-light whitespace-pre-line">
                      "{item.wishingMessage}"
                    </p>
                  </div>

                  {item.songRequest && (
                    <div className="pt-2.5 border-t border-[#EDF3EC] flex items-center gap-1.5 text-xs text-[#5D6F5A] mt-auto">
                      <Music className="w-3.5 h-3.5 text-[#546A50] shrink-0" />
                      <span className="font-medium">שיר מבוקש:</span>
                      <span className="text-[#2A3628] font-semibold truncate">
                        {item.songRequest}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      {canSlide && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {wishes.map((_, idx) => {
            const isActive = activeDotIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  isActive
                    ? 'w-6 h-2 bg-[#3A4E38]'
                    : 'w-2 h-2 bg-[#CCD8CA] hover:bg-[#9EAF9C]'
                }`}
                title={`מעבר לברכה ${idx + 1}`}
                aria-label={`מעבר לברכה ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
