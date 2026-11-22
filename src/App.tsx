import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { RsvpButtons } from './components/RsvpButtons';
import { FriendRsvpModal } from './components/FriendRsvpModal';
import { FamilyRsvpModal } from './components/FamilyRsvpModal';
import { SuccessModal } from './components/SuccessModal';
import { PhotoStudioModal } from './components/PhotoStudioModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AddToCalendarModal } from './components/AddToCalendarModal';
import { OriginalInvitationModal } from './components/OriginalInvitationModal';
import { WishesWall } from './components/WishesWall';
import { PersonalPhotoSouvenirPage } from './components/PersonalPhotoSouvenirPage';
import { SouvenirGalleryPage } from './components/SouvenirGalleryPage';
import { SlideshowPage } from './components/SlideshowPage';
import { RSVP, EventDetails } from './types';
import {
  fetchEventDetails,
  fetchRSVPs,
  submitRSVP,
  deleteRSVP,
  updateEventDetails,
} from './services/api';
import { Sparkles, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const FALLBACK_EVENT: EventDetails = {
  celebrantName: 'אורי',
  subTitle: 'יום רביעי, כב\' כסלו · 2.12.26 · בשעה 19:00',
  date: '2026-12-02',
  time: '19:00',
  receptionTime: 'בשעה 19:00',
  venueName: 'אולם בית הכנסת ישראל הצעיר',
  address: 'קרני שומרון',
  wazeUrl: 'https://waze.com/ul/hsv8zn0xf7',
  googleMapsUrl: 'https://maps.google.com/?q=בית+כנסת+ישראל+הצעיר+קרני+שומרון',
  welcomeMessage: 'מוזמנים לחגוג איתנו את בת המצווה של אורי. מחכים לכם, משפחת קלזן.',
  welcomeVoiceText: 'שלום וברוכים הבאים! מוזמנים לחגוג איתנו את בת המצווה של אורי, ביום רביעי כב\' כסלו, 2 בדצמבר בשעה 19:00 באולם בית הכנסת ישראל הצעיר בקרני שומרון. מחכים לכם, משפחת קלזן.',
  dressCode: 'חגיגי ומכובד',
  contactPhone: '050-1234567',
};

type View = 'home' | 'photo-souvenir' | 'gallery' | 'parents-admin' | 'slideshow';

function getInitialView(): View {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (
    path === '/slideshow' ||
    path.startsWith('/slideshow') ||
    hash.includes('slideshow') ||
    search.includes('slideshow')
  ) {
    return 'slideshow';
  }

  if (
    path === '/parents' ||
    path.startsWith('/parents') ||
    path === '/admin' ||
    path.startsWith('/admin') ||
    hash.includes('parents') ||
    hash.includes('admin') ||
    search.includes('parents') ||
    search.includes('admin')
  ) {
    return 'parents-admin';
  }
  if (path.startsWith('/gallery') || hash.includes('gallery') || search.includes('gallery')) {
    return 'gallery';
  }
  if (path.startsWith('/souvenir') || hash.includes('souvenir') || search.includes('souvenir')) {
    return 'photo-souvenir';
  }
  return 'home';
}

const PRIMARY_RSVP_KEY = 'batmitzvah_primary_rsvp';

function getStoredPrimaryRsvp(): RSVP | null {
  try {
    const raw = localStorage.getItem(PRIMARY_RSVP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function App() {
  const [event, setEvent] = useState<EventDetails>(FALLBACK_EVENT);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryRsvp, setPrimaryRsvp] = useState<RSVP | null>(getStoredPrimaryRsvp);

  // Modals state
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSubmittedRSVP, setLastSubmittedRSVP] = useState<RSVP | null>(null);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isOriginalInvitationOpen, setIsOriginalInvitationOpen] = useState(false);
  const [isPhotoStudioOpen, setIsPhotoStudioOpen] = useState(false);

  const [hasAlreadyRSVPed, setHasAlreadyRSVPed] = useState(false);
  const [currentView, setCurrentView] = useState<View>(getInitialView);

  // Navigation handler with browser history
  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let newPath = '/';
    if (view === 'parents-admin') newPath = '/parents';
    else if (view === 'photo-souvenir') newPath = '/souvenir';
    else if (view === 'gallery') newPath = '/gallery';
    else if (view === 'slideshow') newPath = '/slideshow';

    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, []);

  // Listen to popstate event (back/forward in browser)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [eventData, rsvpsData] = await Promise.all([
          fetchEventDetails().catch(() => FALLBACK_EVENT),
          fetchRSVPs().catch(() => []),
        ]);
        setEvent(eventData);
        setRsvps(rsvpsData);

        // Smart sync for primary guest identity
        const stored = getStoredPrimaryRsvp();
        if (stored) {
          const matching = rsvpsData.find((r) => r.id === stored.id);
          if (matching) {
            // Found on server: sync with latest details
            try {
              localStorage.setItem(PRIMARY_RSVP_KEY, JSON.stringify(matching));
            } catch {}
            setPrimaryRsvp(matching);
            setHasAlreadyRSVPed(true);
          } else {
            // Removed from guest list by parents: clear local storage
            try {
              localStorage.removeItem(PRIMARY_RSVP_KEY);
            } catch {}
            setPrimaryRsvp(null);
            setHasAlreadyRSVPed(false);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRsvpSubmit = async (data: Partial<RSVP>) => {
    const result = await submitRSVP(data);

    // Update RSVP list in state (in-place update if existing ID, or prepend if new)
    setRsvps((prev) => {
      const idx = prev.findIndex((r) => r.id === result.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = result;
        return next;
      }
      return [result, ...prev];
    });

    // Primary Identity persistence logic:
    // If this is the first submission from this device, save it as primary
    const currentStored = getStoredPrimaryRsvp();
    if (!currentStored) {
      try {
        localStorage.setItem(PRIMARY_RSVP_KEY, JSON.stringify(result));
      } catch {}
      setPrimaryRsvp(result);
    } else if (currentStored.id === result.id) {
      // Primary guest updated their own details
      try {
        localStorage.setItem(PRIMARY_RSVP_KEY, JSON.stringify(result));
      } catch {}
      setPrimaryRsvp(result);
    } else {
      // A different friend filled details from the same phone.
      // Retain the primary identity so the original user's details and photo attribution remain intact.
    }

    setLastSubmittedRSVP(result);
    setHasAlreadyRSVPed(true);
    setIsSuccessModalOpen(true);
  };

  const handleDeleteRSVP = async (id: string) => {
    await deleteRSVP(id);
    setRsvps((prev) => prev.filter((r) => r.id !== id));
    if (primaryRsvp?.id === id) {
      try {
        localStorage.removeItem(PRIMARY_RSVP_KEY);
      } catch {}
      setPrimaryRsvp(null);
      setHasAlreadyRSVPed(false);
    }
  };

  const handleUpdateEvent = async (updated: Partial<EventDetails>) => {
    const res = await updateEventDetails(updated);
    setEvent(res);
  };

  // Dedicated parents admin page view (Accessible via /parents)
  if (currentView === 'parents-admin') {
    return (
      <AdminDashboard
        event={event}
        rsvps={rsvps}
        onBack={() => navigateTo('home')}
        onDeleteRSVP={handleDeleteRSVP}
        onUpdateEvent={handleUpdateEvent}
        onRefreshRSVPs={async () => {
          const fresh = await fetchRSVPs(true);
          setRsvps(fresh);
        }}
        onOpenSlideshow={() => navigateTo('slideshow')}
      />
    );
  }

  // Dedicated slideshow projection view (Accessible via /slideshow or from parents admin)
  if (currentView === 'slideshow') {
    return (
      <SlideshowPage
        event={event}
        onBack={() => navigateTo('parents-admin')}
      />
    );
  }

  // Dedicated photo souvenir page view
  if (currentView === 'photo-souvenir') {
    return (
      <PersonalPhotoSouvenirPage
        event={event}
        onBack={() => navigateTo('home')}
        onOpenGallery={() => navigateTo('gallery')}
        primaryRsvp={primaryRsvp}
      />
    );
  }

  // Dedicated souvenir gallery page view
  if (currentView === 'gallery') {
    return (
      <SouvenirGalleryPage
        event={event}
        onBack={() => navigateTo('home')}
        onNavigateToDesign={() => navigateTo('photo-souvenir')}
        onOpenSlideshow={() => navigateTo('slideshow')}
        primaryRsvp={primaryRsvp}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C342E] flex flex-col font-['Rubik',sans-serif] selection:bg-[#E2EBE0] selection:text-[#2A3A27]">
      {/* Header Navigation */}
      <Header
        event={event}
        onOpenInvitationImage={() => setIsOriginalInvitationOpen(true)}
        onOpenGallery={() => navigateTo('gallery')}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {/* Hero Section with Event Details matching the invitation */}
        <HeroSection
          event={event}
          onOpenInvitationImage={() => setIsOriginalInvitationOpen(true)}
        />

        {/* The 2 Primary RSVP Buttons: Friends & Family (High prominence, directly visible) */}
        <RsvpButtons
          event={event}
          onSelectFriend={() => setIsFriendModalOpen(true)}
          onSelectFamily={() => setIsFamilyModalOpen(true)}
          hasAlreadyRSVPed={hasAlreadyRSVPed}
          primaryRsvp={primaryRsvp}
        />

        {/* Dedicated Entry Section: עיצוב תמונת מזכרת אישית + גלריית המזכרות */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
          <div className="bg-[#FAF7F0] border border-[#E3DBD0] rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(58,68,55,0.06)] flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="text-right flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF5EC] border border-[#CCDCCD] flex items-center justify-center text-2xl shadow-inner shrink-0">
                ✨
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#273424] font-['Rubik',sans-serif]">
                  עיצוב תמונת מזכרת אישית
                </h3>
                <p className="text-xs sm:text-sm text-[#5B6D57] font-normal mt-0.5">
                  העלו תמונה שלכם, בחרו סגנון חגיגי וקבלו מזכרת מעוצבת מבת המצווה של אורי!
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => navigateTo('photo-souvenir')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#3B4E38] hover:bg-[#2F402D] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#4F674A]"
              >
                <Sparkles className="w-4 h-4 text-[#D8E6D6]" />
                <span>עיצוב תמונת מזכרת אישית</span>
                <ArrowLeft className="w-3.5 h-3.5 text-[#C2D7BF]" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('gallery')}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white hover:bg-[#EEF5EC] active:scale-95 text-[#32452F] text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#CCDCCD]"
              >
                <ImageIcon className="w-4 h-4 text-[#445E40]" />
                <span>גלריית המזכרות</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guestbook & Wishes Wall */}
        <WishesWall rsvps={rsvps} event={event} />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E3ECE1] bg-white/70 backdrop-blur-xs py-6 px-4 text-center text-xs sm:text-sm text-[#4E614B] font-medium">
        חוגגים לאורי בת מצווה 🌿 מחכים לכם, משפחת קלזן
      </footer>

      {/* Modals */}
      <FriendRsvpModal
        isOpen={isFriendModalOpen}
        onClose={() => setIsFriendModalOpen(false)}
        event={event}
        onSubmit={handleRsvpSubmit}
        initialData={primaryRsvp}
      />

      <FamilyRsvpModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        event={event}
        onSubmit={handleRsvpSubmit}
        initialData={primaryRsvp}
      />

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        rsvp={lastSubmittedRSVP}
        event={event}
        onOpenInvitationImage={() => setIsOriginalInvitationOpen(true)}
        onOpenPhotoStudio={() => {
          setIsSuccessModalOpen(false);
          navigateTo('photo-souvenir');
        }}
      />

      <OriginalInvitationModal
        isOpen={isOriginalInvitationOpen}
        onClose={() => setIsOriginalInvitationOpen(false)}
      />

      <AddToCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        event={event}
      />

      <PhotoStudioModal
        isOpen={isPhotoStudioOpen}
        onClose={() => setIsPhotoStudioOpen(false)}
        event={event}
      />
    </div>
  );
}
