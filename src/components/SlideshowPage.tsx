import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  ArrowRight,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  Sparkles,
  Shuffle,
  Clock,
  HardDrive,
  AlertCircle,
  Eye,
  Tv,
} from 'lucide-react';
import { EventDetails } from '../types';
import {
  CachedSlidePhoto,
  cacheAllPhotosWithProgress,
  getAllCachedPhotos,
  getCacheMetadata,
  CacheMetadata,
} from '../utils/slideshowCache';

export interface SlideshowPageProps {
  event: EventDetails;
  onBack: () => void;
}

// Available dramatic 3D & cinematic transition styles
export type TransitionType =
  | 'fly-from-behind' // תמונה מגיחה בעוצמה ממעמקי הרקע (3D Fly-In)
  | 'spin-3d-cw' // סחרור תלת-ממדי מלא עם כיוון השעון
  | 'spin-3d-ccw' // סחרור תלת-ממדי מלא נגד כיוון השעון
  | 'cube-flip-right' // היפוך קובייה תלת-ממדית מימין
  | 'cube-flip-left' // היפוך קובייה תלת-ממדית משמאל
  | 'cube-flip-top' // היפוך קובייה תלת-ממדית מלמעלה
  | 'cube-flip-bottom' // היפוך קובייה תלת-ממדית מלמטה
  | 'diagonal-top-right' // סחרור אלכסוני מהפינה הימנית
  | 'diagonal-bottom-left' // סחרור אלכסוני מהפינה השמאלית
  | 'card-flip-360' // היפוך קלף מלא 360 מעלות
  | 'swing-right' // תנופת מטוטלת תלת-ממדית מימין
  | 'swing-left'; // תנופת מטוטלת תלת-ממדית משמאל

export const ALL_TRANSITIONS: TransitionType[] = [
  'fly-from-behind',
  'spin-3d-cw',
  'spin-3d-ccw',
  'cube-flip-right',
  'cube-flip-left',
  'cube-flip-top',
  'cube-flip-bottom',
  'diagonal-top-right',
  'diagonal-bottom-left',
  'card-flip-360',
  'swing-right',
  'swing-left',
];

