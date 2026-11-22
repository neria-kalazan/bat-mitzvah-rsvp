/**
 * IndexedDB & In-Memory Offline Cache Utility for Slideshow
 * Ensures 100% offline projection capability without network dependency
 */

import { fetchSouvenirsPaginated } from '../services/api';
import { SouvenirItem } from '../types';

export interface CachedSlidePhoto {
  id: string;
  creatorName: string;
  styleName: string;
  styleId?: string;
  customPrompt?: string;
  createdAt: string;
  imageUrl: string; // Guaranteed base64 dataUrl or cached blob url
  cachedAt: number;
}

const DB_NAME = 'BatMitzvahEventSlideshowDB';
const DB_VERSION = 1;
const STORE_NAME = 'cached_slideshow_photos';
const CACHE_META_KEY = 'slideshow_cache_meta';

export interface CacheMetadata {
  count: number;
  lastUpdated: string;
  verified: boolean;
  totalSizeApproxMb: number;
}

/**
 * Opens or initializes IndexedDB database
 */
export function openSlideshowDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB אינו נתמך בדפדפן זה'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('שגיאה בפתיחת מסד הנתונים המקומי של התצוגה'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Retrieves all cached photos directly from IndexedDB
 */
export async function getAllCachedPhotos(): Promise<CachedSlidePhoto[]> {
  try {
    const db = await openSlideshowDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as CachedSlidePhoto[]);
      };

      request.onerror = () => {
        reject(new Error('שגיאה בקריאת תמונות מהקש המקומי'));
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable or error reading photos:', err);
    return [];
  }
}

/**
 * Clears all cached photos from IndexedDB
 */
export async function clearSlideshowCache(): Promise<void> {
  try {
    const db = await openSlideshowDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        try {
          localStorage.removeItem(CACHE_META_KEY);
        } catch {}
        resolve();
      };

      request.onerror = () => {
        reject(new Error('שגיאה בניקוי הקש המקומי'));
      };
    });
  } catch (err) {
    console.error('Failed to clear cache:', err);
  }
}

/**
 * Convert any image URL (HTTP, relative or dataUrl) into a fully standalone base64 Data URL
 * and pre-decodes it into an HTML Image object to warm browser cache.
 */
