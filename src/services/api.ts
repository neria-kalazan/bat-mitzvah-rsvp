import { RSVP, EventDetails, ChatMessage, SouvenirItem } from '../types';

export async function fetchEventDetails(): Promise<EventDetails> {
  const res = await fetch('/api/event');
  if (!res.ok) throw new Error('שגיאה בטעינת פרטי האירוע');
  return res.json();
}

export async function updateEventDetails(event: Partial<EventDetails>): Promise<EventDetails> {
  const res = await fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('שגיאה בעדכון פרטי האירוע');
  return res.json();
}

export async function fetchRSVPs(forceRefresh: boolean = false): Promise<RSVP[]> {
  const res = await fetch(`/api/rsvps${forceRefresh ? '?refresh=true' : ''}`);
  if (!res.ok) throw new Error('שגיאה בטעינת אישורי ההגעה');
  return res.json();
}

export async function submitRSVP(rsvpData: Partial<RSVP>): Promise<RSVP> {
  const res = await fetch('/api/rsvps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rsvpData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'שגיאה בשמירת אישור ההגעה');
  }
  return res.json();
}

export async function deleteRSVP(id: string): Promise<void> {
  const res = await fetch(`/api/rsvps/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('שגיאה במחיקת אישור הגעה');
}

export async function generateTTSAudio(text: string, speakerStyle?: string): Promise<string> {
  const res = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speakerStyle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'שגיאה ביצירת הקראת שמע');
  }
  const data = await res.json();
  return data.audioUrl;
}

export async function generateBatMitzvahImage(
  prompt: string,
  imageSize: '1K' | '2K' | '4K' = '1K',
  aspectRatio: string = '1:1'
): Promise<string> {
  const res = await fetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageSize, aspectRatio }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'אירעה שגיאה');
  }
  const data = await res.json();
  return data.imageUrl;
}

export async function sendChatMessage(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'שגיאה בתקשורת עם העוזרת החכמה');
  }
  const data = await res.json();
  return data.reply;
}

export interface SouvenirQuotaResponse {
  guestId: string;
  used: number;
  max: number;
  remaining: number;
  unlimited?: boolean;
}

export async function fetchSouvenirQuota(guestId: string): Promise<SouvenirQuotaResponse> {
  const res = await fetch(`/api/souvenir/quota?guestId=${encodeURIComponent(guestId)}`);
  if (!res.ok) {
    return { guestId, used: 0, max: 999, remaining: 999, unlimited: true };
  }
  return res.json();
}

export interface GenerateSouvenirParams {
  guestId: string;
  photoBase64: string;
  mimeType: string;
  styleId: string;
  customPrompt?: string;
  creatorName?: string;
}

export interface GenerateSouvenirResponse {
  id?: string;
  imageUrl: string;
  remaining: number;
  used: number;
  styleId: string;
}

export async function generatePersonalPhotoSouvenir(
  params: GenerateSouvenirParams
): Promise<GenerateSouvenirResponse> {
  const res = await fetch('/api/souvenir/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'אירעה שגיאה ביצירת המזכרת. אנא נסו שוב.');
  }

  return res.json();
}

export interface FetchSouvenirsParams {
  style?: string;
  search?: string;
  limit?: number;
  offset?: number;
  all?: boolean;
}

export interface PaginatedSouvenirsResponse {
  items: SouvenirItem[];
  total: number;
  overallTotal: number;
  styleCounts: Record<string, number>;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export async function fetchSouvenirsPaginated(
  params: FetchSouvenirsParams = {}
): Promise<PaginatedSouvenirsResponse> {
  const query = new URLSearchParams();
  if (params.style && params.style !== 'all') query.set('style', params.style);
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  query.set('limit', (params.limit !== undefined ? params.limit : 20).toString());
  query.set('offset', (params.offset !== undefined ? params.offset : 0).toString());
  if (params.all) query.set('all', 'true');
  query.set('format', 'object');

  const res = await fetch(`/api/souvenirs?${query.toString()}`);
  if (!res.ok) throw new Error('שגיאה בטעינת גלריית המזכרות');
  const data = await res.json();
  if (data && Array.isArray(data.items)) {
    return data;
  }
  const totalHeader = res.headers.get('X-Total-Count');
  const overallHeader = res.headers.get('X-Overall-Count');
  const total = totalHeader ? parseInt(totalHeader, 10) : (Array.isArray(data) ? data.length : 0);
  const overallTotal = overallHeader ? parseInt(overallHeader, 10) : total;
  const items = Array.isArray(data) ? data : [];
  const offset = params.offset || 0;
  const limit = params.limit || 20;
  return {
    items,
    total,
    overallTotal,
    styleCounts: {},
    hasMore: offset + items.length < total,
    offset,
    limit,
  };
}

export async function fetchSouvenirs(
  params?: FetchSouvenirsParams
): Promise<SouvenirItem[]> {
  const query = new URLSearchParams();
  if (params?.style && params.style !== 'all') query.set('style', params.style);
  if (params?.search && params.search.trim()) query.set('search', params.search.trim());
  if (params?.limit !== undefined) query.set('limit', params.limit.toString());
  if (params?.offset !== undefined) query.set('offset', params.offset.toString());
  if (params?.all) query.set('all', 'true');

  const queryString = query.toString();
  const url = queryString ? `/api/souvenirs?${queryString}` : '/api/souvenirs?all=true';
  const res = await fetch(url);
  if (!res.ok) throw new Error('שגיאה בטעינת גלריית המזכרות');
  const data = await res.json();
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return Array.isArray(data) ? data : [];
}

export async function saveSouvenirToGallery(
  item: Omit<SouvenirItem, 'id' | 'createdAt'> & { id?: string }
): Promise<SouvenirItem> {
  const res = await fetch('/api/souvenirs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'שגיאה בשמירת התמונה לגלריה');
  }
  return res.json();
}

export async function deleteSouvenir(id: string): Promise<void> {
  const res = await fetch(`/api/souvenirs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('שגיאה במחיקת מזכרת מהגלריה');
}

export interface SyncSheetsResponse {
  success: boolean;
  count: number;
  syncedToSheet?: number;
  addedFromSheet?: number;
  updatedFromSheet?: number;
  totalRsvps?: number;
  rsvps?: RSVP[];
}

export async function syncWithGoogleSheets(webhookUrl?: string): Promise<SyncSheetsResponse> {
  const res = await fetch('/api/sync-sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'שגיאה בסנכרון מול Google Sheets');
  }
  return res.json();
}

export interface FirestoreStatusResponse {
  quotaExceeded: boolean;
  quotaExceededUntil: number;
  projectId: string;
  databaseId: string;
  upgradeUrl: string;
}

export async function checkFirestoreStatus(retry: boolean = false): Promise<FirestoreStatusResponse> {
  try {
    const res = await fetch(`/api/firestore-status${retry ? '?retry=true' : ''}`);
    if (!res.ok) {
      return {
        quotaExceeded: false,
        quotaExceededUntil: 0,
        projectId: '',
        databaseId: '',
        upgradeUrl: '',
      };
    }
    return res.json();
  } catch {
    return {
      quotaExceeded: false,
      quotaExceededUntil: 0,
      projectId: '',
      databaseId: '',
      upgradeUrl: '',
    };
  }
}
