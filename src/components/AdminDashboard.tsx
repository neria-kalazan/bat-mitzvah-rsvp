import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Search,
  Download,
  Trash2,
  Settings,
  Sparkles,
  Music,
  Save,
  CheckCircle,
  ArrowRight,
  Leaf,
  Link as LinkIcon,
  Check,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  Send,
  Loader2,
  Tv,
  Play,
} from 'lucide-react';
import { RSVP, EventDetails, SouvenirItem } from '../types';
import { fetchSouvenirsPaginated, deleteSouvenir, syncWithGoogleSheets, checkFirestoreStatus } from '../services/api';
import { SOUVENIR_STYLES } from '../data/souvenirStyles';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/googleAppsScriptTemplate';

export interface AdminDashboardProps {
  rsvps: RSVP[];
  event: EventDetails;
  onBack: () => void;
  onDeleteRSVP: (id: string) => Promise<void>;
  onUpdateEvent: (updated: Partial<EventDetails>) => Promise<void>;
  onRefreshRSVPs?: () => Promise<void>;
  onOpenSlideshow?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  rsvps,
  event,
  onBack,
  onDeleteRSVP,
  onUpdateEvent,
  onRefreshRSVPs,
  onOpenSlideshow,
}) => {
  const [activeTab, setActiveTab] = useState<'rsvps' | 'souvenirs' | 'settings'>('rsvps');
  const [filterType, setFilterType] = useState<'all' | 'friend' | 'family'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const SOUVENIRS_PER_PAGE = 20;

  // Souvenirs management state for parents (paginated)
  const [souvenirs, setSouvenirs] = useState<SouvenirItem[]>([]);
  const [souvenirTotalCount, setSouvenirTotalCount] = useState<number>(0);
  const [souvenirOverallTotal, setSouvenirOverallTotal] = useState<number>(0);
  const [souvenirStyleCounts, setSouvenirStyleCounts] = useState<Record<string, number>>({});
  const [souvenirHasMore, setSouvenirHasMore] = useState<boolean>(false);
  const [isLoadingSouvenirs, setIsLoadingSouvenirs] = useState(false);
  const [isLoadingMoreSouvenirs, setIsLoadingMoreSouvenirs] = useState(false);
  const [souvenirsLoadError, setSouvenirsLoadError] = useState<string | null>(null);
  const [souvenirSearch, setSouvenirSearch] = useState('');
  const [debouncedSouvenirSearch, setDebouncedSouvenirSearch] = useState('');
  const [souvenirStyleFilter, setSouvenirStyleFilter] = useState('all');
  const [deletingSouvenirId, setDeletingSouvenirId] = useState<string | null>(null);
  const [confirmDeleteSouvenir, setConfirmDeleteSouvenir] = useState<SouvenirItem | null>(null);
  const [previewSouvenir, setPreviewSouvenir] = useState<SouvenirItem | null>(null);
  const [souvenirDeleteSuccess, setSouvenirDeleteSuccess] = useState<string | null>(null);

  const souvenirOffsetRef = useRef<number>(0);
  const isLoadingMoreSouvenirsRef = useRef<boolean>(false);
  const souvenirSentinelRef = useRef<HTMLDivElement | null>(null);
  const hasUserScrolledSouvenirsRef = useRef<boolean>(false);

  // Debounce souvenir search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSouvenirSearch(souvenirSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [souvenirSearch]);

  // Load initial batch of 20 souvenirs (on mount, filter/search change, or manual refresh)
  const loadInitialSouvenirs = useCallback(async (styleId: string = 'all', searchStr: string = '') => {
    try {
      setIsLoadingSouvenirs(true);
      setSouvenirsLoadError(null);
      souvenirOffsetRef.current = 0;
      hasUserScrolledSouvenirsRef.current = false;

      const data = await fetchSouvenirsPaginated({
        style: styleId,
        search: searchStr,
        limit: SOUVENIRS_PER_PAGE,
        offset: 0,
      });

      setSouvenirs(data.items);
      setSouvenirTotalCount(data.total);
      setSouvenirOverallTotal(data.overallTotal);
      if (data.styleCounts && Object.keys(data.styleCounts).length > 0) {
        setSouvenirStyleCounts(data.styleCounts);
      }
      setSouvenirHasMore(data.hasMore && data.items.length < data.total);
      souvenirOffsetRef.current = data.items.length;
    } catch (err: any) {
      console.error('Error fetching souvenirs in admin:', err);
      setSouvenirsLoadError(err?.message || 'שגיאה בטעינת תמונות המזכרות מהשרת');
    } finally {
      setIsLoadingSouvenirs(false);
    }
  }, []);

  // Load next batch of 20 souvenirs when scrolling down
  const loadNextSouvenirsBatch = useCallback(async () => {
    if (!souvenirHasMore || isLoadingMoreSouvenirsRef.current || isLoadingSouvenirs) return;

    try {
      isLoadingMoreSouvenirsRef.current = true;
      setIsLoadingMoreSouvenirs(true);

      const currentOffset = souvenirOffsetRef.current;
      const data = await fetchSouvenirsPaginated({
        style: souvenirStyleFilter,
        search: debouncedSouvenirSearch,
        limit: SOUVENIRS_PER_PAGE,
        offset: currentOffset,
      });

      if (data.items.length > 0) {
        setSouvenirs((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newUnique = data.items.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newUnique];
        });
        souvenirOffsetRef.current = currentOffset + data.items.length;
      }

      setSouvenirTotalCount(data.total);
      setSouvenirOverallTotal(data.overallTotal);
      if (data.styleCounts && Object.keys(data.styleCounts).length > 0) {
        setSouvenirStyleCounts(data.styleCounts);
      }
      setSouvenirHasMore(data.hasMore && data.items.length > 0 && souvenirOffsetRef.current < data.total);
    } catch (err) {
      console.error('Error loading more souvenirs in admin:', err);
    } finally {
      isLoadingMoreSouvenirsRef.current = false;
      setIsLoadingMoreSouvenirs(false);
    }
  }, [souvenirHasMore, isLoadingSouvenirs, souvenirStyleFilter, debouncedSouvenirSearch]);

  useEffect(() => {
    loadInitialSouvenirs(souvenirStyleFilter, debouncedSouvenirSearch);
  }, [souvenirStyleFilter, debouncedSouvenirSearch, loadInitialSouvenirs]);

  // Infinite scroll IntersectionObserver for souvenirs tab
  useEffect(() => {
    if (activeTab !== 'souvenirs') return;
    const sentinel = souvenirSentinelRef.current;
    if (!sentinel || !souvenirHasMore || isLoadingSouvenirs) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          souvenirHasMore &&
          !isLoadingMoreSouvenirsRef.current &&
          !isLoadingSouvenirs &&
          (hasUserScrolledSouvenirsRef.current || window.scrollY > 20)
        ) {
          loadNextSouvenirsBatch();
        }
      },
      {
        root: null,
        rootMargin: '300px',
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, souvenirHasMore, isLoadingSouvenirs, loadNextSouvenirsBatch]);

  // Window scroll fallback for infinite autoscroll on souvenirs tab
  useEffect(() => {
    if (activeTab !== 'souvenirs') return;

    const handleWindowScroll = () => {
      if (window.scrollY > 20) {
        hasUserScrolledSouvenirsRef.current = true;
      }

      if (
        !souvenirHasMore ||
        isLoadingMoreSouvenirsRef.current ||
        isLoadingSouvenirs ||
        !hasUserScrolledSouvenirsRef.current
      ) {
        return;
      }

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop > 80 && scrollTop + clientHeight >= scrollHeight - 350) {
        loadNextSouvenirsBatch();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [activeTab, souvenirHasMore, isLoadingSouvenirs, loadNextSouvenirsBatch]);

  // Firestore Quota Detection state
  const [firestoreQuotaExceeded, setFirestoreQuotaExceeded] = useState(false);
  const [isRetryingFirestore, setIsRetryingFirestore] = useState(false);
  const [firestoreUpgradeUrl, setFirestoreUpgradeUrl] = useState(
    'https://console.firebase.google.com/project/watchful-virtue-698sv/firestore/databases/ai-studio-batmitzvahrsvp-7b9fa98e-b18a-4e8a-a9e5-6aa16b5ba9f1/data?openUpgradeDialog=true'
  );

  const checkQuota = async (retry: boolean = false) => {
    try {
      if (retry) setIsRetryingFirestore(true);
      const status = await checkFirestoreStatus(retry);
      setFirestoreQuotaExceeded(status.quotaExceeded);
      if (status.upgradeUrl) setFirestoreUpgradeUrl(status.upgradeUrl);
      if (retry && !status.quotaExceeded) {
        if (onRefreshRSVPs) await onRefreshRSVPs();
        await loadInitialSouvenirs(souvenirStyleFilter, debouncedSouvenirSearch);
      }
    } finally {
      if (retry) setIsRetryingFirestore(false);
    }
  };

  useEffect(() => {
    checkQuota();
  }, []);

  const handleDeleteSouvenir = async (item: SouvenirItem) => {
    try {
      setDeletingSouvenirId(item.id);
      await deleteSouvenir(item.id);
      setSouvenirs((prev) => prev.filter((s) => s.id !== item.id));
      souvenirOffsetRef.current = Math.max(0, souvenirOffsetRef.current - 1);
      setSouvenirTotalCount((prev) => Math.max(0, prev - 1));
      setSouvenirOverallTotal((prev) => Math.max(0, prev - 1));
      if (item.styleId) {
        setSouvenirStyleCounts((prev) => ({
          ...prev,
          [item.styleId]: Math.max(0, (prev[item.styleId] || 1) - 1),
        }));
      }
      setConfirmDeleteSouvenir(null);
      if (previewSouvenir?.id === item.id) {
        setPreviewSouvenir(null);
      }
      setSouvenirDeleteSuccess(`המזכרת של ${item.creatorName} נמחקה מהגלריה בהצלחה`);
      setTimeout(() => setSouvenirDeleteSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete souvenir:', err);
    } finally {
      setDeletingSouvenirId(null);
    }
  };

  // Event settings edit state
  const [editEvent, setEditEvent] = useState<EventDetails>({ ...event });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Google Sheets integration state
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncSheetsStatus, setSyncSheetsStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleSyncWithSheets = async (customUrl?: string) => {
    const urlToUse =
      customUrl !== undefined ? customUrl : editEvent.googleSheetsWebhookUrl || event.googleSheetsWebhookUrl;
    if (!urlToUse || !urlToUse.trim()) {
      setSyncSheetsStatus({
        type: 'error',
        message: 'נא להזין ולשמור קודם את קישור ה-Web App של Google Sheets בהגדרות.',
      });
      return;
    }
    try {
      setIsSyncingSheets(true);
      setSyncSheetsStatus(null);
      const res = await syncWithGoogleSheets(urlToUse.trim());
      if (res.success) {
        if (onRefreshRSVPs) {
          await onRefreshRSVPs();
        }

        const added = res.addedFromSheet ?? 0;
        const updated = res.updatedFromSheet ?? 0;
        const toSheet = res.syncedToSheet ?? res.count;

        let msg = `הסנכרון הדו-כיווני הושלם בהצלחה! ${toSheet} אישורים נשלחו לגיליון`;
        if (added > 0 && updated > 0) {
          msg += `, ${added} אישורים חדשים שהוספתם בגיליון נוספו לאפליקציה ו-${updated} אישורים עודכנו.`;
        } else if (added > 0) {
          msg += `, ו-${added} אישורים חדשים שהוספתם ידנית בקובץ ה-Sheets נוספו כעת לאפליקציה!`;
        } else if (updated > 0) {
          msg += `, ו-${updated} אישורים שעודכנו בגיליון עודכנו באפליקציה.`;
        } else {
          msg += `. כל הנתונים בין האפליקציה ל-Google Sheets מעודכנים ומסונכרנים הדדית.`;
        }

        setSyncSheetsStatus({
          type: 'success',
          message: msg,
        });
        setTimeout(() => setSyncSheetsStatus(null), 8000);
      } else {
        setSyncSheetsStatus({
          type: 'error',
          message: 'הסנכרון נכשל. אנא בדקו את הקישור או את פריסת ה-Apps Script.',
        });
      }
    } catch (err: any) {
      setSyncSheetsStatus({
        type: 'error',
        message: err.message || 'שגיאה בסנכרון מול Google Sheets',
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch (e) {
      console.error('Failed to copy script:', e);
    }
  };

  // Analytics calculation
  const totalAttendingGuests = rsvps
    .filter((r) => r.attending)
    .reduce((sum, r) => sum + r.count, 0);

  const friendsList = rsvps.filter((r) => r.type === 'friend' && r.attending);
  const totalFriendsCount = friendsList.reduce((sum, r) => sum + r.count, 0);

  const familyList = rsvps.filter((r) => r.type === 'family' && r.attending);
  const totalFamilyCount = familyList.reduce((sum, r) => sum + r.count, 0);

  const filteredRSVPs = rsvps.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchContact = r.contactName?.toLowerCase().includes(q) || false;
      const matchPlus = r.plusOneName?.toLowerCase().includes(q) || false;
      const matchPhone = r.phone?.toLowerCase().includes(q) || false;
      return matchName || matchContact || matchPlus || matchPhone;
    }
    return true;
  });

  const filteredSouvenirs = souvenirs;

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`האם למחוק את אישור ההגעה של ${name}?`)) return;
    try {
      setIsDeleting(id);
      await onDeleteRSVP(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await onUpdateEvent(editEvent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCopyParentsLink = async () => {
    try {
      const parentsUrl = `${window.location.origin}/parents`;
      await navigator.clipboard.writeText(parentsUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const exportCSV = () => {
    const headers = [
      'מזהה',
      'סוג',
      'שם / משפחה',
      'מספר אורחים',
      'מגיע/ה',
      'שיר מבוקש',
      'ברכה',
      'תאריך אישור',
    ];

    const rows = rsvps.map((r) => [
      r.id,
      r.type === 'friend' ? 'חברה' : 'משפחה',
      `"${r.name.replace(/"/g, '""')}"`,
      r.count,
      r.attending ? 'כן' : 'לא',
      `"${(r.songRequest || '').replace(/"/g, '""')}"`,
      `"${(r.wishingMessage || '').replace(/"/g, '""')}"`,
      new Date(r.createdAt).toLocaleString('he-IL'),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `אישורי-הגעה-בת-מצווה-${event.celebrantName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C342E] flex flex-col font-['Rubik',sans-serif] selection:bg-[#E2EBE0] selection:text-[#2A3A27]">
      {/* Top Sticky Navigation */}
      <nav className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E3ECE1]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה להזמנה"
            title="חזרה להזמנה"
            className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-[#3C4E3A] hover:text-[#253223] bg-white hover:bg-[#EFF5ED] border border-[#CCD8CA] shadow-2xs transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[#4A5D47]" />
            <span className="hidden sm:inline">חזרה להזמנה</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#2A3628] font-['Rubik',sans-serif]">
              בת המצווה של {event.celebrantName}
            </span>
            <Leaf className="w-3.5 h-3.5 text-[#546A50]" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSyncWithSheets()}
              disabled={isSyncingSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF5EC] hover:bg-[#DEEADB] text-[#2F442C] text-xs font-semibold rounded-full border border-[#BCD0BA] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="סנכרון רשימת מוזמנים ל-Google Sheets"
            >
              {isSyncingSheets ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#435940]" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#435940]" />
              )}
              <span className="hidden sm:inline">סנכרון ל-Sheets</span>
            </button>

            {onOpenSlideshow && (
              <button
                type="button"
                onClick={onOpenSlideshow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B3F2A] hover:bg-[#1E2D1D] text-white text-xs font-bold rounded-full shadow-2xs transition-colors cursor-pointer border border-[#446342]"
                title="פתיחת מסך תצוגה והקרנה לאירוע (Slideshow)"
              >
                <Tv className="w-3.5 h-3.5 text-[#A5D6A0]" />
                <span className="hidden sm:inline">מסך תצוגה להקרנה 📽️</span>
                <span className="sm:hidden">הקרנה 📽️</span>
              </button>
            )}

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#435940] hover:bg-[#344732] text-white text-xs font-semibold rounded-full shadow-2xs transition-colors cursor-pointer"
              title="ייצוא רשימת מוזמנים לאקסל (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ייצוא לאקסל</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Firestore Quota Banner */}
        {firestoreQuotaExceeded && (
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 bg-amber-50/90 text-amber-950 shadow-sm transition-all space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 text-xs sm:text-sm space-y-1">
                <h4 className="font-bold text-amber-900 text-sm sm:text-base">
                  שים לב: מסד הנתונים בפיירבייס הגיע למגבלת הקריאות היומית החינמית (Free Tier Quota)
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  <strong>הנתונים לא נמחקו כלל!</strong> כל אישורי ההגעה והתמונות שנוצרו שמורים במלואם בענן Firestore. עקב מכסת הקריאה היומית החינמית (50,000 קריאות ביום), המערכת מציגה זמנית את נתוני הגיבוי המקומיים.
                </p>
                <p className="text-amber-800 leading-relaxed text-xs">
                  המכסה מתאפסת אוטומטית בחצות (שעון פסיפיק), או שניתן לשדרג בלחיצה לתוכנית Blaze (תשלום לפי שימוש, בעלות של שברי אגורה לחודש) לקריאה ללא הגבלה.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 sm:mr-11">
              <a
                href={firestoreUpgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>צפייה בנתונים ושדרוג ב-Firebase Console</span>
              </a>

              <button
                type="button"
                onClick={() => checkQuota(true)}
                disabled={isRetryingFirestore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isRetryingFirestore ? 'animate-spin' : ''}`} />
                <span>{isRetryingFirestore ? 'בודק התחברות...' : 'בדוק חיבור מחדש עכשיו'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sync Status Banner */}
        {syncSheetsStatus && (
          <div
            className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs transition-all ${
              syncSheetsStatus.type === 'success'
                ? 'bg-[#EEF5EC] border-[#CCDCCD] text-[#2C442A]'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncSheetsStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{syncSheetsStatus.message}</span>
            </div>
            <button
              onClick={() => setSyncSheetsStatus(null)}
              className="p-1 hover:bg-black/5 rounded-full cursor-pointer text-stone-500 hover:text-stone-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header Hero Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E3ECE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF5EC] border border-[#CCDCCD] text-[#3A5037] flex items-center justify-center shadow-inner shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#485E45] bg-[#EAF1E8] px-2.5 py-0.5 rounded-full border border-[#CFDEC9] mb-1">
                <Sparkles className="w-3 h-3 text-[#526D4F]" />
                <span>אזור להורים בלבד</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#243322] font-['Rubik',sans-serif]">
                ניהול אישורי הגעה והגדרות האירוע
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7059] mt-0.5">
                מעקב בזמן אמת אחר חברות ובני משפחה, עריכת פרטי ההזמנה וייצוא הרשימה
              </p>
            </div>
          </div>

          {/* Copy Direct URL for Parents */}
          <button
            type="button"
            onClick={handleCopyParentsLink}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#FAF7F2] hover:bg-[#EEF4EC] text-[#364933] border border-[#CCD9CA] transition-colors cursor-pointer shrink-0"
            title="העתקת הקישור הישיר לעמוד הניהול של ההורים"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-700">הקישור הישיר הועתק!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-[#546A50]" />
                <span>העתקת קישור ישיר לעמוד זה (/parents)</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center overflow-x-auto border-b border-[#E3ECE1] bg-white rounded-2xl px-3 pt-2 shadow-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('rsvps')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'rsvps'
                ? 'border-[#435940] text-[#344732]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            רשימת מוזמנים ({rsvps.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('souvenirs');
              if (souvenirs.length === 0 || souvenirsLoadError) {
                loadInitialSouvenirs(souvenirStyleFilter, debouncedSouvenirSearch);
              }
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'souvenirs'
                ? 'border-[#435940] text-[#344732]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>ניהול תמונות ומזכרות ({souvenirOverallTotal || souvenirs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-[#435940] text-[#344732]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>הגדרות אירוע</span>
          </button>
        </div>

        {/* TAB 1: RSVPs List & KPIs */}
        {activeTab === 'rsvps' && (
          <div className="space-y-6">
            {/* Analytics KPI Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total confirmed */}
              <div className="p-4 rounded-2xl bg-[#F0F5EE] border border-[#D5E2D1]">
                <span className="block text-xs text-[#435940] font-medium">סה"כ מגיעים</span>
                <span className="block text-2xl font-black text-[#2A3628] mt-1 font-['Rubik',sans-serif]">
                  {totalAttendingGuests}
                </span>
                <span className="text-[11px] text-[#556D52]">אורחים מאושרים</span>
              </div>

              {/* Friends */}
              <div className="p-4 rounded-2xl bg-[#EEF5EC] border border-[#D5E2D1]">
                <span className="block text-xs text-[#435940] font-medium">חברות מגיעות</span>
                <span className="block text-2xl font-bold text-[#2A3628] mt-1 font-['Rubik',sans-serif]">
                  {totalFriendsCount}
                </span>
                <span className="text-[11px] text-[#556D52]">
                  {friendsList.length} חברות מאושרות
                </span>
              </div>

              {/* Family: בני משפחה */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#DFE8DC]">
                <span className="block text-xs text-[#3E523A] font-medium">בני משפחה</span>
                <span className="block text-2xl font-bold text-[#2A3628] mt-1 font-['Rubik',sans-serif]">
                  {totalFamilyCount}
                </span>
                <span className="text-[11px] text-[#556D52]">
                  {familyList.length} משפחות ({totalFamilyCount} מגיעים)
                </span>
              </div>

              {/* Total submissions */}
              <div className="p-4 rounded-2xl bg-white border border-[#E3ECE1]">
                <span className="block text-xs text-stone-600 font-medium">סה"כ אישורים</span>
                <span className="block text-2xl font-bold text-stone-900 mt-1 font-['Rubik',sans-serif]">
                  {rsvps.length}
                </span>
                <span className="text-[11px] text-stone-500">
                  {rsvps.filter((r) => !r.attending).length} לא מגיעים
                </span>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3ECE1] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-['Rubik',sans-serif]">
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  הכל ({rsvps.length})
                </button>
                <button
                  onClick={() => setFilterType('friend')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'friend'
                      ? 'bg-white text-[#435940] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  חברות ({rsvps.filter((r) => r.type === 'friend').length})
                </button>
                <button
                  onClick={() => setFilterType('family')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'family'
                      ? 'bg-white text-[#2F372D] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  משפחה ({rsvps.filter((r) => r.type === 'family').length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם..."
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-stone-200 focus:border-[#435940] outline-none"
                />
              </div>
            </div>

            {/* RSVP Table */}
            <div className="bg-white rounded-2xl border border-[#E3ECE1] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-stone-200 text-[#3A4A38] font-semibold">
                    <tr>
                      <th className="py-3 px-4">סוג</th>
                      <th className="py-3 px-4">שם / שמות המגיעים</th>
                      <th className="py-3 px-4">מספר מגיעים</th>
                      <th className="py-3 px-4">שיר מבוקש</th>
                      <th className="py-3 px-4">ברכה</th>
                      <th className="py-3 px-4">תאריך אישור</th>
                      <th className="py-3 px-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRSVPs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400 text-sm">
                          לא נמצאו אישורי הגעה תואמים
                        </td>
                      </tr>
                    ) : (
                      filteredRSVPs.map((r) => (
                        <tr key={r.id} className="hover:bg-[#F5F8F4] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.type === 'friend'
                                  ? 'bg-[#EEF5EC] text-[#384C35]'
                                  : 'bg-[#F4F1EA] text-[#2E372C]'
                              }`}
                            >
                              {r.type === 'friend' ? 'חברה' : 'משפחה'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-stone-900">
                            <div>{r.name}</div>
                            {r.contactName && r.contactName !== r.name && (
                              <div className="text-[11px] text-stone-500 font-normal">
                                איש קשר: {r.contactName}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {r.attending ? (
                              <div className="font-bold text-[#3B4E38]">
                                {r.type === 'friend' ? '1 מגיעה' : `${r.count} מגיעים`}
                              </div>
                            ) : (
                              <span className="text-stone-400 font-medium">לא מגיעים</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs truncate text-[#3F543C]">
                            {r.songRequest ? (
                              <div className="flex items-center gap-1.5 font-medium">
                                <Music className="w-3.5 h-3.5 text-[#526D4F] shrink-0" />
                                <span>{r.songRequest}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs truncate text-stone-600">
                            {r.wishingMessage ? (
                              <span className="italic font-light">"{r.wishingMessage}"</span>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-stone-500 text-[11px]">
                            {new Date(r.createdAt).toLocaleDateString('he-IL')}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(r.id, r.name)}
                              disabled={isDeleting === r.id}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="מחיקת אישור הגעה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Souvenirs Photo Management for Parents */}
        {activeTab === 'souvenirs' && (
          <div className="space-y-6">
            {/* Success notification if souvenir was deleted */}
            {souvenirDeleteSuccess && (
              <div className="p-3.5 rounded-2xl bg-[#EEF5EC] border border-[#CCDCCD] text-[#30482E] text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-[#435940] shrink-0" />
                <span>{souvenirDeleteSuccess}</span>
              </div>
            )}

            {/* Prominent Slideshow Feature Hero Banner */}
            <div className="bg-gradient-to-r from-[#212E24] via-[#2D3E30] to-[#1E2A20] border-2 border-[#486749] rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-right">
                <div className="w-13 h-13 rounded-2xl bg-[#374C3A] border border-[#597F5C] flex items-center justify-center text-3xl shadow-inner shrink-0">
                  📽️
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#A8D3A4] bg-[#162118] px-2.5 py-0.5 rounded-full border border-[#3E5C41] mb-1">
                    <Sparkles className="w-3 h-3 text-[#A8D3A4]" />
                    <span>מצב הקרנה לאולם האירועים</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Rubik',sans-serif]">
                    מסך תצוגה והקרנה לאירוע (Slideshow)
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 font-normal mt-0.5 leading-relaxed max-w-xl">
                    הקרנת כל התמונות והמזכרות של האורחים במסך מלא על גבי מקרן. המערכת טוענת ושומרת את כל התמונות מראש לקש מקומי (IndexedDB), כך שתוכלו לנתק את האינטרנט ולהקרין ברצף ללא חשש מניתוקים.
                  </p>
                </div>
              </div>

              {onOpenSlideshow && (
                <button
                  type="button"
                  onClick={onOpenSlideshow}
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#4E7649] to-[#63935C] hover:from-[#3F613B] hover:to-[#527D4C] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-[#7BB174]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>פתיחת מסך הקרנה (Slideshow) 📽️</span>
                </button>
              )}
            </div>

            {/* Header info & actions */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3ECE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="text-right">
                <h2 className="text-lg sm:text-xl font-bold text-[#253322] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#4A5D47]" />
                  <span>ניהול תמונות ומזכרות בגלריה ({souvenirOverallTotal || souvenirs.length})</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#5C7059] mt-1 max-w-2xl leading-relaxed">
                  צפייה בכל התמונות שנוצרו על ידי האורחים בגלריה. באפשרותכם להגדיל כל תמונה, או למחוק תמונות שלא יצאו טוב, תמונות כפולות או תמונות שהועלו בטעות.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadInitialSouvenirs(souvenirStyleFilter, debouncedSouvenirSearch)}
                disabled={isLoadingSouvenirs}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#EEF4EC] text-[#344732] border border-[#CCD9CA] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSouvenirs ? 'animate-spin' : ''}`} />
                <span>רענון רשימת התמונות</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3ECE1] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם היוצר או סגנון..."
                  value={souvenirSearch}
                  onChange={(e) => setSouvenirSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm outline-none focus:border-[#435940] text-right"
                />
              </div>

              {/* Style filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none text-right">
                <button
                  type="button"
                  onClick={() => setSouvenirStyleFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    souvenirStyleFilter === 'all'
                      ? 'bg-[#3B4E38] text-white shadow-2xs'
                      : 'bg-[#FAF7F2] hover:bg-[#EFF5ED] text-[#4A5D47] border border-[#D5E1D3]'
                  }`}
                >
                  הכל ({souvenirOverallTotal || souvenirs.length})
                </button>
                {SOUVENIR_STYLES.map((style) => {
                  const count =
                    souvenirStyleCounts[style.id] ??
                    souvenirs.filter((s) => s.styleId === style.id).length;
                  if (count === 0 && souvenirStyleFilter !== style.id) return null;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSouvenirStyleFilter(style.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                        souvenirStyleFilter === style.id
                          ? 'bg-[#3B4E38] text-white shadow-2xs'
                          : 'bg-[#FAF7F2] hover:bg-[#EFF5ED] text-[#4A5D47] border border-[#D5E1D3]'
                      }`}
                    >
                      <span>{style.emoji}</span>
                      <span>{style.name}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photos Grid */}
            {isLoadingSouvenirs ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-[#E3ECE1]">
                <div className="w-10 h-10 border-3 border-[#3B4E38]/20 border-t-[#3B4E38] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-[#5B6D57]">טוען תמונות מהגלריה...</p>
              </div>
            ) : souvenirsLoadError ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-red-200 p-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#2A3728]">{souvenirsLoadError}</h3>
                <button
                  type="button"
                  onClick={() => loadInitialSouvenirs(souvenirStyleFilter, debouncedSouvenirSearch)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B4E38] hover:bg-[#2F402D] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>נסה לטעון שוב</span>
                </button>
              </div>
            ) : filteredSouvenirs.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-[#E3ECE1] p-8">
                <div className="w-16 h-16 rounded-full bg-[#EEF5EC] border border-[#CCDCCD] flex items-center justify-center text-3xl mx-auto mb-3">
                  🖼️
                </div>
                <h3 className="text-base font-bold text-[#2A3728] mb-1">
                  {souvenirSearch || souvenirStyleFilter !== 'all'
                    ? 'לא נמצאו תמונות התואמות לחיפוש'
                    : 'אין עדיין תמונות בגלריה'}
                </h3>
                <p className="text-xs sm:text-sm text-[#5E725B] max-w-md mx-auto">
                  {souvenirSearch || souvenirStyleFilter !== 'all'
                    ? 'נסו לשנות את מילות החיפוש או לבחור סגנון אחר'
                    : 'ברגע שאורחים יעצבו מזכרות, הן יופיעו כאן ותוכלו לצפות בהן ולמחוק תמונות שלא יצאו מוצלחות.'}
                </p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
                {filteredSouvenirs.map((item) => {
                  const styleObj = SOUVENIR_STYLES.find((s) => s.id === item.styleId);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#E3DBD0] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Thumbnail Image Container */}
                      <div
                        onClick={() => setPreviewSouvenir(item)}
                        className="relative aspect-square w-full bg-stone-100 cursor-pointer overflow-hidden select-none"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.styleName}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Style Badge */}
                        <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-xs text-white text-[10.5px] font-medium px-2 py-0.5 rounded-full border border-white/20 truncate max-w-[120px] flex items-center gap-1">
                          <span>{styleObj?.emoji || '✨'}</span>
                          <span>{item.styleName}</span>
                        </div>

                        {/* Quick View Overlay */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>הגדלה</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Content & Delete Action */}
                      <div className="p-3 text-right flex-1 flex flex-col justify-between space-y-2.5">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#253322] truncate">
                            {item.creatorName}
                          </p>
                          <p className="text-[11px] text-[#6E806B] font-normal truncate mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('he-IL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-[#EEF2EC] flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewSouvenir(item)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EEF4EC] text-[#344732] border border-[#CCD8CA] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>הגדלה</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSouvenir(item)}
                            disabled={deletingSouvenirId === item.id}
                            className="py-1.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="מחיקת תמונה מהגלריה"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">מחיקה</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sentinel element for infinite autoscroll */}
              <div ref={souvenirSentinelRef} className="h-8 w-full pointer-events-none" />

              {/* Subtle Loading Spinner Indicator while autoscrolling */}
              {isLoadingMoreSouvenirs && (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#52684E] animate-in fade-in duration-150">
                  <div className="w-4 h-4 border-2 border-[#3B4E38]/20 border-t-[#3B4E38] rounded-full animate-spin" />
                  <span>טוען 20 תמונות נוספות...</span>
                </div>
              )}

              {/* End of gallery indicator */}
              {!souvenirHasMore && souvenirs.length > 0 && (
                <div className="py-6 text-center text-xs text-[#7A8F76] font-medium">
                  🌿 הוצגו כל המזכרות ({souvenirTotalCount || souvenirs.length}) 🌿
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: Event Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E3ECE1] shadow-xs">
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl mx-auto">
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-[#EEF5EC] border border-[#CCDCCD] text-[#30482E] text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#435940] shrink-0" />
                  <span>הפרטים עודכנו בהצלחה ומוצגים כעת בהזמנה!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    שם כלת השמחה
                  </label>
                  <input
                    type="text"
                    value={editEvent.celebrantName}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, celebrantName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    כותרת משנה / סלוגן
                  </label>
                  <input
                    type="text"
                    value={editEvent.subTitle}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, subTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    תאריך האירוע
                  </label>
                  <input
                    type="date"
                    value={editEvent.date}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    שעת פתיחה
                  </label>
                  <input
                    type="time"
                    value={editEvent.time}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, time: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    שם האולם / המקום
                  </label>
                  <input
                    type="text"
                    value={editEvent.venueName}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, venueName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    כתובת מלאה
                  </label>
                  <input
                    type="text"
                    value={editEvent.address}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, address: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                  />
                </div>
              </div>

              {/* הודעת פתיחה מכלת בת המצווה (fixed from מנועה) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  הודעת פתיחה מכלת בת המצווה (מופיעה בהזמנה)
                </label>
                <textarea
                  rows={2}
                  value={editEvent.welcomeMessage}
                  onChange={(e) =>
                    setEditEvent({ ...editEvent, welcomeMessage: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940]"
                />
              </div>

              {/* Google Sheets Integration Card */}
              <div className="pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#435940]" />
                    <span>חיבור וסנכרון דו-כיווני מלא ל-Google Sheets</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="text-[11px] font-semibold text-[#385135] hover:text-[#253723] underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>מדריך התקנה וקוד מוכן</span>
                  </button>
                </div>
                
                <p className="text-[11px] text-[#556D52] mb-2 leading-relaxed">
                  <strong>סנכרון דו-כיווני מלא:</strong> כל אישור הגעה מהאפליקציה נשלח ומסתנכרן לגיליון (כולל רטרואקטיבית בלחיצת כפתור), ובנוסף - כל שורה שתוסיפו או תערכו ידנית בקובץ ה-Google Sheets תתווסף ותתעדכן אוטומטית באפליקציה!
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={editEvent.googleSheetsWebhookUrl || ''}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, googleSheetsWebhookUrl: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs outline-none focus:border-[#435940] font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSyncWithSheets(editEvent.googleSheetsWebhookUrl)}
                    disabled={isSyncingSheets || !editEvent.googleSheetsWebhookUrl}
                    className="px-3.5 py-2 rounded-xl bg-[#EEF5EC] hover:bg-[#DEEBDB] text-[#2C4129] text-xs font-semibold border border-[#BDD1BA] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSyncingSheets ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#435940]" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-[#435940]" />
                    )}
                    <span>בדוק וסנכרן כעת</span>
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3 rounded-2xl bg-[#374934] hover:bg-[#283825] text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? 'שומר שינויים...' : 'שמירת פרטי אירוע'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Google Apps Script Modal */}
      {showScriptModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScriptModal(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 font-['Rubik',sans-serif]"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF5EC] border border-[#CCDCCD] flex items-center justify-center text-[#3A5037]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    חיבור האפליקציה ל-Google Sheets
                  </h3>
                  <p className="text-xs text-stone-500">
                    סנכרון אוטומטי של כל אישורי ההגעה ישירות לחשבון הגוגל שלכם
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & Steps */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-stone-700 leading-relaxed">
              <div className="bg-[#F2F7F0] border border-[#CCE0CA] p-3.5 rounded-2xl">
                <span className="font-bold text-[#2A4027] block mb-1">
                  7 העמודות שיישמרו ויסתנכרנו אוטומטית בגיליון:
                </span>
                <span className="text-[#3E553B] font-medium">
                  סוג • שם • שיר מבוקש • ברכה • תאריך אישור • מספר מגיעים • מזהה מערכת
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-stone-900 text-sm">איך להגדיר / לעדכן גרסה ב-Apps Script:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-600 pr-1">
                  <li>פתחו את גיליון ה-<strong>Google Sheets</strong> שלכם.</li>
                  <li>בתפריט העליון לחצו על <strong>הרחבות (Extensions) &gt; Apps Script</strong>.</li>
                  <li>החליפו את כל הקוד הקיים בעורך בקוד המוכן שלמטה ולחצו <strong>שמור (Save / Ctrl+S)</strong>.</li>
                  <li>
                    לחצו למעלה על <strong>פריסה (Deploy) &gt; ניהול פריסות (Manage deployments)</strong>.
                  </li>
                  <li>
                    לחצו על סמל העיפרון (Edit / עריכה) בצד שמאל, ובשדה <strong>גרסה (Version)</strong> בחרו <strong>גרסה חדשה (New version)</strong>.
                  </li>
                  <li>לחצו על <strong>פריסה (Deploy)</strong> — הקישור נשאר בדיוק אותו קישור, אין צורך להעתיק מחדש!</li>
                </ol>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">הקוד המוכן להעתקה (Apps Script):</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#435940] hover:bg-[#344732] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>הקוד הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>העתק קוד</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <pre
                    dir="ltr"
                    className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed select-all"
                  >
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-stone-100 bg-[#FAF7F2] flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                * המערכת תומכת גם בסנכרון רטרואקטיבי בלחיצת כפתור אחת.
              </span>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E3ECE1] bg-white/70 backdrop-blur-xs py-6 px-4 text-center text-xs sm:text-sm text-[#4E614B] font-medium mt-12">
        חוגגים לאורי בת מצווה 🌿 מחכים לכם, משפחת קלזן
      </footer>

      {/* Parents Full Preview Modal */}
      {previewSouvenir && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewSouvenir(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 font-['Rubik',sans-serif]"
        >
          <div className="relative w-fit max-w-[95vw] sm:max-w-[85vw] flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-[#FAF7F0] border border-[#E3DBD0] animate-in fade-in zoom-in-95 duration-200">
            {/* Top Bar: Close */}
            <button
              type="button"
              onClick={() => setPreviewSouvenir(null)}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/20"
              title="סגירה"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Bar: Style center */}
            <div className="absolute top-3 sm:top-4 inset-x-16 sm:inset-x-20 z-20 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border border-white/20 shadow-md truncate">
                {previewSouvenir.styleName}
              </div>
            </div>

            {/* Image */}
            <img
              src={previewSouvenir.imageUrl}
              alt={previewSouvenir.styleName}
              className="block w-auto h-auto max-w-[92vw] sm:max-w-[85vw] max-h-[75vh] object-contain select-none mx-auto"
            />

            {/* Footer with Creator & Delete Button */}
            <div className="w-full p-4 bg-[#FAF7F0] border-t border-[#E3DBD0] flex items-center justify-between gap-3 text-right">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#253322]">
                  נוצר ע״י {previewSouvenir.creatorName}
                </p>
                <p className="text-[11px] text-[#6E806B]">
                  {new Date(previewSouvenir.createdAt).toLocaleDateString('he-IL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const safeName = (previewSouvenir.creatorName || 'guest')
                      .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
                    const link = document.createElement('a');
                    link.href = previewSouvenir.imageUrl;
                    link.download = `mazkeret-${safeName}.png`;
                    link.click();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EEF4EC] text-[#344732] border border-[#CCD8CA] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>הורדה</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteSouvenir(previewSouvenir)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>מחיקה מהגלריה</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parents Delete Confirmation Modal */}
      {confirmDeleteSouvenir && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingSouvenirId) {
              setConfirmDeleteSouvenir(null);
            }
          }}
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-['Rubik',sans-serif]"
        >
          <div className="bg-[#FAF7F0] border border-[#E3DBD0] max-w-sm w-full rounded-3xl p-5 sm:p-6 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-3.5 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[#2A3728] mb-1.5">
              מחיקת תמונה מהגלריה
            </h4>
            <p className="text-xs sm:text-sm text-[#5E725B] leading-relaxed mb-5">
              האם למחוק לצמיתות את התמונה שנוצרה על ידי <strong className="text-stone-900 font-bold">{confirmDeleteSouvenir.creatorName}</strong>? התמונה תוסר מגלריית האירוע של כל האורחים.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteSouvenir(null)}
                disabled={Boolean(deletingSouvenirId)}
                className="px-4 py-2 rounded-xl border border-[#CCD8CA] bg-white hover:bg-[#F0F5EE] text-xs sm:text-sm font-semibold text-[#3E523A] transition-colors cursor-pointer disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSouvenir(confirmDeleteSouvenir)}
                disabled={Boolean(deletingSouvenirId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingSouvenirId ? 'מוחק...' : 'כן, למחוק תמונה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
