import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  Download,
  X,
  Sparkles,
  Share2,
  Trash2,
} from 'lucide-react';
import { SouvenirItem, EventDetails, RSVP } from '../types';
import { fetchSouvenirsPaginated, deleteSouvenir } from '../services/api';
import { SOUVENIR_STYLES } from '../data/souvenirStyles';
import {
  downloadDataUrl,
  shareOrDownloadImage,
  getOrCreateGuestId,
  getMySouvenirIds,
  removeMySouvenirId,
} from '../utils/imageProcessing';

interface SouvenirGalleryPageProps {
  event: EventDetails;
  onBack: () => void;
  onNavigateToDesign: () => void;
  primaryRsvp?: RSVP | null;
}

const ITEMS_PER_PAGE = 20;

export const SouvenirGalleryPage: React.FC<SouvenirGalleryPageProps> = ({
  event,
  onBack,
  onNavigateToDesign,
  primaryRsvp,
}) => {
  const [souvenirs, setSouvenirs] = useState<SouvenirItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [overallTotal, setOverallTotal] = useState<number>(0);
  const [styleCounts, setStyleCounts] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [activeModalSouvenir, setActiveModalSouvenir] = useState<SouvenirItem | null>(null);

  // Pagination & Autoscroll (Infinite Scroll) refs
  const offsetRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const gallerySectionRef = useRef<HTMLDivElement | null>(null);
  const hasUserScrolledRef = useRef<boolean>(false);

  // User souvenir ownership tracking
  const [currentGuestId] = useState<string>(() => getOrCreateGuestId());
  const [mySouvenirIds, setMySouvenirIds] = useState<string[]>(() => getMySouvenirIds());
  const [confirmDeleteSouvenir, setConfirmDeleteSouvenir] = useState<SouvenirItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if a souvenir was created by this user
  const isMySouvenir = (item: SouvenirItem): boolean => {
    if (mySouvenirIds.includes(item.id)) return true;
    if (item.guestId && currentGuestId && item.guestId === currentGuestId) return true;
    if (
      primaryRsvp?.name &&
      item.creatorName &&
      item.creatorName.trim().toLowerCase() === primaryRsvp.name.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteSouvenir) return;
    try {
      setIsDeleting(true);
      await deleteSouvenir(confirmDeleteSouvenir.id);
      removeMySouvenirId(confirmDeleteSouvenir.id);
      setMySouvenirIds((prev) => prev.filter((id) => id !== confirmDeleteSouvenir.id));
      setSouvenirs((prev) => prev.filter((s) => s.id !== confirmDeleteSouvenir.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setOverallTotal((prev) => Math.max(0, prev - 1));
      if (confirmDeleteSouvenir.styleId) {
        setStyleCounts((prev) => ({
          ...prev,
          [confirmDeleteSouvenir.styleId]: Math.max(0, (prev[confirmDeleteSouvenir.styleId] || 1) - 1),
        }));
      }
      if (activeModalSouvenir?.id === confirmDeleteSouvenir.id) {
        setActiveModalSouvenir(null);
      }
      setConfirmDeleteSouvenir(null);
    } catch (err: any) {
      console.error('Failed to delete souvenir:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load first batch of 20 souvenirs (either on mount or when style filter changes)
  const loadInitialGallery = useCallback(async (styleId: string) => {
    try {
      setIsLoading(true);
      offsetRef.current = 0;
      hasUserScrolledRef.current = false;

      const data = await fetchSouvenirsPaginated({
        style: styleId,
        limit: ITEMS_PER_PAGE,
        offset: 0,
      });

      setSouvenirs(data.items);
      setTotalCount(data.total);
      setOverallTotal(data.overallTotal);
      if (data.styleCounts && Object.keys(data.styleCounts).length > 0) {
        setStyleCounts(data.styleCounts);
      }
      setHasMore(data.hasMore && data.items.length < data.total);
      offsetRef.current = data.items.length;
    } catch (err) {
      console.error('Failed to load souvenirs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialGallery(selectedStyleFilter);
  }, [selectedStyleFilter, loadInitialGallery]);

  // Load next batch of 20 images from server API when scrolling down
  const loadNextBatch = useCallback(async () => {
    if (!hasMore || isLoadingMoreRef.current || isLoading) return;

    try {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      const currentOffset = offsetRef.current;
      const data = await fetchSouvenirsPaginated({
        style: selectedStyleFilter,
        limit: ITEMS_PER_PAGE,
        offset: currentOffset,
      });

      if (data.items.length > 0) {
        setSouvenirs((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newUnique = data.items.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newUnique];
        });
        offsetRef.current = currentOffset + data.items.length;
      }

      setTotalCount(data.total);
      setOverallTotal(data.overallTotal);
      setHasMore(data.hasMore && data.items.length > 0 && offsetRef.current < data.total);
    } catch (err) {
      console.error('Failed to load more souvenirs:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, selectedStyleFilter]);

  // Handle switching style filter: reset to first 20 items and scroll to top of gallery smoothly
  const handleSelectStyleFilter = (styleId: string) => {
    if (selectedStyleFilter === styleId) return;
    setSelectedStyleFilter(styleId);

    if (gallerySectionRef.current) {
      const topOffset = gallerySectionRef.current.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > topOffset) {
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    }
  };

  // Autoscroll using IntersectionObserver on bottom sentinel
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger if the user has actually scrolled or sentinel is in view
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMoreRef.current &&
          !isLoading &&
          (hasUserScrolledRef.current || window.scrollY > 20)
        ) {
          loadNextBatch();
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadNextBatch]);

  // Track user scroll and fallback for autoscroll near page bottom
  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 20) {
        hasUserScrolledRef.current = true;
      }

      if (!hasMore || isLoadingMoreRef.current || isLoading || !hasUserScrolledRef.current) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop > 80 && scrollTop + clientHeight >= scrollHeight - 350) {
        loadNextBatch();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [hasMore, isLoading, loadNextBatch]);

  // Helper to get emoji for a style
  const getStyleEmoji = (styleId: string): string => {
    const style = SOUVENIR_STYLES.find((s) => s.id === styleId);
    return style?.emoji || '✨';
  };

  const handleDownload = (item: SouvenirItem) => {
    const safeName = (item.creatorName || 'guest')
      .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')
      .slice(0, 20);
    const filename = `mazkeret-ori-${safeName}-${item.styleId || 'souvenir'}.png`;
    downloadDataUrl(item.imageUrl, filename);
  };

  const handleShare = async (item: SouvenirItem) => {
    const filename = `mazkeret-ori-${item.styleId || 'souvenir'}.png`;
    await shareOrDownloadImage(
      item.imageUrl,
      filename,
      `מזכרת אישית מאת ${item.creatorName} לבת המצווה של ${event.celebrantName}`,
      `תראו את המזכרת היפה שנוצרה לבת המצווה של אורי קלזן! 🌿✨`
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C342E] flex flex-col font-['Rubik',sans-serif] selection:bg-[#E2EBE0] selection:text-[#2A3A27]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E3ECE1] py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-[#384836] bg-[#EDF3EB] hover:bg-[#E3ECE0] transition-colors border border-[#CCD9C9] cursor-pointer"
            title="חזרה לעמוד הראשי"
          >
            <ArrowRight className="w-4 h-4 text-[#4E634B]" />
            <span className="hidden sm:inline">חזרה להזמנה</span>
          </button>

          {/* Title in center */}
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-bold text-[#2A3728] flex items-center justify-center gap-1.5">
              <span>גלריית המזכרות</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E5EFE2] text-[#344E31] border border-[#CCDCCD] font-normal">
                {overallTotal || souvenirs.length} מזכרות
              </span>
            </h1>
          </div>

          {/* CTA: Create Your Own Souvenir */}
          <button
            type="button"
            onClick={onNavigateToDesign}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#3B4E38] hover:bg-[#2F402D] transition-colors shadow-xs cursor-pointer border border-[#4F674A]"
            title="עיצוב מזכרת אישית משלכם"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D8E6D6]" />
            <span>עיצוב מזכרת</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        {/* Banner Card */}
        <div className="bg-gradient-to-l from-[#FAF7F0] via-[#F4EFE6] to-[#EEF5EC] border border-[#E3DBD0] rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(58,68,55,0.06)] mb-6 sm:mb-8 text-right relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F2E5] text-[#344E31] text-xs font-semibold border border-[#CDE0C9] mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4E684B]" />
              <span>יצירות האורחים והחברות</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#253322] leading-snug">
              המזכרות מבת המצווה של {event.celebrantName}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6D57] mt-1 leading-relaxed">
              תמונות שעיצבתם בסגנונות שונים. לחצו להגדלה ולהורדה באיכות גבוהה!
            </p>
          </div>
        </div>

        {/* Style Filters Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none text-right">
          <button
            type="button"
            onClick={() => handleSelectStyleFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedStyleFilter === 'all'
                ? 'bg-[#3B4E38] text-white shadow-xs'
                : 'bg-white hover:bg-[#F0F5EE] text-[#4A5D47] border border-[#D5E1D3]'
            }`}
          >
            הכל ({overallTotal || souvenirs.length})
          </button>

          {SOUVENIR_STYLES.map((style) => {
            const count = styleCounts[style.id] ?? souvenirs.filter((s) => s.styleId === style.id).length;
            if (count === 0 && selectedStyleFilter !== style.id) return null;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => handleSelectStyleFilter(style.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedStyleFilter === style.id
                    ? 'bg-[#3B4E38] text-white shadow-xs'
                    : 'bg-white hover:bg-[#F0F5EE] text-[#4A5D47] border border-[#D5E1D3]'
                }`}
              >
                <span>{style.emoji}</span>
                <span>{style.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Gallery Content Section */}
        <div ref={gallerySectionRef}>
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-3 border-[#3B4E38]/20 border-t-[#3B4E38] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#5B6D57]">טוען את גלריית המזכרות...</p>
            </div>
          ) : souvenirs.length === 0 ? (
            <div className="py-16 text-center bg-white/70 rounded-3xl border border-[#E3DBD0] p-8">
              <div className="w-16 h-16 rounded-full bg-[#EEF5EC] border border-[#CCDCCD] flex items-center justify-center text-3xl mx-auto mb-3">
                🎨
              </div>
              <h3 className="text-base font-bold text-[#2A3728] mb-1">
                {selectedStyleFilter === 'all'
                  ? 'עוד לא נוצרו תמונות בגלריה'
                  : 'עדיין אין תמונות בסגנון זה'}
              </h3>
              <p className="text-xs sm:text-sm text-[#5E725B] max-w-md mx-auto mb-5">
                {selectedStyleFilter === 'all'
                  ? 'היו הראשונים לעצב מזכרת אישית ומיוחדת מבת המצווה של אורי!'
                  : 'היו הראשונים לעצב מזכרת אישית בסגנון הנבחר מבת המצווה של אורי!'}
              </p>
              <button
                type="button"
                onClick={onNavigateToDesign}
                className="px-5 py-2.5 rounded-xl bg-[#3B4E38] hover:bg-[#2F402D] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
              >
                עיצוב מזכרת עכשיו ✨
              </button>
            </div>
          ) : (
            <>
              {/* Responsive Grid:
                 - Mobile: 2 per row (grid-cols-2)
                 - Desktop: 4 to 5 per row (md:grid-cols-4 lg:grid-cols-5)
              */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4.5">
                {souvenirs.map((item) => {
                  const emoji = getStyleEmoji(item.styleId);
                  const isOwner = isMySouvenir(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveModalSouvenir(item)}
                      className="group relative bg-[#FAF7F0] border border-[#E3DBD0] hover:border-[#B4CEB1] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
                    >
                      {/* Photo Container */}
                      <div className="relative aspect-square w-full bg-[#EFECE5] overflow-hidden select-none">
                        <img
                          src={item.imageUrl}
                          alt={item.styleName}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Style Indicator / Badge on LEFT side */}
                        <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-xs text-white text-[10.5px] sm:text-[11.5px] font-medium px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white/20">
                          <span>{emoji}</span>
                          <span className="truncate max-w-[85px] sm:max-w-[100px]">{item.styleName}</span>
                        </div>

                        {/* Delete Button for User's Own Photo (on top right) */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteSouvenir(item);
                            }}
                            className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-red-600 text-white backdrop-blur-xs flex items-center justify-center transition-all shadow-sm cursor-pointer border border-white/20 hover:scale-105 active:scale-95"
                            title="מחיקת התמונה שלי מהגלריה"
                            aria-label="מחיקת התמונה שלי"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Subtle hover overlay with view prompt */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                            צפייה מלאה
                          </span>
                        </div>
                      </div>

                      {/* Creator Info Below the photo */}
                      <div className="p-2.5 text-right">
                        <p className="text-xs sm:text-sm font-semibold text-[#273424] truncate leading-tight">
                          {item.creatorName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sentinel element for infinite autoscroll */}
              <div ref={loadMoreSentinelRef} className="h-8 w-full pointer-events-none" />

              {/* Subtle Loading Spinner Indicator while autoscrolling */}
              {isLoadingMore && (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#52684E] animate-in fade-in duration-150">
                  <div className="w-4 h-4 border-2 border-[#3B4E38]/20 border-t-[#3B4E38] rounded-full animate-spin" />
                  <span>טוען 20 תמונות נוספות...</span>
                </div>
              )}

              {/* End of gallery indicator */}
              {!hasMore && souvenirs.length > 0 && (
                <div className="py-6 text-center text-xs text-[#7A8F76] font-medium">
                  🌿 הוצגו כל המזכרות ({totalCount}) 🌿
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating CTA for creating a souvenir at the bottom */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full mb-8">
        <div className="bg-[#FAF7F0] border border-[#E3DBD0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5EC] border border-[#CCDCCD] flex items-center justify-center text-xl shrink-0">
              ✨
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#2A3728]">
                עוד לא עיצבתם מזכרת אישית?
              </h4>
              <p className="text-xs text-[#5E725B]">
                העלו תמונה, בחרו סגנון חגיגי וקבלו מזכרת מעוצבת מבת המצווה של אורי!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToDesign}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#3B4E38] hover:bg-[#2F402D] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0 border border-[#4F674A]"
          >
            עיצוב מזכרת אישית משלכם ✨
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E3ECE1] bg-white/70 backdrop-blur-xs py-6 px-4 text-center text-xs text-[#5D6F5A]">
        חוגגים לאורי בת מצווה 🌿 מחכים לכם, משפחת קלזן
      </footer>

      {/* Single Souvenir Image Modal
          Exact requirements:
          - Looks like the original invitation modal
          - Download icon on the right
          - Close icon on the left
          - Style shown in the middle between the download and close icons
      */}
      {activeModalSouvenir && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModalSouvenir(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
        >
          <div
            className="relative w-fit max-w-[95vw] sm:max-w-[85vw] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-[#FAF7F0] border border-[#E3DBD0]"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar: Download Button (Right) */}
            <button
              type="button"
              onClick={() => handleDownload(activeModalSouvenir)}
              title="הורדת התמונה"
              aria-label="הורדת התמונה"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Top Bar: Style displayed in the middle between download and close icons */}
            <div className="absolute top-3 sm:top-4 inset-x-14 sm:inset-x-20 z-20 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border border-white/20 shadow-md truncate max-w-full flex items-center gap-1.5 pointer-events-auto">
                <span className="text-base">{getStyleEmoji(activeModalSouvenir.styleId)}</span>
                <span className="truncate">{activeModalSouvenir.styleName}</span>
              </div>
            </div>

            {/* Top Bar: Close Button (Left) */}
            <button
              type="button"
              onClick={() => setActiveModalSouvenir(null)}
              title="סגירה"
              aria-label="סגירה"
              className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Souvenir Image - exactly hugs image without black/beige side borders */}
            <img
              src={activeModalSouvenir.imageUrl}
              alt={activeModalSouvenir.styleName}
              className="block w-auto h-auto max-w-[92vw] sm:max-w-[85vw] max-h-[75vh] object-contain select-none mx-auto"
            />

            {/* Footer Strip with Creator Name & Share Action - matches exact width of the image */}
            <div className="w-full p-3 sm:p-4 bg-[#FAF7F0] border-t border-[#E3DBD0] flex items-center justify-between gap-3 text-right">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#2A3728]">
                  נוצר ע״י {activeModalSouvenir.creatorName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isMySouvenir(activeModalSouvenir) && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSouvenir(activeModalSouvenir)}
                    className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                    title="מחיקת התמונה שלי מהגלריה"
                    aria-label="מחיקת התמונה שלי מהגלריה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleShare(activeModalSouvenir)}
                  className="w-9 h-9 rounded-full bg-[#EEF5EC] hover:bg-[#DFEDE0] text-[#2F4A2C] border border-[#CCDCCD] flex items-center justify-center transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                  title="שיתוף תמונה"
                  aria-label="שיתוף תמונה"
                >
                  <Share2 className="w-4 h-4 text-[#3D5A39]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteSouvenir && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setConfirmDeleteSouvenir(null);
            }
          }}
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-['Rubik',sans-serif]"
        >
          <div className="bg-[#FAF7F0] border border-[#E3DBD0] max-w-sm w-full rounded-3xl p-5 sm:p-6 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-3.5 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[#2A3728] mb-1.5">
              מחיקת המזכרת מהגלריה
            </h4>
            <p className="text-xs sm:text-sm text-[#5E725B] leading-relaxed mb-5">
              האם למחוק את התמונה שלך מהגלריה? פעולה זו תסיר את המזכרת לצמיתות.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteSouvenir(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-[#CCD8CA] bg-white hover:bg-[#F0F5EE] text-xs sm:text-sm font-semibold text-[#3E523A] transition-colors cursor-pointer disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'מוחק...' : 'כן, למחוק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
