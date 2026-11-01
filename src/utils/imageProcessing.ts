/**
 * Image processing utilities for Bat Mitzvah Souvenir feature
 */

export interface ProcessedImage {
  base64: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Resizes and compresses user-uploaded image for optimal API performance and fast upload
 */
export async function compressUserImage(
  file: File,
  maxDimension = 1536,
  quality = 0.88
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('אנא העלו קובץ תמונה תקין'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('שגיאה בקריאת קובץ התמונה'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('שגיאה בטעינת התמונה לתצוגה מקדימה'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('שגיאה באתחול עיבוד התמונה'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';

        resolve({
          base64,
          dataUrl,
          mimeType: 'image/jpeg',
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Applies the official, elegant Bat Mitzvah dedication overlay onto the generated image.
 * Uses a frosted glass luxury dark-botanical scrim with gold flourishes.
 * Exactly matches: „מזכרת מבת המצווה של אורי קלזן”
 */
export async function applyDedicationOverlay(
  sourceImageUrl: string,
  dedicationText = 'מזכרת מבת המצווה של אורי קלזן'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs; setting it on data: or blob: URIs causes immediate onError in WebKit/Chromium
    if (!sourceImageUrl.startsWith('data:') && !sourceImageUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      const width = img.naturalWidth || 1024;
      const height = img.naturalHeight || 1024;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceImageUrl);
        return;
      }

      // 1. Draw base photo
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Bottom Banner Scrim (Frosted Botanical Scrim)
      // Designed to be perfectly legible over both dark and bright photos without hiding faces
      const bannerHeight = Math.max(96, Math.round(height * 0.12));
      const bannerY = height - bannerHeight;

      // Smooth gradient fade-in from transparent to rich deep botanical green
      const gradient = ctx.createLinearGradient(0, bannerY - 32, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.28, 'rgba(23, 33, 22, 0.75)');
      gradient.addColorStop(0.65, 'rgba(18, 26, 17, 0.90)');
      gradient.addColorStop(1, 'rgba(13, 19, 12, 0.96)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, bannerY - 32, width, bannerHeight + 32);

      // 3. Luxurious golden divider line
      const goldGrad = ctx.createLinearGradient(width * 0.08, 0, width * 0.92, 0);
      goldGrad.addColorStop(0, 'rgba(224, 197, 138, 0)');
      goldGrad.addColorStop(0.2, 'rgba(224, 197, 138, 0.7)');
      goldGrad.addColorStop(0.5, 'rgba(255, 240, 204, 1)');
      goldGrad.addColorStop(0.8, 'rgba(224, 197, 138, 0.7)');
      goldGrad.addColorStop(1, 'rgba(224, 197, 138, 0)');

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = Math.max(1.5, Math.round(width * 0.002));
      ctx.beginPath();
      ctx.moveTo(width * 0.08, bannerY);
      ctx.lineTo(width * 0.92, bannerY);
      ctx.stroke();

      // Golden diamond emblem in the center of the divider line
      ctx.fillStyle = '#F5E2B3';
      ctx.beginPath();
      const diamondSize = Math.max(4, Math.round(width * 0.005));
      ctx.moveTo(width / 2, bannerY - diamondSize);
      ctx.lineTo(width / 2 + diamondSize, bannerY);
      ctx.moveTo(width / 2, bannerY + diamondSize);
      ctx.lineTo(width / 2 - diamondSize, bannerY);
      ctx.fill();

      // 4. Primary Dedication Text: „מזכרת מבת המצווה של אורי קלזן”
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const mainFontSize = Math.max(26, Math.round(width * 0.034));
      ctx.font = `bold ${mainFontSize}px 'Frank Ruhl Libre', 'Rubik', serif, Arial`;

      // Text Shadow for contrast
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(dedicationText, width / 2, bannerY + bannerHeight * 0.42);

      // 5. Secondary Date & Location Line
      ctx.shadowBlur = 3;
      const subFontSize = Math.max(13, Math.round(width * 0.018));
      ctx.font = `500 ${subFontSize}px 'Rubik', sans-serif, Arial`;
      ctx.fillStyle = '#D6E5D3';
      ctx.fillText('יום רביעי, כב\' כסלו • 2.12.26 • קרני שומרון 🌿', width / 2, bannerY + bannerHeight * 0.76);

      resolve(canvas.toDataURL('image/jpeg', 0.93));
    };

    img.onerror = () => {
      resolve(sourceImageUrl);
    };

    img.src = sourceImageUrl;
  });
}

/**
 * Downloads dataUrl as a file directly to the user device
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Native Web Share API or download fallback
 */
export async function shareOrDownloadImage(
  dataUrl: string,
  filename: string,
  title = 'מזכרת מבת המצווה של אורי קלזן',
  text = 'תראו את המזכרת האישית שיצרתי לבת המצווה של אורי! ✨'
): Promise<{ shared: boolean; downloaded: boolean }> {
  try {
    if (navigator.share && navigator.canShare) {
      // Convert Data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        return { shared: true, downloaded: false };
      }
    }
  } catch (err: any) {
    // User cancelled share or share failed
    if (err?.name === 'AbortError') {
      return { shared: false, downloaded: false };
    }
  }

  // Fallback to downloading directly
  downloadDataUrl(dataUrl, filename);
  return { shared: false, downloaded: true };
}

/**
 * Retrieves or initializes a persistent guest ID for quota tracking
 */
export function getOrCreateGuestId(): string {
  const KEY = 'bat_mitzvah_guest_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'guest_fallback_' + Date.now();
  }
}

const MY_SOUVENIRS_KEY = 'batmitzvah_my_souvenir_ids';

export function recordMySouvenirId(id: string): void {
  try {
    const raw = localStorage.getItem(MY_SOUVENIRS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(MY_SOUVENIRS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function removeMySouvenirId(id: string): void {
  try {
    const raw = localStorage.getItem(MY_SOUVENIRS_KEY);
    if (!raw) return;
    const list: string[] = JSON.parse(raw);
    const updated = list.filter((i) => i !== id);
    localStorage.setItem(MY_SOUVENIRS_KEY, JSON.stringify(updated));
  } catch {}
}

export function getMySouvenirIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_SOUVENIRS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
