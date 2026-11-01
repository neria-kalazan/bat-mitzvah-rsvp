import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  AlertCircle,
  Check,
  Leaf,
  Layers,
  Wand2,
  Trash2,
  X,
} from 'lucide-react';
import { EventDetails, RSVP } from '../types';
import { SOUVENIR_STYLES, SouvenirStyle } from '../data/souvenirStyles';
import {
  compressUserImage,
  applyDedicationOverlay,
  downloadDataUrl,
  shareOrDownloadImage,
  getOrCreateGuestId,
  recordMySouvenirId,
  removeMySouvenirId,
  ProcessedImage,
} from '../utils/imageProcessing';
import {
  fetchSouvenirQuota,
  generatePersonalPhotoSouvenir,
  saveSouvenirToGallery,
  deleteSouvenir,
  SouvenirQuotaResponse,
} from '../services/api';

interface PersonalPhotoSouvenirPageProps {
  event: EventDetails;
  onBack: () => void;
  onOpenGallery: () => void;
  primaryRsvp?: RSVP | null;
}

export const PersonalPhotoSouvenirPage: React.FC<PersonalPhotoSouvenirPageProps> = ({
  event,
  onBack,
  onOpenGallery,
  primaryRsvp,
}) => {
  const [guestId] = useState<string>(() => getOrCreateGuestId());
  const [quota, setQuota] = useState<SouvenirQuotaResponse>({
    guestId,
    used: 0,
    max: 999,
    remaining: 999,
    unlimited: true,
  });
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  // Uploaded photo state
  const [uploadedImage, setUploadedImage] = useState<ProcessedImage | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Customization state
  const [selectedStyle, setSelectedStyle] = useState<SouvenirStyle>(SOUVENIR_STYLES[0]);
  const [customPrompt, setCustomPrompt] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [rawGeneratedUrl, setRawGeneratedUrl] = useState<string | null>(null);
  const [currentSouvenirId, setCurrentSouvenirId] = useState<string | null>(null);
  const [isDeletingCurrent, setIsDeletingCurrent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Load guest quota on mount
  useEffect(() => {
    async function loadQuota() {
      try {
        setIsLoadingQuota(true);
        const data = await fetchSouvenirQuota(guestId);
        setQuota(data);
      } catch (err) {
        console.error('Failed to load quota', err);
      } finally {
        setIsLoadingQuota(false);
      }
    }
    loadQuota();
  }, [guestId]);

  // Loading animation step cyclist
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle photo file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingUpload(true);
      setErrorMessage(null);
      const processed = await compressUserImage(file, 1536, 0.88);
      setUploadedImage(processed);
      // Reset previous results when new photo is picked
      setFinalImageUrl(null);
      setRawGeneratedUrl(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'שגיאה בטעינת התמונה, אנא נסו קובץ אחר');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Trigger file input
  const handlePickPhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Generate Souvenir
  const handleGenerate = async () => {
    if (!uploadedImage) {
      setErrorMessage('אנא העלו תמונה לפני יצירת המזכרת');
      return;
    }

    if (!quota.unlimited && quota.remaining <= 0) {
      setErrorMessage('מיצית את מכסת המזכרות האישיות לאירוע זה.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setLoadingStep(0);

      // 1. Send request to backend
      const response = await generatePersonalPhotoSouvenir({
        guestId,
        photoBase64: uploadedImage.base64,
        mimeType: uploadedImage.mimeType,
        styleId: selectedStyle.id,
        customPrompt: customPrompt.trim() || undefined,
        creatorName: primaryRsvp?.name || undefined,
      });

      setRawGeneratedUrl(response.imageUrl);
      setQuota((prev) => ({
        ...prev,
        used: response.used,
        remaining: response.remaining,
      }));

      // 2. The server generates and stamps the commemorative dedication directly with high-fidelity vector styling
      const finalUrl = response.imageUrl;
      setFinalImageUrl(finalUrl);

      if (response.id) {
        recordMySouvenirId(response.id);
        setCurrentSouvenirId(response.id);
      }

      // Scroll smoothly to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    } catch (err: any) {
      console.error('Souvenir generation failed:', err);
      setErrorMessage(err.message || 'אירעה שגיאה ביצירת המזכרת. אנא נסו שוב בעוד רגע.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download final image
  const handleDownload = () => {
    if (!finalImageUrl) return;
    const filename = `mazkeret-bat-mitzvah-ori-${selectedStyle.id}.png`;
    downloadDataUrl(finalImageUrl, filename);
  };

  // Share final image
  const handleShare = async () => {
    if (!finalImageUrl) return;
    const filename = `mazkeret-bat-mitzvah-ori-${selectedStyle.id}.png`;
    const res = await shareOrDownloadImage(
      finalImageUrl,
      filename,
      'מזכרת מבת המצווה של אורי קלזן',
      'תראו את תמונת המזכרת המעוצבת שיצרתי לבת המצווה של אורי קלזן! ✨🌿'
    );
    if (res.shared) {
      setShareSuccess('התמונה שותפה בהצלחה!');
      setTimeout(() => setShareSuccess(null), 3000);
    } else if (res.downloaded) {
      setShareSuccess('התמונה הורדה בהצלחה למכשיר!');
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  // Immediate delete of generated souvenir
  const handleDeleteCurrentSouvenir = async () => {
    try {
      setIsDeletingCurrent(true);
      if (currentSouvenirId) {
        await deleteSouvenir(currentSouvenirId);
        removeMySouvenirId(currentSouvenirId);
      }
      setFinalImageUrl(null);
      setRawGeneratedUrl(null);
      setCurrentSouvenirId(null);
      setShowDeleteConfirm(false);
      setShareSuccess('התמונה נמחקה בהצלחה מהגלריה');
      setTimeout(() => setShareSuccess(null), 3500);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to delete generated souvenir:', err);
      setErrorMessage('אירעה שגיאה במחיקת התמונה, אנא נסו שוב');
    } finally {
      setIsDeletingCurrent(false);
    }
  };

  const loadingMessages = [
    'מנתח את התמונה ומשמר את תווי הפנים...',
    `מחיל את הסגנון המבוקש (${selectedStyle.name})...`,
    'מעבד את התאורה, הרקע והאווירה החגיגית...',
    'מוסיף את ההקדשה החגיגית של אורי קלזן...',
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C342E] flex flex-col font-['Rubik',sans-serif] selection:bg-[#E2EBE0] selection:text-[#2A3A27]">
      {/* Top Sticky Bar */}
      <nav className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E3ECE1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
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
            <span className="text-xs font-bold text-[#2A3628] font-['Rubik',sans-serif]">
              בת המצווה של {event.celebrantName}
            </span>
            <Leaf className="w-3.5 h-3.5 text-[#546A50]" />
          </div>

          {/* Quota Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium border ${
              !quota.unlimited && quota.remaining <= 0
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-[#EEF5EC] text-[#344E31] border-[#CCDCCD]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#526D4F] shrink-0" />
            <span className="font-bold">
              {isLoadingQuota
                ? '...'
                : quota.unlimited
                ? 'יצירה חופשית ✨'
                : `${quota.used}/${quota.max} מזכרות`}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header Hero */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#485E45] bg-[#EAF1E8] px-3.5 py-1 rounded-full border border-[#CFDEC9]">
            <Sparkles className="w-3.5 h-3.5 text-[#546A50]" />
            <span>סטודיו מזכרות AI</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#243322] font-['Rubik',sans-serif]">
            עיצוב תמונת מזכרת אישית
          </h1>

          <p className="text-xs sm:text-sm text-[#556952] max-w-md mx-auto font-normal leading-relaxed">
            העלו תמונה שלכם, בחרו סגנון חגיגי וקבלו מזכרת אישית ומעוצבת מבת המצווה של אורי קלזן!
          </p>

          {primaryRsvp?.name && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-[#CCD8CA] rounded-full text-xs text-[#2E3C2C] shadow-2xs font-medium">
                <span>מזכרת אישית עבור:</span>
                <strong className="font-bold text-[#1E271D]">{primaryRsvp.name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quota Depleted Banner (if enabled and 0 left) */}
        {!quota.unlimited && quota.remaining <= 0 && (
          <div className="p-4 rounded-2xl bg-[#FFF9ED] border border-[#F0DCB0] text-[#7A5B22] text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-[#B88728] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-0.5">מיצית את מכסת המזכרות ({quota.max} מתוך {quota.max})</div>
              <div>
                יצרת כבר {quota.max} מזכרות אישיות לאירוע זה (נשארו 0 פעמים). ניתן לשמור ולשתף את התמונות שכבר יצרת למטה. תודה שהשתתפת בחגיגה! 💚
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Upload Photo */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3ECE1] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0F5EE] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#EAF1E8] text-[#344E31] text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#2A3728]">
                העלאת תמונה מהמכשיר
              </h2>
            </div>

            {uploadedImage && (
              <button
                type="button"
                onClick={handlePickPhotoClick}
                className="text-xs text-[#485E45] hover:text-[#253323] underline font-medium cursor-pointer"
              >
                החלפת תמונה
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!uploadedImage ? (
            /* Upload Drop Area */
            <div
              onClick={handlePickPhotoClick}
              className="border-2 border-dashed border-[#CFDEC9] hover:border-[#4B6347] bg-[#FAFDF9] hover:bg-[#F3F8F1] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#D5E1D3] shadow-xs flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform text-[#485E45]">
                <Upload className="w-6 h-6" />
              </div>

              <div className="text-sm font-bold text-[#2A3728] mb-1">
                {isProcessingUpload ? 'מעבד את התמונה...' : 'לחצו כאן להעלאת תמונה מהמכשיר'}
              </div>

              <p className="text-xs text-[#5D6F5A] max-w-sm mx-auto">
                תמונה אישית, סלפי או תמונה קבוצתית עם חברות ומשפחה. המודל שומר על תווי הפנים שלכם ומעצב אותם בסגנון הנבחר.
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-medium text-stone-500 border border-stone-200">
                <span>JPEG · PNG · WEBP</span>
              </div>
            </div>
          ) : (
            /* Image Preview Area */
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F9FBF8] p-4 rounded-2xl border border-[#DFE8DC]">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-[#D5E1D3] shadow-xs shrink-0 bg-stone-100">
                <img
                  src={uploadedImage.dataUrl}
                  alt="תצוגה מקדימה לתמונה שהועלתה"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 text-center sm:text-right space-y-1">
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>התמונה מוכנה לעיבוד</span>
                </div>
                <div className="text-sm font-bold text-[#2A3628]">
                  התמונה נטענה בהצלחה
                </div>
                <p className="text-xs text-[#586A55] leading-relaxed">
                  המודל ישמר את הדמיון המירבי, תווי הפנים וכמות האנשים בתמונה זו, וישנה רק את הסגנון, הרקע והאווירה.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePickPhotoClick}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#344B30] bg-white hover:bg-[#EDF4EB] border border-[#CCDCCD] transition-colors shrink-0 cursor-pointer"
              >
                בחירת תמונה אחרת
              </button>
            </div>
          )}
        </section>

        {/* STEP 2: Choose Style */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3ECE1] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F0F5EE] pb-3">
            <span className="w-6 h-6 rounded-full bg-[#EAF1E8] text-[#344E31] text-xs font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2A3728]">
                בחירת סגנון למזכרת
              </h2>
              <p className="text-xs text-[#63765F]">
                בחרו את הסגנון האמנותי שתרצו להחיל על התמונה:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {SOUVENIR_STYLES.map((style) => {
              const isSelected = selectedStyle.id === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  className={`relative p-3 rounded-2xl text-right transition-all flex flex-col justify-between cursor-pointer border ${
                    isSelected
                      ? 'bg-[#EEF5EC] border-[#435940] shadow-sm ring-2 ring-[#435940]/25'
                      : 'bg-[#FAFDF9] border-[#E3ECE1] hover:border-[#CCDCCD] hover:bg-[#F3F8F1]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#435940] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}

                  <div className="text-2xl mb-1.5">{style.emoji}</div>

                  <div>
                    <div className="text-xs font-bold text-[#253323] leading-tight mb-1">
                      {style.name}
                    </div>
                    <div className="text-[10px] text-[#556952] leading-snug line-clamp-2">
                      {style.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 3: Optional Custom Prompt */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3ECE1] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#F0F5EE] pb-3">
            <span className="w-6 h-6 rounded-full bg-[#EAF1E8] text-[#344E31] text-xs font-bold flex items-center justify-center">
              3
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-[#2A3728]">
                  תיאור אישי חופשי
                </h2>
                <span className="text-[11px] text-stone-400 font-normal">(אופציונלי)</span>
              </div>
              <p className="text-xs text-[#63765F]">
                רוצים להוסיף משהו מיוחד לתמונה?
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="למשל: הוסיפו רקע של חוף שקיעה חמים, נרות חגיגיים, או פרחים לבנים..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#435940] focus:ring-2 focus:ring-[#435940]/20 text-xs sm:text-sm outline-none transition-all resize-none placeholder:text-stone-400"
            />

            <div className="text-[11px] text-[#697E66] flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#546A50]" />
              <span>התיאור ישתלב עם הסגנון הנבחר ({selectedStyle.name}).</span>
            </div>
          </div>
        </section>

        {/* STEP 4: Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!uploadedImage || isGenerating || (!quota.unlimited && quota.remaining <= 0)}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#435940] via-[#354733] to-[#263424] hover:opacity-95 active:scale-[0.99] text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-[#526D4E]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{loadingMessages[loadingStep]}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#D4E5D1]" />
                <span>צרו לי מזכרת</span>
              </>
            )}
          </button>

          {!uploadedImage && (
            <p className="text-center text-xs text-[#6B8069]">
              * יש להעלות תמונה כדי להתחיל ביצירת המזכרת
            </p>
          )}
        </div>

        {/* STEP 5: Final Result Display */}
        {finalImageUrl && (
          <section
            ref={resultRef}
            className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D5E1D3] shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-300"
          >
            <div className="flex items-center justify-between border-b border-[#F0F5EE] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#EEF5EC] text-[#2F4A2C] flex items-center justify-center">
                  ✨
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#2A3728]">
                    המזכרת האישית שלכם מוכנה!
                  </h3>
                  <p className="text-xs text-[#5D6F5A]">
                    כולל הקדשה רשמית מבת המצווה של אורי קלזן
                  </p>
                </div>
              </div>

              <div className="text-xs text-[#435940] font-semibold bg-[#EEF5EC] px-3 py-1 rounded-full border border-[#D0E0CE]">
                סגנון: {selectedStyle.name}
              </div>
            </div>

            {/* Rendered Image Container - hugs exact image dimensions without empty margins */}
            <div
              onClick={() => setIsPreviewModalOpen(true)}
              className="relative rounded-2xl overflow-hidden border border-[#D5E1D3] bg-[#FAF7F2] shadow-md w-fit max-w-[95vw] sm:max-w-lg mx-auto group cursor-pointer"
              title="לחצו להגדלה וצפייה מלאה"
            >
              {/* Delete Button on top-left of the image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                disabled={isDeletingCurrent}
                title="מחיקת התמונה"
                aria-label="מחיקת התמונה"
                className="absolute top-3 left-3 z-20 w-10 h-10 rounded-full bg-red-600/90 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center shadow-lg backdrop-blur-xs transition-all cursor-pointer border border-white/30 hover:shadow-xl hover:scale-105"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <img
                src={finalImageUrl}
                alt="מזכרת אישית מבת המצווה של אורי קלזן"
                className="block w-auto h-auto max-w-full max-h-[520px] object-contain mx-auto select-none"
              />

              {/* Hover overlay with view prompt */}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                  צפייה מלאה
                </span>
              </div>
            </div>

            {/* Share Success Toast */}
            {shareSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center animate-in fade-in">
                {shareSuccess}
              </div>
            )}

            {/* Actions: Download, Share, Try Another Style, Upload New */}
            <div className="space-y-2.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-3 px-4 rounded-xl bg-[#2A3728] hover:bg-[#1C251B] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>שמירת התמונה למכשיר</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="py-3 px-4 rounded-xl bg-[#EEF5EC] hover:bg-[#DFEDE0] text-[#2F4A2C] border border-[#CCDCCD] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#3D5A39]" />
                  <span>שיתוף המזכרת</span>
                </button>
              </div>

              {/* Direct Link to Community Gallery right after generation */}
              <button
                type="button"
                onClick={onOpenGallery}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3B4E38] to-[#4F674A] hover:from-[#2F402D] hover:to-[#3E523A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>לצפייה בכל המזכרות בגלריה</span>
                <ArrowLeft className="w-4 h-4 text-[#C2D7BF]" />
              </button>

              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-[#556952]">
                <button
                  type="button"
                  onClick={() => {
                    // Keep uploaded image, smooth scroll up to styles
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="hover:underline hover:text-[#253323] cursor-pointer"
                >
                  ↺ לנסות סגנון אחר עם אותה תמונה
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImage(null);
                    setFinalImageUrl(null);
                    setCustomPrompt('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:underline hover:text-[#253323] cursor-pointer"
                >
                  + יצירת מזכרת מתמונה חדשה
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Fluid Gallery Transition at the bottom of the page */}
        <div className="mt-12 bg-gradient-to-l from-[#FAF7F0] via-[#F4EFE6] to-[#EEF5EC] border border-[#CCDCCD] rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(58,68,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/90 border border-[#CCDCCD] flex items-center justify-center text-2xl shadow-inner shrink-0">
              🖼️
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#273424]">
                רוצים לראות את המזכרות של כולם?
              </h4>
              <p className="text-xs sm:text-sm text-[#5B6D57] mt-0.5">
                כל התמונות והעיצובים המרהיבים שיצרו האורחים והחברות מחכים בגלריה
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenGallery}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#3B4E38] hover:bg-[#2F402D] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 border border-[#4F674A]"
          >
            <span>מעבר לגלריית המזכרות</span>
            <ArrowLeft className="w-4 h-4 text-[#C2D7BF]" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E3ECE1] bg-white/70 backdrop-blur-xs py-6 px-4 text-center text-xs text-[#5D6F5A] mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-medium text-[#384A35]">
            <Leaf className="w-3.5 h-3.5 text-[#546A50]" />
            <span>מזכרת אישית · בת המצווה של אורי קלזן · כב' כסלו תשפ"ז</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-[#4F644C] hover:text-[#243322] underline cursor-pointer"
          >
            חזרה להזמנה הראשית
          </button>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingCurrent) {
              setShowDeleteConfirm(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-['Rubik',sans-serif]"
        >
          <div className="bg-[#FAF7F0] border border-[#E3DBD0] max-w-sm w-full rounded-3xl p-5 sm:p-6 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-3.5 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#273424] mb-1">
              למחוק את התמונה שנוצרה?
            </h3>
            <p className="text-xs sm:text-sm text-[#5B6D57] leading-relaxed mb-5">
              התמונה תימחק מיד מהגלריה ולא תישמר. תוכלו לבחור תמונה אחרת או סגנון חדש!
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDeleteCurrentSouvenir}
                disabled={isDeletingCurrent}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingCurrent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>מוחק...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>כן, למחוק עכשיו</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingCurrent}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs sm:text-sm border border-stone-200 transition-colors cursor-pointer"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Souvenir Image Modal - perfectly fitted to image width and height plus footer */}
      {isPreviewModalOpen && finalImageUrl && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewModalOpen(false);
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
              onClick={handleDownload}
              title="הורדת התמונה"
              aria-label="הורדת התמונה"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Top Bar: Style displayed in the middle between download and close icons */}
            <div className="absolute top-3 sm:top-4 inset-x-14 sm:inset-x-20 z-20 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border border-white/20 shadow-md truncate max-w-full flex items-center gap-1.5 pointer-events-auto">
                <span className="text-base">{selectedStyle.emoji}</span>
                <span className="truncate">{selectedStyle.name}</span>
              </div>
            </div>

            {/* Top Bar: Close Button (Left) */}
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              title="סגירה"
              aria-label="סגירה"
              className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Souvenir Image - exactly hugs image without black/beige side borders */}
            <img
              src={finalImageUrl}
              alt="מזכרת אישית מבת המצווה של אורי קלזן"
              className="block w-auto h-auto max-w-[92vw] sm:max-w-[85vw] max-h-[75vh] object-contain select-none mx-auto"
            />

            {/* Footer Strip with Creator Name & Actions - exact width of the image */}
            <div className="w-full p-3 sm:p-4 bg-[#FAF7F0] border-t border-[#E3DBD0] flex items-center justify-between gap-3 text-right">
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#2A3728] truncate">
                  נוצר ע״י {primaryRsvp?.name || 'אורח/ת האירוע'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                  title="מחיקת התמונה"
                  aria-label="מחיקת התמונה"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleShare}
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
    </div>
  );
};