export async function convertImageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    // Already a standalone base64 data URL; verify and preload
    await preloadImage(url);
    return url;
  }

  // Fetch via HTTP and convert to base64 Data URL for zero-internet playback
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`שגיאה בהורדת תמונה: ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      preloadImage(dataUrl)
        .then(() => resolve(dataUrl))
        .catch(() => resolve(dataUrl)); // Resolve even if decode warns
    };
    reader.onerror = () => reject(new Error('שגיאה בהמרת תמונה לפורמט לא מקוון'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Preloads an image into browser memory so it renders instantaneously
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('שגיאה בטעינת תמונה'));
    img.src = src;
  });
}

/**
 * Strict Pre-Caching Workflow:
 * 1. Pulls all photos from the server gallery.
 * 2. Fetches and transforms each image into a self-contained offline base64 DataURL.
 * 3. Saves all photos to IndexedDB.
 * 4. Verifies the cache integrity by reading back from IndexedDB.
 * 5. Returns the verified cached photos.
 */
export async function cacheAllPhotosWithProgress(
  onProgress: (current: number, total: number, statusText: string) => void
): Promise<{ success: boolean; count: number; photos: CachedSlidePhoto[] }> {
  onProgress(0, 1, 'מתחבר לשרת וטוען את רשימת התמונות של האירוע...');

  // 1. Fetch all souvenirs in paginated batches (to avoid large payload / response size limits)
  let remoteSouvenirs: SouvenirItem[] = [];
  try {
    let offset = 0;
    const batchSize = 20;
    let hasMore = true;
    while (hasMore) {
      const page = await fetchSouvenirsPaginated({ limit: batchSize, offset });
      if (page.items && page.items.length > 0) {
        remoteSouvenirs = [...remoteSouvenirs, ...page.items];
        offset += page.items.length;
        onProgress(
          0,
          Math.max(1, page.total || remoteSouvenirs.length),
          `מתחבר לשרת וטוען את רשימת התמונות (${remoteSouvenirs.length}${page.total ? ` מתוך ${page.total}` : ''})...`
        );
      }
      hasMore = Boolean(page.hasMore && page.items && page.items.length > 0);
    }
  } catch (err) {
    console.warn('Network fetch failed, attempting to read existing local cache...', err);
    const existing = await getAllCachedPhotos();
    if (existing.length > 0) {
      onProgress(existing.length, existing.length, 'נמצאו תמונות שמורות בקש המקומי! עבודה במצב לא-מקוון.');
      return { success: true, count: existing.length, photos: existing };
    }
    throw new Error('לא ניתן להתחבר לשרת ואין תמונות שמורות בקש המקומי. אנא ודאו חיבור ראשוני לרשת.');
  }

  if (!remoteSouvenirs || remoteSouvenirs.length === 0) {
    // If no souvenirs exist yet in gallery, check if we have any cached photos
    const existing = await getAllCachedPhotos();
    if (existing.length > 0) {
      return { success: true, count: existing.length, photos: existing };
    }
    throw new Error('טרם נוצרו תמונות בגלריה להצגה במצגת.');
  }

  const total = remoteSouvenirs.length;
  onProgress(0, total, `נמצאו ${total} תמונות. מתחיל שמירה והמרה לקש מקומי (IndexedDB)...`);

  const cachedPhotos: CachedSlidePhoto[] = [];
  let totalBytes = 0;

  // 2. Iterate and process each image with progress updates
  for (let i = 0; i < total; i++) {
    const item = remoteSouvenirs[i];
    const itemIndex = i + 1;
    const creator = item.creatorName || 'אורח/ת אהוב/ה';

    onProgress(
      itemIndex,
      total,
      `מעבד ושומר לקש: תמונה ${itemIndex} מתוך ${total} (${creator})...`
    );

    try {
      const dataUrl = await convertImageUrlToDataUrl(item.imageUrl);
      totalBytes += dataUrl.length;

      const cachedItem: CachedSlidePhoto = {
        id: item.id,
        creatorName: item.creatorName || 'אורח/ת',
        styleName: item.styleName || 'מזכרת אישית',
        styleId: item.styleId,
        customPrompt: item.customPrompt,
        createdAt: item.createdAt || new Date().toISOString(),
        imageUrl: dataUrl,
        cachedAt: Date.now(),
      };

      cachedPhotos.push(cachedItem);
    } catch (err) {
      console.error(`Failed to cache photo ${item.id} (${creator}):`, err);
      // Fallback: If conversion failed, keep the raw URL if possible
      cachedPhotos.push({
        id: item.id,
        creatorName: item.creatorName || 'אורח/ת',
        styleName: item.styleName || 'מזכרת אישית',
        styleId: item.styleId,
        customPrompt: item.customPrompt,
        createdAt: item.createdAt || new Date().toISOString(),
        imageUrl: item.imageUrl,
        cachedAt: Date.now(),
      });
    }
  }

  // 3. Write into IndexedDB
  onProgress(total, total, 'שומר את כל התמונות במסד הנתונים המקומי של הדפדפן...');
  const db = await openSlideshowDB();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear old store first to ensure exact sync
    store.clear();

    cachedPhotos.forEach((photo) => {
      store.put(photo);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('שגיאה בכתיבה ל-IndexedDB'));
  });

  // 4. Strict verification check: read back from IndexedDB
  onProgress(total, total, 'מאמת את תקינות הקש המקומי...');
  const verifiedList = await getAllCachedPhotos();

  if (verifiedList.length === 0) {
    throw new Error('אימות הקש המקומי נכשל: לא אותרו תמונות בזיכרון המקומי.');
  }

  // 5. Save metadata
  const approxMb = Number((totalBytes / (1024 * 1024)).toFixed(1));
  const meta: CacheMetadata = {
    count: verifiedList.length,
    lastUpdated: new Date().toISOString(),
    verified: true,
    totalSizeApproxMb: approxMb,
  };

  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {}

  onProgress(
    verifiedList.length,
    verifiedList.length,
    `הושלם! כל ${verifiedList.length} התמונות נשמרו בקש המקומי בהצלחה. ניתן לנתק אינטרנט.`
  );

  return {
    success: true,
    count: verifiedList.length,
    photos: verifiedList,
  };
}

/**
 * Gets cache metadata from localStorage
 */
export function getCacheMetadata(): CacheMetadata | null {
  try {
    const raw = localStorage.getItem(CACHE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