// Helper to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const SlideshowPage: React.FC<SlideshowPageProps> = ({ event, onBack }) => {
  // Page Modes:
  // 'checking' -> checks existing cache
  // 'downloading' -> strict pre-caching in progress
  // 'ready' -> cache complete & verified, shows status & confirmation before launching
  // 'playing' -> full screen presentation mode
  const [mode, setMode] = useState<'checking' | 'downloading' | 'ready' | 'playing'>('checking');

  // Cache loading state
  const [progressCurrent, setProgressCurrent] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(1);
  const [progressStatusText, setProgressStatusText] = useState<string>('בודק זמינות קש מקומי...');
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [cacheMeta, setCacheMeta] = useState<CacheMetadata | null>(null);

  // Photos & Playback state
  const [photos, setPhotos] = useState<CachedSlidePhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [displayDurationSec, setDisplayDurationSec] = useState<number>(3.5); // 3.5 seconds per photo
  const [currentTransition, setCurrentTransition] = useState<TransitionType>('fly-from-behind');

  // UI State for fullscreen & control overlay
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Crossfade image state (previous and current photo for buttery transitions)
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Auto-advance timer ref and animation timeout ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check cache on initial mount
  useEffect(() => {
    async function checkExistingCache() {
      try {
        const cached = await getAllCachedPhotos();
        const meta = getCacheMetadata();
        setCacheMeta(meta);

        if (cached && cached.length > 0) {
          // Photos already cached in IndexedDB!
          setPhotos(shuffleArray(cached));
          setProgressCurrent(cached.length);
          setProgressTotal(cached.length);
          setProgressStatusText(
            `נמצא קש מקומי מאומת עם ${cached.length} תמונות. ניתן לנתק אינטרנט ולהקרין מיד!`
          );
          setMode('ready');
        } else {
          // No cache yet: trigger initial download
          startCachingProcess();
        }
      } catch (err: any) {
        console.warn('Initial cache check failed, starting fresh cache:', err);
        startCachingProcess();
      }
    }

    checkExistingCache();
  }, []);

  // Strict Caching Action: Fetches, converts to offline Base64, writes to IndexedDB, and verifies
  const startCachingProcess = async () => {
    try {
      setMode('downloading');
      setCacheError(null);
      setProgressCurrent(0);
      setProgressTotal(1);
      setProgressStatusText('מתחבר לגלריה ומושך את כל התמונות לקש מקומי...');

      const result = await cacheAllPhotosWithProgress((current, total, statusText) => {
        setProgressCurrent(current);
        setProgressTotal(total);
        setProgressStatusText(statusText);
      });

      if (result.success && result.photos.length > 0) {
        setPhotos(shuffleArray(result.photos));
        const meta = getCacheMetadata();
        setCacheMeta(meta);
        setMode('ready');
      } else {
        setCacheError('לא נמצאו תמונות זמינות לשמירה בקש.');
        setMode('ready');
      }
    } catch (err: any) {
      console.error('Caching process error:', err);
      setCacheError(err.message || 'שגיאה בשמירת התמונות לקש המקומי');
      // If we have any existing photos, allow using them
      const fallback = await getAllCachedPhotos();
      if (fallback.length > 0) {
        setPhotos(shuffleArray(fallback));
        setMode('ready');
      }
    }
  };

  // Switch to next slide with random dramatic 3D animation
  const nextSlide = useCallback(() => {
    if (photos.length === 0) return;

    // Pick a random transition different from the current one
    const available = ALL_TRANSITIONS.filter((t) => t !== currentTransition);
    const randomTrans = available[Math.floor(Math.random() * available.length)];

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    setPrevIndex(currentIndex);
    setCurrentTransition(randomTrans);
    setIsTransitioning(true);

    setCurrentIndex((prev) => {
      if (prev + 1 >= photos.length) {
        // Re-shuffle for infinite non-repeating loop
        setPhotos((currentList) => shuffleArray(currentList));
        return 0;
      }
      return prev + 1;
    });

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 1150); // Matches the smooth 1.1s monotonic deceleration curve
  }, [photos.length, currentIndex, currentTransition]);

  // Switch to previous slide
  const prevSlide = useCallback(() => {
    if (photos.length === 0) return;

    const available = ALL_TRANSITIONS.filter((t) => t !== currentTransition);
    const randomTrans = available[Math.floor(Math.random() * available.length)];

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    setPrevIndex(currentIndex);
    setCurrentTransition(randomTrans);
    setIsTransitioning(true);

    setCurrentIndex((prev) => (prev - 1 < 0 ? photos.length - 1 : prev - 1));

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 1150);
  }, [photos.length, currentIndex, currentTransition]);

  // Slideshow interval timer
  useEffect(() => {
    if (mode !== 'playing' || !isPlaying || photos.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, displayDurationSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, isPlaying, displayDurationSec, photos.length, nextSlide]);

  // Handle Fullscreen toggling
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  // Sync fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard controls listener (Space = pause/play, Arrows = navigation, F = fullscreen)
  useEffect(() => {
    if (mode !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Show controls on any keypress
      handleUserActivity();

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        // Exit handled by browser
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isFullscreen, nextSlide, prevSlide]);

  // Auto-hiding control overlay on mouse inactivity
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2800);
  };

  // Start Projection in Full Screen
  const handleStartProjection = async () => {
    if (photos.length === 0) return;
    setMode('playing');
    setIsPlaying(true);
    setCurrentIndex(0);
    try {
      await toggleFullscreen();
    } catch {}
    handleUserActivity();
  };

  // Re-shuffle order on demand
  const handleReshuffle = () => {
    setPhotos((prev) => shuffleArray(prev));
    setCurrentIndex(0);
  };

  // ==========================================
  // VIEW 1: STRICT CACHE PROGRESS & STATUS SCREEN
  // ==========================================
  if (mode === 'downloading' || mode === 'checking' || mode === 'ready') {
    const progressPercent =
      progressTotal > 0 ? Math.min(100, Math.round((progressCurrent / progressTotal) * 100)) : 0;

    return (
      <div className="min-h-screen bg-[#0E1310] text-[#E8EFE6] flex flex-col items-center justify-center p-4 sm:p-6 font-['Rubik',sans-serif] relative overflow-hidden select-none">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#4A6746]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Back / Exit Button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-stone-300 hover:text-white border border-white/10 text-xs sm:text-sm font-medium backdrop-blur-md transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[#8AA786]" />
            <span>חזרה לניהול הורים</span>
          </button>
        </div>

        {/* Card Content */}
        <div className="max-w-xl w-full bg-[#18201B]/90 border border-[#2B3B2F] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10 text-center">
          {/* Header Title */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27382B] border border-[#3E5544] text-[#B0CFAC] text-xs font-semibold mb-4">
            <Tv className="w-3.5 h-3.5 text-[#8DC189]" />
            <span>מסך תצוגה והקרנה לאירוע (Slideshow)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            בת המצווה של {event.celebrantName} ✨
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mb-6 leading-relaxed">
            מערכת הקרנה ייעודית למסך מלא באולם. כל התמונות נטענות ונשמרות מראש בזיכרון המקומי
            (IndexedDB) לפעולה רציפה ללא תלות באינטרנט.
          </p>

          {/* DOWNLOADING STATE */}
          {mode === 'downloading' && (
            <div className="space-y-6 my-6">
              {/* Progress percentage ring or bar */}
              <div className="w-24 h-24 mx-auto rounded-full bg-[#202C24] border-2 border-[#4A6746] flex flex-col items-center justify-center shadow-lg relative">
                <RefreshCw className="w-8 h-8 text-[#8DC189] animate-spin mb-1" />
                <span className="text-xs font-bold text-white">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-stone-300 font-medium px-1">
                  <span>טוען תמונות לקש המקומי...</span>
                  <span>
                    {progressCurrent} מתוך {progressTotal} תמונות
                  </span>
                </div>
                <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-[#4A6746] via-[#638C5E] to-[#9CD497] rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3.5 rounded-2xl bg-[#1E2922] border border-[#324536] text-xs text-stone-300 flex items-center justify-center gap-2">
                <HardDrive className="w-4 h-4 text-[#8DC189] shrink-0" />
                <span className="truncate">{progressStatusText}</span>
              </div>

              <div className="text-[11px] text-stone-500">
                🔒 חוק טעינה קשיח: לא יוצגו תמונות עד להשלמת מלוא הקש המקומי.
              </div>
            </div>
          )}

          {/* READY / COMPLETED STATE */}
          {mode === 'ready' && (
            <div className="space-y-6 my-4">
              {cacheError ? (
                <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 text-right">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">הודעת מערכת:</div>
                    <div className="mt-0.5">{cacheError}</div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#1B2B1F] border border-[#3A563E] text-right space-y-3 shadow-inner">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm sm:text-base">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <span>טעינת התמונות לקש הושלמה בהצלחה!</span>
                  </div>

                  <div className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
                    כל <b>{photos.length}</b> התמונות והמזכרות נשמרו בהצלחה בזיכרון המקומי של המכשיר
                    (IndexedDB).
                  </div>

                  {/* Offline Peace of Mind Badge */}
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 flex items-center gap-2 text-xs text-emerald-300 font-medium">
                    <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      הושלם! כעת ניתן לנתק את המחשב מהאינטרנט ולהקרין בראש שקט לחלוטין.
                    </span>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="block text-[10px] text-stone-400">כמות תמונות</span>
                      <span className="text-sm font-bold text-white">{photos.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="block text-[10px] text-stone-400">זמן לתמונה</span>
                      <span className="text-sm font-bold text-white">{displayDurationSec} שנ'</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="block text-[10px] text-stone-400">אנימציות תלת-ממד</span>
                      <span className="text-xs font-bold text-emerald-300">12 מעברים 🚀</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStartProjection}
                  disabled={photos.length === 0}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#4A6746] to-[#60875B] hover:from-[#3D563A] hover:to-[#50724C] text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>התחל הקרנה (מסך מלא) ▶</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={startCachingProcess}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="טען תמונות חדשות מהשרת ושמור אותן לקש המקומי"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#8DC189]" />
                    <span>רענן / עדכן קש מהרשת</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReshuffle}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="ערבב מחדש את סדר התמונות"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-stone-300" />
                    <span>ערבב סדר</span>
                  </button>
                </div>
              </div>

              {/* Display Speed selector */}
              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-stone-400">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>מהירות החלפת תמונה:</span>
                {[3, 3.5, 4, 5].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDisplayDurationSec(sec)}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      displayDurationSec === sec
                        ? 'bg-[#4A6746] text-white'
                        : 'bg-white/5 text-stone-400 hover:text-white'
                    }`}
                  >
                    {sec} שנ'
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE SLIDESHOW PRESENTATION (PROJECTION MODE)
  // ==========================================
  const currentPhoto = photos[currentIndex];
  const prevPhoto = prevIndex !== null ? photos[prevIndex] : null;

  // Determine entrance transition CSS classes
  const getTransitionClass = (trans: TransitionType): string => {
    switch (trans) {
      case 'fly-from-behind':
        return 'animate-fly-from-behind';
      case 'spin-3d-cw':
        return 'animate-spin-3d-cw';
      case 'spin-3d-ccw':
        return 'animate-spin-3d-ccw';
      case 'cube-flip-right':
        return 'animate-cube-flip-right';
      case 'cube-flip-left':
        return 'animate-cube-flip-left';
      case 'cube-flip-top':
        return 'animate-cube-flip-top';
      case 'cube-flip-bottom':
        return 'animate-cube-flip-bottom';
      case 'diagonal-top-right':
        return 'animate-diagonal-top-right';
      case 'diagonal-bottom-left':
        return 'animate-diagonal-bottom-left';
      case 'card-flip-360':
        return 'animate-card-flip-360';
      case 'swing-right':
        return 'animate-swing-right';
      case 'swing-left':
        return 'animate-swing-left';
      default:
        return 'animate-fly-from-behind';
    }
  };

  // Determine exit transition for outgoing photo to create powerful paired 3D interaction
  const getExitTransitionClass = (trans: TransitionType): string => {
    if (trans === 'fly-from-behind') {
      return 'animate-exit-forward';
    }
    return 'animate-exit-shrink';
  };

  return (
    <div
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center overflow-hidden select-none cursor-default font-['Rubik',sans-serif]"
    >
      {/* 1. AMBIENT BLURRED BACKDROP TO BEAUTIFULLY FILL WIDESCREEN & PROJECTOR SCREENS */}
      {currentPhoto && (
        <div
          key={`ambient-${currentPhoto.id}`}
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-35 scale-125 transition-all duration-1000 pointer-events-none"
          style={{ backgroundImage: `url(${currentPhoto.imageUrl})` }}
        />
      )}

      {/* Subtle vignette layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-10" />

      {/* 2. MAIN CENTERED STAGE WITH DYNAMIC 3D ANIMATIONS (1400px perspective) */}
      <div className="relative z-20 w-full h-full flex items-center justify-center p-2 sm:p-6 md:p-8 slideshow-3d-stage overflow-hidden">
        {/* Outgoing previous photo during transition */}
        {isTransitioning && prevPhoto && (
          <div
            key={`prev-${prevPhoto.id}-${prevIndex}`}
            className={`absolute inset-0 flex items-center justify-center p-2 sm:p-6 md:p-8 pointer-events-none ${getExitTransitionClass(
              currentTransition
            )}`}
          >
            <div className="relative flex items-center justify-center max-h-[86vh] max-w-[92vw]">
              <img
                src={prevPhoto.imageUrl}
                alt=""
                className="max-h-[86vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border-2 border-white/10 block"
              />
            </div>
          </div>
        )}

        {/* Incoming Current Photo with dramatic 3D animation */}
        {currentPhoto && (
          <div
            key={`curr-${currentPhoto.id}-${currentIndex}`}
            className={`absolute inset-0 flex items-center justify-center p-2 sm:p-6 md:p-8 ${getTransitionClass(
              currentTransition
            )}`}
          >
            <div className="relative flex items-center justify-center max-h-[86vh] max-w-[92vw]">
              {/* The Image itself with high-fidelity drop-shadow and delicate border */}
              <img
                src={currentPhoto.imageUrl}
                alt={currentPhoto.creatorName || 'תמונת מזכרת'}
                className="max-h-[86vh] max-w-[92vw] object-contain rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] border-2 border-white/20 block"
              />

              {/* Subtle Gold Floral / Sparkle Accent in top-left */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#3D563A]/90 border border-[#8DAF8A] flex items-center justify-center text-xs shadow-md">
                🌿
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM CAPTION (CELEBRANT & GUEST CREATOR NAME) */}
      {currentPhoto && (
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 max-w-2xl w-[92%] text-center pointer-events-none ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-1'
          }`}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-black/70 border border-white/20 backdrop-blur-md text-sm sm:text-base text-stone-200 shadow-2xl">
            <span className="font-bold text-[#A8D3A4] text-sm sm:text-base">בת המצווה של {event.celebrantName} ✨</span>
            <span className="text-stone-500">•</span>
            <span className="text-white text-sm sm:text-base font-medium">
              צילם/ה: <strong className="text-emerald-300 font-bold text-base sm:text-lg md:text-xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{currentPhoto.creatorName}</strong>
            </span>
            {currentPhoto.styleName && (
              <>
                <span className="text-stone-500">•</span>
                <span className="text-stone-300 text-xs sm:text-sm">{currentPhoto.styleName}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. FLOATING CONTROL OVERLAY (AUTO-HIDES ON INACTIVITY) */}
      <div
        className={`absolute top-0 inset-x-0 z-40 p-4 sm:p-6 flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top-right: Return to Dashboard */}
        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            setMode('ready');
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 text-stone-300 hover:text-white border border-white/15 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg"
        >
          <ArrowRight className="w-4 h-4 text-[#8AA786]" />
          <span>עצירת הקרנה / תפריט</span>
        </button>

        {/* Top-center: Slide counter & Offline badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-xs font-medium text-stone-300 shadow-lg">
            <span>תמונה </span>
            <strong className="text-white font-bold">{currentIndex + 1}</strong>
            <span> מתוך </span>
            <strong className="text-white font-bold">{photos.length}</strong>
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-600/50 backdrop-blur-md text-[11px] font-semibold text-emerald-300 shadow-lg"
            title="התמונות שמורות במלואן בזיכרון המקומי - פועל אופליין ללא אינטרנט"
          >
            <WifiOff className="w-3 h-3 text-emerald-400" />
            <span>קש אופליין פעיל</span>
          </div>
        </div>

        {/* Top-left: Fullscreen toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-stone-300 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg"
            title={isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5. SIDE ARROWS FOR MANUAL PREV/NEXT */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prevSlide();
        }}
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-xl ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="לתמונה הקודמת (חץ ימינה)"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          nextSlide();
        }}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-xl ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="לתמונה הבאה (חץ שמאלה)"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* 6. BOTTOM CENTER QUICK CONTROLS (PLAY/PAUSE & SPEED) */}
      <div
        className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/15 backdrop-blur-md transition-all duration-300 shadow-2xl ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying((prev) => !prev);
          }}
          className="p-2 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
          title={isPlaying ? 'השהה מצגת (רווח)' : 'המשך הקרנה (רווח)'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        <div className="h-4 w-px bg-white/20" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReshuffle();
          }}
          className="p-2 rounded-full hover:bg-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer"
          title="ערבב מחדש סדר תמונות"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/20" />

        {/* Speed toggle pills */}
        <div className="flex items-center gap-1 text-[11px] text-stone-300 pr-1">
          {[3, 3.5, 4].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDisplayDurationSec(sec);
              }}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                displayDurationSec === sec
                  ? 'bg-[#4A6746] text-white'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {sec}ש'
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
