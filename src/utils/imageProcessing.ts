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

      const isPortrait = height > width;

      // 2. Bottom Banner Scrim (Frosted Botanical Scrim)
      // Sleeker and compact, noticeably less tall
      const bannerRatio = isPortrait ? 0.088 : 0.11;
      const bannerHeight = Math.max(95, Math.round(height * bannerRatio));
      const bannerY = height - bannerHeight;

      // Soft photographic blur / feather transition above the banner
      const fadeHeight = Math.round(bannerHeight * 0.55);
      const fadeStartY = bannerY - fadeHeight;

      // 1. Dreamy soft blur / feather transition above the banner
      const fadeGradient = ctx.createLinearGradient(0, fadeStartY, 0, bannerY);
      fadeGradient.addColorStop(0, 'rgba(11, 18, 12, 0)');
      fadeGradient.addColorStop(0.2, 'rgba(11, 18, 12, 0.08)');
      fadeGradient.addColorStop(0.4, 'rgba(10, 17, 11, 0.25)');
      fadeGradient.addColorStop(0.6, 'rgba(8, 14, 9, 0.52)');
      fadeGradient.addColorStop(0.8, 'rgba(6, 10, 7, 0.80)');
      fadeGradient.addColorStop(1, 'rgba(5, 8, 5, 1)');

      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, fadeStartY, width, fadeHeight);

      // 2. Solid deep botanical black banner below (100% opaque, hides any underlying artifacts)
      ctx.fillStyle = '#050805';
      ctx.fillRect(0, bannerY, width, bannerHeight);

      // Sizing balanced for both landscape and portrait
      const baseDim = isPortrait
        ? Math.min(width * 1.05, height * 0.75)
        : Math.min(width, height * 1.35);

      const mainFontSize = Math.max(26, Math.round(baseDim * 0.0385));
      const subFontSize = Math.max(14, Math.round(mainFontSize * 0.50));

      // Tight, cohesive typographic rhythm - vertically centered in the green background
      const lineSpacing = Math.round(mainFontSize * 0.96);
      const bannerCenterY = bannerY + Math.round(bannerHeight * 0.51);
      const mainY = Math.round(bannerCenterY - lineSpacing / 2);
      const subY = mainY + lineSpacing;

      // Primary Dedication Text: „מזכרת מבת המצווה של אורי קלזן”
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';

      ctx.font = `bold ${mainFontSize}px 'Noto Sans Hebrew', 'Rubik', sans-serif, Arial`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(dedicationText, width / 2, mainY);

      // Subtitle Line: "יום רביעי, כב' כסלו • 2.12.26 • קרני שומרון" + Leaf
      const subText = "יום רביעי, כב' כסלו • 2.12.26 • קרני שומרון";
      ctx.font = `500 ${subFontSize}px 'Noto Sans Hebrew', 'Rubik', sans-serif, Arial`;
      const textWidth = Math.round(subFontSize * 18.8);
      const leafSize = Math.round(subFontSize * 0.95);
      const gap = Math.round(subFontSize * 0.45);

      const textCenterX = Math.round(width / 2 - (leafSize + gap) / 2);
      const leafX = Math.round(textCenterX + textWidth / 2 + gap);
      const leafY = Math.round(subY - leafSize * 0.82);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#D6E8D5';
      ctx.fillText(subText, textCenterX, subY);

      // Draw leaf icon
      ctx.save();
      ctx.translate(leafX, leafY);
      const leafScale = leafSize / 24;
      ctx.scale(leafScale, leafScale);

      // Stem
      ctx.strokeStyle = '#256029';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.bezierCurveTo(2, 23, 0, 25, -2, 26);
      ctx.stroke();

      // Main leaf
      const leafGrad = ctx.createLinearGradient(0, 21, 21, 3);
      leafGrad.addColorStop(0, '#388E3C');
      leafGrad.addColorStop(0.6, '#66BB6A');
      leafGrad.addColorStop(1, '#A5D6A7');
      ctx.fillStyle = leafGrad;
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.bezierCurveTo(4, 14, 10, 5, 21, 3);
      ctx.bezierCurveTo(19, 12, 14, 21, 3, 21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central vein
      ctx.strokeStyle = '#256029';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.bezierCurveTo(8, 15, 13, 9, 21, 3);
      ctx.stroke();

      // Side vein branch
      ctx.strokeStyle = '#337438';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(9, 14);
      ctx.bezierCurveTo(12, 14.5, 15, 13, 16, 11);
      ctx.stroke();

      // Flutter secondary leaf
      ctx.fillStyle = '#81C784';
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(2, 12);
      ctx.bezierCurveTo(1, 9, -2, 8, -3, 9);
      ctx.bezierCurveTo(-3, 11, 0, 13, 2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

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
