import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { GoogleGenAI } from '@google/genai';

// Ensure fontconfig discovers the bundled repository fonts if invoked by system libraries
const FONTS_DIR = path.resolve(process.cwd(), 'fonts');
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = FONTS_DIR;
}
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface RSVP {
  id: string;
  type: 'friend' | 'family';
  name: string;
  contactName?: string;
  plusOne?: boolean;
  plusOneName?: string;
  count: number;
  phone?: string;
  attending: boolean;
  dietary?: string;
  songRequest?: string;
  wishingMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EventDetails {
  celebrantName: string;
  subTitle: string;
  date: string;
  time: string;
  receptionTime: string;
  venueName: string;
  address: string;
  wazeUrl: string;
  googleMapsUrl: string;
  welcomeMessage: string;
  welcomeVoiceText: string;
  dressCode: string;
  contactPhone: string;
  googleSheetsWebhookUrl?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const EVENT_FILE = path.join(DATA_DIR, 'event.json');
const QUOTAS_FILE = path.join(DATA_DIR, 'quotas.json');
const SOUVENIRS_FILE = path.join(DATA_DIR, 'souvenirs.json');

// --- Persistent Firestore Database Initialization ---
const FIREBASE_CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
  try {
    const fbConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8'));
    const fbApp = initializeApp(fbConfig);
    firestoreDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId);
    console.log('[Firestore] Connected to persistent database:', fbConfig.firestoreDatabaseId);
  } catch (err) {
    console.error('[Firestore] Initialization error:', err);
  }
}

// Strip undefined fields because Firestore rejects { key: undefined }
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export interface SouvenirItem {
  id: string;
  guestId?: string;
  creatorName: string;
  styleId: string;
  styleName: string;
  imageUrl: string;
  customPrompt?: string;
  createdAt: string;
}

const DEFAULT_EVENT: EventDetails = {
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
  googleSheetsWebhookUrl: '',
};

const DEFAULT_RSVPS: RSVP[] = [
  {
    "id": "rsvp-friend-sample",
    "type": "friend",
    "name": "שירה כהן",
    "plusOne": false,
    "count": 1,
    "attending": true,
    "songRequest": "עדן חסון - שקיעות אדומות",
    "wishingMessage": "אוריוש היקרה! המון מזל טוב לבת המצווה, מתרגשת לחגוג ולרקוד איתך עד השמיים! 🎉💖",
    "createdAt": "2026-10-29T10:00:00.000Z"
  },
  {
    "id": "rsvp-family-sample",
    "type": "family",
    "name": "משפחת לוי (דוד דני ומיכל)",
    "contactName": "דני לוי",
    "count": 4,
    "attending": true,
    "wishingMessage": "לאורי האהובה ולכל משפחת קלזן, מזל טוב ענק לרגל הגיעך לגיל מצוות! שתזכו לגדלה באושר, שמחה ונחת. אוהבים ומחכים לחגוג יחד! 🌿✨",
    "createdAt": "2026-10-29T09:30:00.000Z"
  }
];

function loadEvent(): EventDetails {
  try {
    if (fs.existsSync(EVENT_FILE)) {
      const data = fs.readFileSync(EVENT_FILE, 'utf-8');
      return { ...DEFAULT_EVENT, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading event file:', err);
  }
  return DEFAULT_EVENT;
}

function saveEvent(event: EventDetails) {
  try {
    fs.writeFileSync(EVENT_FILE, JSON.stringify(event, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving event file:', err);
  }
}

function loadRSVPs(): RSVP[] {
  try {
    if (fs.existsSync(RSVPS_FILE)) {
      const data = fs.readFileSync(RSVPS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading rsvps file:', err);
  }
  return DEFAULT_RSVPS;
}

function saveRSVPs(rsvps: RSVP[]) {
  try {
    fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving rsvps file:', err);
  }
}

const SOUVENIR_STYLE_NAMES: Record<string, string> = {
  'watercolor': 'איור בצבעי מים',
  'festive-party': 'מסיבה חגיגית',
  'retro-80s': 'רטרו שנות ה־80',
  'pop-art': 'קומיקס ופופ ארט',
  'caricature': 'קריקטורה חגיגית',
  'oil-painting': 'ציור שמן קלאסי',
  'vintage-bw': 'וינטג׳ שחור־לבן',
  'princess': 'נסיכות ואגדות',
  'hawaii': 'חופשה בהוואי',
  '3d-animation': 'אנימציה תלת־ממדית',
};

function loadSouvenirs(): SouvenirItem[] {
  try {
    if (fs.existsSync(SOUVENIRS_FILE)) {
      const data = fs.readFileSync(SOUVENIRS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading souvenirs file:', err);
  }
  return [];
}

function saveSouvenirs(items: SouvenirItem[]) {
  try {
    fs.writeFileSync(SOUVENIRS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving souvenirs file:', err);
  }
}

// Load fonts once into memory for ultra-fast, 100% fontconfig-independent vector rendering
let vectorBoldFont: opentype.Font | null = null;
let vectorRegFont: opentype.Font | null = null;
let vectorFallbackFont: opentype.Font | null = null;

try {
  const boldFile = path.join(FONTS_DIR, 'NotoSansHebrew-Bold.ttf');
  const regFile = path.join(FONTS_DIR, 'NotoSansHebrew-Regular.ttf');
  const fallbackFile = path.join(FONTS_DIR, 'DejaVuSans.ttf');

  if (fs.existsSync(boldFile)) {
    const b = fs.readFileSync(boldFile);
    vectorBoldFont = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  if (fs.existsSync(regFile)) {
    const b = fs.readFileSync(regFile);
    vectorRegFont = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  if (fs.existsSync(fallbackFile)) {
    const b = fs.readFileSync(fallbackFile);
    vectorFallbackFont = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  console.log('[fonts] Vector Hebrew fonts loaded successfully (NotoSansHebrew + DejaVuSans fallback)');
} catch (fontErr) {
  console.warn('[fonts] Could not preload vector fonts, will use SVG text fallback:', fontErr);
}

/**
 * Converts a text segment to an SVG path using pure OpenType glyph vectors.
 * If a character is missing from primary Hebrew font (e.g. Latin numbers '2.12.26' or '•'),
 * it falls back to DejaVuSans so every glyph is always present and rendered cleanly.
 */
function renderSegmentToVectorPath(
  text: string,
  primaryFont: opentype.Font | null,
  fallbackFont: opentype.Font | null,
  x: number,
  y: number,
  fontSize: number,
  isRTL = false
): { path: opentype.Path; width: number } {
  const p = new opentype.Path();
  if (!primaryFont) {
    return { path: p, width: 0 };
  }
  const str = isRTL ? text.split('').reverse().join('') : text;
  let curX = x;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let f = primaryFont;
    let g = f.charToGlyph(ch);
    if (!g || g.name === '.notdef' || g.index === 0) {
      if (fallbackFont) {
        f = fallbackFont;
        g = f.charToGlyph(ch);
      }
    }
    const scale = (1 / f.unitsPerEm) * fontSize;
    const glyphPath = g.getPath(curX, y, fontSize);
    p.commands.push(...glyphPath.commands);
    curX += (g.advanceWidth || 0) * scale;
  }

  return { path: p, width: curX - x };
}

function getSegmentVectorWidth(
  text: string,
  primaryFont: opentype.Font | null,
  fallbackFont: opentype.Font | null,
  fontSize: number,
  isRTL = false
): number {
  if (!primaryFont) return 0;
  const str = isRTL ? text.split('').reverse().join('') : text;
  let w = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let f = primaryFont;
    let g = f.charToGlyph(ch);
    if (!g || g.name === '.notdef' || g.index === 0) {
      if (fallbackFont) {
        f = fallbackFont;
        g = f.charToGlyph(ch);
      }
    }
    const scale = (1 / f.unitsPerEm) * fontSize;
    w += (g.advanceWidth || 0) * scale;
  }

  return w;
}

/**
 * Applies the official, elegant Bat Mitzvah commemorative dedication banner onto the generated souvenir image.
 * Uses high-performance pure vector SVG bezier paths via OpenType.js and Sharp.
 * 100% immune to missing system fonts / tofu boxes in production containers.
 * Exactly matches: "מזכרת מבת המצווה של אורי קלזן"
 */
async function applyDedicationOverlayServer(photoBase64OrDataUrl: string): Promise<string> {
  try {
    let cleanBase64 = photoBase64OrDataUrl;
    if (photoBase64OrDataUrl.includes(';base64,')) {
      cleanBase64 = photoBase64OrDataUrl.split(';base64,')[1];
    }
    const inputBuffer = Buffer.from(cleanBase64, 'base64');
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    const bannerHeight = Math.max(120, Math.round(height * 0.13));
    const bannerY = height - bannerHeight;
    const fadeHeight = Math.round(bannerHeight * 0.26);

    const mainFontSize = Math.max(24, Math.round(width * 0.033));
    const subFontSize = Math.max(13, Math.round(width * 0.0175));
    const diamondSize = Math.max(4, Math.round(width * 0.005));

    const mainY = bannerY + Math.round(bannerHeight * 0.45);
    const subY = bannerY + Math.round(bannerHeight * 0.78);

    let textVectorElements = '';

    if (vectorBoldFont && vectorFallbackFont) {
      // Vector rendering: 100% immune to missing container fonts!
      const titleText = 'מזכרת מבת המצווה של אורי קלזן';
      const titleWidth = getSegmentVectorWidth(titleText, vectorBoldFont, vectorFallbackFont, mainFontSize, true);
      const titleStartX = (width - titleWidth) / 2;
      const titleResult = renderSegmentToVectorPath(titleText, vectorBoldFont, vectorFallbackFont, titleStartX, mainY, mainFontSize, true);
      const titleShadow = renderSegmentToVectorPath(titleText, vectorBoldFont, vectorFallbackFont, titleStartX, mainY + 1.5, mainFontSize, true);

      // Subtitle layout: Left to right on the screen:
      // [קרני שומרון] [ • 2.12.26 • ] [יום רביעי, כב' כסלו] [🌿 leaf icon]
      const regFont = vectorRegFont || vectorBoldFont;
      const seg1 = 'קרני שומרון';
      const seg2 = ' • 2.12.26 • ';
      const seg3 = 'יום רביעי, כב\' כסלו';

      const w1 = getSegmentVectorWidth(seg1, regFont, vectorFallbackFont, subFontSize, true);
      const w2 = getSegmentVectorWidth(seg2, regFont, vectorFallbackFont, subFontSize, false);
      const w3 = getSegmentVectorWidth(seg3, regFont, vectorFallbackFont, subFontSize, true);
      const leafSpacing = Math.round(subFontSize * 0.45);
      const leafWidth = subFontSize * 0.95;
      const totalSubWidth = w1 + w2 + w3 + leafSpacing + leafWidth;

      let curSubX = (width - totalSubWidth) / 2;

      const r1 = renderSegmentToVectorPath(seg1, regFont, vectorFallbackFont, curSubX, subY, subFontSize, true);
      curSubX += w1;

      const r2 = renderSegmentToVectorPath(seg2, regFont, vectorFallbackFont, curSubX, subY, subFontSize, false);
      curSubX += w2;

      const r3 = renderSegmentToVectorPath(seg3, regFont, vectorFallbackFont, curSubX, subY, subFontSize, true);
      curSubX += w3 + leafSpacing;

      const leafY = subY - subFontSize * 0.78;
      const leafScale = (subFontSize * 0.9) / 24;
      const leafSvg = `
        <g transform="translate(${curSubX.toFixed(2)}, ${leafY.toFixed(2)}) scale(${leafScale.toFixed(3)})">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3 5.52 0 10-4.48 10-10V8c0-.69-.5-1.28-1.18-1.39A28.6 28.6 0 0 0 17 8zm-8.86 10.4c.73-1.63 1.77-3.5 3.36-4.9 1.63-1.44 3.73-2.4 6.5-2.9-1.2 3.8-3.6 6.3-6.5 7.4-.95.36-2.1.48-3.36.4z" fill="#78b159"/>
          <path d="M7 6C4.5 7 3.5 9.5 3 12c1.5-.5 3-1.5 4-3 1-1.5 1-2.5 0-3z" fill="#9bc872"/>
        </g>
      `;

      textVectorElements = `
        <!-- Title Shadow & Main Text as Bezier Paths -->
        <path d="${titleShadow.path.toPathData(2)}" fill="#000000" opacity="0.65" />
        <path d="${titleResult.path.toPathData(2)}" fill="#ffffff" />

        <!-- Subtitle as Bezier Paths -->
        <path d="${r1.path.toPathData(2)}" fill="#d3e2d0" />
        <path d="${r2.path.toPathData(2)}" fill="#d3e2d0" />
        <path d="${r3.path.toPathData(2)}" fill="#d3e2d0" />
        ${leafSvg}
      `;
    } else {
      // Graceful fallback to SVG text tags
      const titleText = 'מזכרת מבת המצווה של אורי קלזן';
      const subText = 'יום רביעי, כב\' כסלו • 2.12.26 • קרני שומרון 🌿';
      textVectorElements = `
        <text x="${width / 2}" y="${mainY}" text-anchor="middle"
              fill="#ffffff" font-size="${mainFontSize}" font-weight="bold"
              font-family="'Noto Sans Hebrew', 'DejaVu Sans', 'Rubik', sans-serif"
              letter-spacing="0.5">${titleText}</text>
        <text x="${width / 2}" y="${subY}" text-anchor="middle"
              fill="#d3e2d0" font-size="${subFontSize}" font-weight="500"
              font-family="'Noto Sans Hebrew', 'DejaVu Sans', 'Rubik', sans-serif">${subText}</text>
      `;
    }

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bannerFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#121713" stop-opacity="0" />
            <stop offset="28%" stop-color="#121713" stop-opacity="0.80" />
            <stop offset="65%" stop-color="#0c100d" stop-opacity="0.94" />
            <stop offset="100%" stop-color="#070a08" stop-opacity="0.98" />
          </linearGradient>
          <linearGradient id="goldLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#c5a059" stop-opacity="0" />
            <stop offset="15%" stop-color="#c5a059" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#fff8e7" stop-opacity="1" />
            <stop offset="85%" stop-color="#c5a059" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#c5a059" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Dark Elegant Gradient Banner -->
        <rect x="0" y="${bannerY - fadeHeight}" width="${width}" height="${bannerHeight + fadeHeight}" fill="url(#bannerFade)" />

        <!-- Golden Divider Line -->
        <line x1="${width * 0.06}" y1="${bannerY}" x2="${width * 0.94}" y2="${bannerY}" stroke="url(#goldLineGrad)" stroke-width="${Math.max(1.5, width * 0.002)}" />

        <!-- Golden Diamond Emblem in Center -->
        <polygon points="${width / 2},${bannerY - diamondSize} ${width / 2 + diamondSize},${bannerY} ${width / 2},${bannerY + diamondSize} ${width / 2 - diamondSize},${bannerY}" fill="#fff8e7" />

        ${textVectorElements}
      </svg>
    `);

    const outputBuffer = await image
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[sharp] Error applying dedication overlay:', err);
    return photoBase64OrDataUrl;
  }
}

interface QuotaRecord {
  used: number;
  max: number;
  updatedAt: string;
}

function loadQuotas(): Record<string, QuotaRecord> {
  try {
    if (fs.existsSync(QUOTAS_FILE)) {
      return JSON.parse(fs.readFileSync(QUOTAS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading quotas file:', err);
  }
  return {};
}

function saveQuotas(quotas: Record<string, QuotaRecord>): void {
  try {
    fs.writeFileSync(QUOTAS_FILE, JSON.stringify(quotas, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving quotas file:', err);
  }
}

// Quota management: set to false to allow unlimited souvenir generation for guests
const QUOTA_ENABLED = false;

function getGuestQuota(guestId: string): { used: number; max: number; remaining: number; unlimited: boolean } {
  const quotas = loadQuotas();
  const record = quotas[guestId];
  const used = record ? record.used : 0;

  if (!QUOTA_ENABLED) {
    return {
      used,
      max: 999,
      remaining: 999,
      unlimited: true,
    };
  }

  const max = 5;
  return {
    used,
    max,
    remaining: Math.max(0, max - used),
    unlimited: false,
  };
}

function consumeGuestQuota(guestId: string): { used: number; max: number; remaining: number; unlimited: boolean } {
  const quotas = loadQuotas();
  const current = quotas[guestId] ? quotas[guestId].used : 0;
  const nextUsed = current + 1;
  const max = QUOTA_ENABLED ? 5 : 999;
  quotas[guestId] = {
    used: nextUsed,
    max,
    updatedAt: new Date().toISOString(),
  };
  saveQuotas(quotas);
  return {
    used: nextUsed,
    max,
    remaining: QUOTA_ENABLED ? Math.max(0, max - nextUsed) : 999,
    unlimited: !QUOTA_ENABLED,
  };
}

const SOUVENIR_STYLE_PROMPTS: Record<string, string> = {
  'watercolor': 'Delicate artistic watercolor and soft gouache illustration, fluid organic pigment paper bleeding textures, soft sage green and blush floral washes, hand-painted fine art portrait aesthetic.',
  'festive-party': 'Glamorous Bat Mitzvah celebration party, golden floating confetti, sparkling celebratory bokeh lights, joyous festive evening dance floor ambiance.',
  'retro-80s': '1980s retro synthwave portrait, neon pastel magenta and cyan lighting, authentic VHS warm glow and subtle vintage grain, stylish 80s celebratory aesthetic.',
  'pop-art': 'Vibrant Roy Lichtenstein pop art comic book portrait, bold graphic ink lines, halftone Ben-Day dots, saturated cheerful colors, dynamic pop art poster illustration.',
  'caricature': 'Charming, delightful, high-end celebratory caricature digital illustration, warm friendly expressions, respectful playful artistic stylization with big expressive eyes and joy.',
  'oil-painting': 'Masterpiece classical fine art oil painting, rich textured canvas brush strokes, warm golden Rembrandt chiaroscuro lighting, regal museum quality portrait.',
  'vintage-bw': 'Timeless 1940s classic Hollywood vintage black and white glamour portrait, deep silvery monochrome tones, authentic film grain, soft directional studio lighting.',
  'princess': 'Enchanted royal fairy tale ball portrait, ethereal magical glowing sparkles, dreamy pastel flower garden backdrop, elegant festive regal atmosphere.',
  'hawaii': 'Dreamy tropical Hawaiian paradise beach, sunset golden hour lighting over turquoise ocean waves, lush palm trees, warm ocean breeze, joyful vacation feel.',
  '3d-animation': 'Modern 3D animated feature film hero style (Pixar/Disney 3D animation look), smooth stylized 3D forms, expressive radiant eyes, warm cinematic studio illumination.',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize data files if not exist
  if (!fs.existsSync(EVENT_FILE)) saveEvent(DEFAULT_EVENT);
  if (!fs.existsSync(RSVPS_FILE)) saveRSVPs(DEFAULT_RSVPS);

  // --- Firestore Quota Circuit-Breaker & TTL Cache ---
  let firestoreQuotaExceededUntil = 0;
  let lastQuotaWarningTime = 0;

  function isQuotaExceededError(err: any): boolean {
    const msg = (err && (err.message || String(err))) || '';
    return (
      msg.includes('Quota limit exceeded') ||
      msg.includes('Quota exceeded') ||
      msg.includes('quota metric') ||
      msg.includes('resource-exhausted') ||
      msg.includes('RESOURCE_EXHAUSTED')
    );
  }

  function handleFirestoreReadError(operation: string, err: any) {
    if (isQuotaExceededError(err)) {
      // Backoff remote reads for 1 hour so the server doesn't hammer the exhausted quota
      firestoreQuotaExceededUntil = Date.now() + 60 * 60 * 1000;
      const now = Date.now();
      if (now - lastQuotaWarningTime > 5 * 60 * 1000) {
        lastQuotaWarningTime = now;
        console.warn(`[Firestore] Daily read quota reached. Serving all data seamlessly from local persistent cache.`);
      }
    } else {
      console.warn(`[Firestore] ${operation} error:`, err);
    }
  }

  // In-memory caches to reduce Firestore read consumption
  let cachedEventData: EventDetails | null = null;
  let lastEventFetchTime = 0;

  let cachedRsvpsData: RSVP[] | null = null;
  let lastRsvpsFetchTime = 0;

  let cachedSouvenirsData: SouvenirItem[] | null = null;
  let lastSouvenirsFetchTime = 0;

  async function syncFirestoreOnStartup() {
    if (!firestoreDb || Date.now() < firestoreQuotaExceededUntil) return;
    try {
      console.log('[Firestore] Synchronizing persistent state...');
      // 1. Sync Event
      try {
        const eventRef = doc(firestoreDb, 'settings', 'event');
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const cloudEvent = eventSnap.data() as EventDetails;
          const merged = { ...DEFAULT_EVENT, ...cloudEvent };
          saveEvent(merged);
          cachedEventData = merged;
          lastEventFetchTime = Date.now();
        } else {
          await setDoc(eventRef, sanitizeForFirestore(loadEvent()));
        }
      } catch (e) {
        handleFirestoreReadError('Startup event sync', e);
      }

      if (Date.now() < firestoreQuotaExceededUntil) return;

      // 2. Sync RSVPs
      try {
        const rsvpsRef = collection(firestoreDb, 'rsvps');
        const rsvpsSnap = await getDocs(rsvpsRef);
        if (!rsvpsSnap.empty) {
          const cloudRsvps: RSVP[] = [];
          rsvpsSnap.forEach((d) => cloudRsvps.push(d.data() as RSVP));
          cloudRsvps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveRSVPs(cloudRsvps);
          cachedRsvpsData = cloudRsvps;
          lastRsvpsFetchTime = Date.now();
          console.log(`[Firestore] Synced ${cloudRsvps.length} RSVPs from cloud`);
        } else {
          const current = loadRSVPs();
          for (const r of current) {
            await setDoc(doc(firestoreDb, 'rsvps', r.id), sanitizeForFirestore(r));
          }
        }
      } catch (e) {
        handleFirestoreReadError('Startup RSVPs sync', e);
      }

      if (Date.now() < firestoreQuotaExceededUntil) return;

      // 3. Sync Souvenirs
      try {
        const souvenirsRef = collection(firestoreDb, 'souvenirs');
        const souvenirsSnap = await getDocs(souvenirsRef);
        if (!souvenirsSnap.empty) {
          const cloudSouvenirs: SouvenirItem[] = [];
          souvenirsSnap.forEach((d) => cloudSouvenirs.push(d.data() as SouvenirItem));
          cloudSouvenirs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveSouvenirs(cloudSouvenirs);
          cachedSouvenirsData = cloudSouvenirs;
          lastSouvenirsFetchTime = Date.now();
          console.log(`[Firestore] Synced ${cloudSouvenirs.length} souvenirs from cloud`);
        } else {
          const currentSouvenirs = loadSouvenirs();
          for (const s of currentSouvenirs) {
            await setDoc(doc(firestoreDb, 'souvenirs', s.id), sanitizeForFirestore(s));
          }
        }
      } catch (e) {
        handleFirestoreReadError('Startup souvenirs sync', e);
      }
    } catch (syncErr) {
      console.error('[Firestore] Startup sync warning:', syncErr);
    }
  }

  // --- Health Check for Cloud Run ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- API Endpoints ---
  app.get('/api/event', async (_req: Request, res: Response) => {
    const now = Date.now();
    if (cachedEventData && now - lastEventFetchTime < 60000) {
      return res.json(cachedEventData);
    }

    if (firestoreDb && now > firestoreQuotaExceededUntil) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'event'));
        if (snap.exists()) {
          const data = snap.data() as EventDetails;
          const merged = { ...DEFAULT_EVENT, ...data };
          saveEvent(merged);
          cachedEventData = merged;
          lastEventFetchTime = now;
          return res.json(merged);
        }
      } catch (err) {
        handleFirestoreReadError('GET /api/event', err);
      }
    }
    const local = loadEvent();
    cachedEventData = local;
    lastEventFetchTime = now;
    res.json(local);
  });

  app.post('/api/event', (req: Request, res: Response) => {
    const updated = { ...loadEvent(), ...req.body };
    saveEvent(updated);
    cachedEventData = updated;
    lastEventFetchTime = Date.now();
    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'settings', 'event'), sanitizeForFirestore(updated), { merge: true }).catch((e) => {
        if (!isQuotaExceededError(e)) {
          console.error('[Firestore] Event save error:', e);
        }
      });
    }
    res.json(updated);
  });

  app.get('/api/rsvps', async (_req: Request, res: Response) => {
    const now = Date.now();
    if (cachedRsvpsData && now - lastRsvpsFetchTime < 30000) {
      return res.json(cachedRsvpsData);
    }

    if (firestoreDb && now > firestoreQuotaExceededUntil) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'rsvps'));
        if (!snap.empty) {
          const items: RSVP[] = [];
          snap.forEach((d) => items.push(d.data() as RSVP));
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveRSVPs(items);
          cachedRsvpsData = items;
          lastRsvpsFetchTime = now;
          return res.json(items);
        }
      } catch (err) {
        handleFirestoreReadError('GET /api/rsvps', err);
      }
    }
    const local = loadRSVPs();
    cachedRsvpsData = local;
    lastRsvpsFetchTime = now;
    res.json(local);
  });

  app.post('/api/rsvps', (req: Request, res: Response) => {
    const {
      id,
      type,
      name,
      contactName,
      plusOne,
      plusOneName,
      count,
      phone,
      attending,
      dietary,
      songRequest,
      wishingMessage,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'שם הוא שדה חובה' });
    }

    const trimmedName = name.trim();
    const calculatedCount =
      attending === false
        ? 0
        : type === 'friend'
        ? (plusOne ? 2 : 1)
        : Math.max(1, Number(count) || 1);

    const current = loadRSVPs();

    // Check if updating an existing record
    let existingIndex = -1;
    if (id && typeof id === 'string') {
      existingIndex = current.findIndex((r) => r.id === id);
    }

    // A record is updated in-place ONLY if the ID matches AND the name is identical
    const isSameName =
      existingIndex !== -1 &&
      current[existingIndex].name.trim().toLowerCase() === trimmedName.toLowerCase();

    if (existingIndex !== -1 && isSameName) {
      // Update the existing record in-place
      const existing = current[existingIndex];
      const updatedRSVP: RSVP = {
        ...existing,
        type: type === 'family' ? 'family' : 'friend',
        name: trimmedName,
        contactName: contactName ? String(contactName).trim() : existing.contactName,
        plusOne: Boolean(plusOne),
        plusOneName: plusOne && plusOneName ? String(plusOneName).trim() : undefined,
        count: calculatedCount,
        phone: phone ? String(phone).trim() : existing.phone,
        attending: attending !== false,
        dietary: dietary ? String(dietary).trim() : undefined,
        songRequest: songRequest !== undefined ? (songRequest ? String(songRequest).trim() : undefined) : existing.songRequest,
        wishingMessage: wishingMessage !== undefined ? (wishingMessage ? String(wishingMessage).trim() : undefined) : existing.wishingMessage,
        updatedAt: new Date().toISOString(),
      };

      current[existingIndex] = updatedRSVP;
      saveRSVPs(current);
      cachedRsvpsData = current;
      lastRsvpsFetchTime = Date.now();
      if (firestoreDb) {
        setDoc(doc(firestoreDb, 'rsvps', updatedRSVP.id), sanitizeForFirestore(updatedRSVP), { merge: true }).catch((e) => {
          if (!isQuotaExceededError(e)) {
            console.error('[Firestore] RSVP update error:', e);
          }
        });
      }

      // Automatically forward updated RSVP to Google Sheets in background
      forwardRsvpToGoogleSheets(updatedRSVP);

      return res.status(200).json({ ...updatedRSVP, isUpdated: true });
    }

    // If the name was changed, or no matching ID was provided, create a brand-new record
    const newRSVP: RSVP = {
      id: 'rsvp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type: type === 'family' ? 'family' : 'friend',
      name: trimmedName,
      contactName: contactName ? String(contactName).trim() : undefined,
      plusOne: Boolean(plusOne),
      plusOneName: plusOne && plusOneName ? String(plusOneName).trim() : undefined,
      count: calculatedCount,
      phone: phone ? String(phone).trim() : undefined,
      attending: attending !== false,
      dietary: dietary ? String(dietary).trim() : undefined,
      songRequest: songRequest ? String(songRequest).trim() : undefined,
      wishingMessage: wishingMessage ? String(wishingMessage).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRSVP, ...current];
    saveRSVPs(updated);
    cachedRsvpsData = updated;
    lastRsvpsFetchTime = Date.now();
    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'rsvps', newRSVP.id), sanitizeForFirestore(newRSVP), { merge: true }).catch((e) => {
        if (!isQuotaExceededError(e)) {
          console.error('[Firestore] RSVP create error:', e);
        }
      });
    }

    // Automatically forward new RSVP to Google Sheets in background
    forwardRsvpToGoogleSheets(newRSVP);

    return res.status(201).json({ ...newRSVP, isUpdated: false });
  });

  async function forwardRsvpToGoogleSheets(rsvp: RSVP) {
    try {
      const event = loadEvent();
      const webhookUrl = event.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
        return;
      }

      const payload = {
        action: 'saveRsvp',
        id: rsvp.id,
        type: rsvp.type === 'family' ? 'משפחה' : 'חברה',
        name: rsvp.name,
        combinedNames: rsvp.type === 'friend' && rsvp.plusOne && rsvp.plusOneName
          ? `${rsvp.name} + ${rsvp.plusOneName}`
          : rsvp.name,
        songRequest: rsvp.songRequest || '',
        wishingMessage: rsvp.wishingMessage || '',
        formattedDate: new Date(rsvp.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        count: rsvp.count || 1,
        attending: rsvp.attending ? 'מגיע/ה' : 'לא מגיע/ה',
      };

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      }).catch((err) => console.warn('[GoogleSheets] Background forward error:', err));
    } catch (err) {
      console.warn('[GoogleSheets] Error in forwardRsvpToGoogleSheets:', err);
    }
  }

  // --- Google Sheets Sync Endpoint ---
  app.post('/api/sync-sheets', async (req: Request, res: Response) => {
    try {
      const { webhookUrl } = req.body;
      const event = loadEvent();
      const targetUrl = webhookUrl || event.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

      if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
        return res.status(400).json({ error: 'חסר קישור תקין ל-Google Apps Script Webhook. אנא הזינו ושמרו אותו בהגדרות האירוע.' });
      }

      const rsvps = loadRSVPs();
      const formattedRsvps = rsvps.map((r) => ({
        id: r.id,
        type: r.type === 'family' ? 'משפחה' : 'חברה',
        name: r.name,
        combinedNames: r.type === 'friend' && r.plusOne && r.plusOneName
          ? `${r.name} + ${r.plusOneName}`
          : r.name,
        songRequest: r.songRequest || '',
        wishingMessage: r.wishingMessage || '',
        formattedDate: new Date(r.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        count: r.count || 1,
        attending: r.attending ? 'מגיע/ה' : 'לא מגיע/ה',
      }));

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batchSync',
          rsvps: formattedRsvps,
        }),
        redirect: 'follow',
      });

      if (!response.ok) {
        return res.status(502).json({ error: `תגובה מה-Google Script: קוד ${response.status}` });
      }

      let scriptData: any = {};
      try {
        scriptData = await response.json();
      } catch (e) {
        console.warn('[GoogleSheets] Failed to parse script JSON response:', e);
      }

      let addedFromSheet = 0;
      let updatedFromSheet = 0;
      let allRsvps: RSVP[] = [...rsvps];

      // Handle items incoming from the Google Sheet (two-way sync)
      if (scriptData && Array.isArray(scriptData.sheetRsvps)) {
        for (const item of scriptData.sheetRsvps) {
          if (!item) continue;
          const rawName = String(item.combinedNames || item.name || '').trim();
          if (!rawName) continue; // Skip empty rows

          // Look for matching RSVP by ID or exact name
          const existingIndex = allRsvps.findIndex((r) => {
            if (item.id && r.id === item.id) return true;
            return r.name.trim().toLowerCase() === rawName.toLowerCase();
          });

          const isFamily =
            item.type === 'משפחה' ||
            rawName.startsWith('משפחת') ||
            rawName.includes('משפחה');
          const parsedCount = parseInt(String(item.count), 10);
          const validCount = !isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1;
          const attendingStr = String(item.attending || '').trim();
          const isAttending =
            attendingStr !== 'לא' &&
            attendingStr !== 'לא מגיע/ה' &&
            attendingStr !== 'false' &&
            attendingStr !== '0';

          if (existingIndex >= 0) {
            // Update existing record if modified in Google Sheets
            const existing = { ...allRsvps[existingIndex] };
            let changed = false;

            if (existing.count !== validCount) {
              existing.count = validCount;
              changed = true;
            }
            if (existing.attending !== isAttending) {
              existing.attending = isAttending;
              changed = true;
            }
            if (item.songRequest !== undefined && existing.songRequest !== String(item.songRequest).trim()) {
              existing.songRequest = String(item.songRequest).trim();
              changed = true;
            }
            if (item.wishingMessage !== undefined && existing.wishingMessage !== String(item.wishingMessage).trim()) {
              existing.wishingMessage = String(item.wishingMessage).trim();
              changed = true;
            }

            if (changed) {
              allRsvps[existingIndex] = existing;
              updatedFromSheet++;
              if (firestoreDb) {
                setDoc(doc(firestoreDb, 'rsvps', existing.id), sanitizeForFirestore(existing), { merge: true }).catch((e) =>
                  console.error('[Firestore] Sync update error:', e)
                );
              }
            }
          } else {
            // New record added manually directly in Google Sheets!
            const newId =
              item.id ||
              'rsvp-sheet-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

            const newRsvp: RSVP = {
              id: newId,
              type: isFamily ? 'family' : 'friend',
              name: rawName,
              count: validCount,
              attending: isAttending,
              songRequest: item.songRequest ? String(item.songRequest).trim() : undefined,
              wishingMessage: item.wishingMessage ? String(item.wishingMessage).trim() : undefined,
              createdAt: item.createdAt || new Date().toISOString(),
            };

            allRsvps.unshift(newRsvp);
            addedFromSheet++;

            if (firestoreDb) {
              setDoc(doc(firestoreDb, 'rsvps', newRsvp.id), sanitizeForFirestore(newRsvp), { merge: true }).catch((e) =>
                console.error('[Firestore] Sync add error:', e)
              );
            }
          }
        }

        if (addedFromSheet > 0 || updatedFromSheet > 0) {
          saveRSVPs(allRsvps);
        }
      }

      res.json({
        success: true,
        count: formattedRsvps.length,
        syncedToSheet: formattedRsvps.length,
        addedFromSheet,
        updatedFromSheet,
        totalRsvps: allRsvps.length,
        rsvps: allRsvps,
      });
    } catch (err: any) {
      console.error('[GoogleSheets] Batch sync error:', err);
      res.status(500).json({ error: err.message || 'שגיאה בסנכרון מול Google Sheets' });
    }
  });

  app.delete('/api/rsvps/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = loadRSVPs();
    const filtered = current.filter((item) => item.id !== id);
    saveRSVPs(filtered);
    cachedRsvpsData = filtered;
    lastRsvpsFetchTime = Date.now();
    if (firestoreDb) {
      deleteDoc(doc(firestoreDb, 'rsvps', id)).catch((e) => {
        if (!isQuotaExceededError(e)) {
          console.error('[Firestore] RSVP delete error:', e);
        }
      });
    }
    res.json({ success: true, count: filtered.length });
  });

  // --- Gemini TTS Endpoint (gemini-3.8-flash-tts) ---
  app.post('/api/gemini/tts', async (req: Request, res: Response) => {
    try {
      const { text, speakerStyle } = req.body;
      const promptText = text || 'מזל טוב לנועה לבת המצווה! מחכים לראותכם באירוע המרגש והמשמח שלנו!';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: promptText,
                speechMetadata: {
                  style: speakerStyle || 'Joyful, warm, enthusiastic celebratory Israeli Hebrew speaker',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: 'לא התקבל אודיו מהמודל' });
      }

      res.json({
        audioUrl: `data:audio/wav;base64,${base64Audio}`,
        mimeType: 'audio/wav',
      });
    } catch (err: any) {
      console.error('Error generating TTS:', err);
      res.status(500).json({ error: err.message || 'שגיאה ביצירת הקראת שמע' });
    }
  });

  function escapeXml(unsafe: string): string {
    return (unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function generateCommemorativeCardSvg(params: {
    celebrantName: string;
    venueName: string;
    date: string;
    promptText: string;
    width: number;
    height: number;
  }): string {
    const { celebrantName, venueName, promptText, width, height } = params;
    const safeName = escapeXml(celebrantName);
    const safeVenue = escapeXml(venueName);
    const safePrompt = escapeXml(promptText);

    const words = safePrompt.split(' ');
    const line1 = words.slice(0, 7).join(' ');
    const line2 = words.slice(7, 15).join(' ');
    const line3 = words.slice(15, 23).join(' ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${width}" height="${height}" dir="rtl">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCFAF6" />
        <stop offset="50%" stop-color="#F5EFE6" />
        <stop offset="100%" stop-color="#EDE4D6" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E2CA90" />
        <stop offset="50%" stop-color="#BFA565" />
        <stop offset="100%" stop-color="#9C7F42" />
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#3D2E14" flood-opacity="0.12" />
      </filter>
    </defs>

    <!-- Background Canvas -->
    <rect width="1024" height="1024" fill="url(#bgGrad)" />

    <!-- Outer Decorative Border -->
    <rect x="36" y="36" width="952" height="952" rx="28" fill="none" stroke="url(#goldGrad)" stroke-width="3" opacity="0.8" />
    <rect x="52" y="52" width="920" height="920" rx="20" fill="none" stroke="#6F8569" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6" />

    <!-- Inner Card with Soft Shadow -->
    <rect x="76" y="76" width="872" height="872" rx="24" fill="#FAF7F2" filter="url(#shadow)" stroke="#E5DEC9" stroke-width="1.5" />

    <!-- Corner Botanical Flourishes (Olive Branches) -->
    <g transform="translate(860, 100) scale(0.95)" fill="none" stroke="#5E7859" stroke-width="2" stroke-linecap="round">
      <path d="M 0,0 C -30,20 -60,60 -70,110" />
      <path d="M -20,15 C -35,5 -45,15 -35,25 C -25,35 -15,25 -20,15 Z" fill="#759370" opacity="0.75" />
      <path d="M -45,45 C -60,35 -70,45 -60,55 C -50,65 -40,55 -45,45 Z" fill="#8CA687" opacity="0.8" />
      <path d="M -60,85 C -75,80 -80,95 -70,100 C -60,105 -55,95 -60,85 Z" fill="#6A8564" opacity="0.7" />
    </g>

    <g transform="translate(164, 100) scale(-0.95, 0.95)" fill="none" stroke="#5E7859" stroke-width="2" stroke-linecap="round">
      <path d="M 0,0 C -30,20 -60,60 -70,110" />
      <path d="M -20,15 C -35,5 -45,15 -35,25 C -25,35 -15,25 -20,15 Z" fill="#759370" opacity="0.75" />
      <path d="M -45,45 C -60,35 -70,45 -60,55 C -50,65 -40,55 -45,45 Z" fill="#8CA687" opacity="0.8" />
      <path d="M -60,85 C -75,80 -80,95 -70,100 C -60,105 -55,95 -60,85 Z" fill="#6A8564" opacity="0.7" />
    </g>

    <g transform="translate(860, 924) scale(0.95, -0.95)" fill="none" stroke="#5E7859" stroke-width="2" stroke-linecap="round">
      <path d="M 0,0 C -30,20 -60,60 -70,110" />
      <path d="M -20,15 C -35,5 -45,15 -35,25 C -25,35 -15,25 -20,15 Z" fill="#759370" opacity="0.75" />
      <path d="M -45,45 C -60,35 -70,45 -60,55 C -50,65 -40,55 -45,45 Z" fill="#8CA687" opacity="0.8" />
    </g>

    <g transform="translate(164, 924) scale(-0.95, -0.95)" fill="none" stroke="#5E7859" stroke-width="2" stroke-linecap="round">
      <path d="M 0,0 C -30,20 -60,60 -70,110" />
      <path d="M -20,15 C -35,5 -45,15 -35,25 C -25,35 -15,25 -20,15 Z" fill="#759370" opacity="0.75" />
      <path d="M -45,45 C -60,35 -70,45 -60,55 C -50,65 -40,55 -45,45 Z" fill="#8CA687" opacity="0.8" />
    </g>

    <!-- Top Badge / Sparkles -->
    <g transform="translate(512, 175)" text-anchor="middle">
      <text y="0" font-family="'Rubik', sans-serif" font-size="18" font-weight="600" letter-spacing="4" fill="#88734C">✨  מ ז כ ר ת   ב ת   מ צ ו ו ה  ✨</text>
    </g>

    <!-- Main Title -->
    <g transform="translate(512, 275)" text-anchor="middle">
      <text y="0" font-family="'Frank Ruhl Libre', serif" font-size="44" font-weight="400" fill="#4A5C47">בת המצווה של</text>
      <text y="100" font-family="'Frank Ruhl Libre', serif" font-size="108" font-weight="800" fill="#243322" letter-spacing="2">${safeName}</text>
    </g>

    <!-- Golden Divider -->
    <g transform="translate(512, 430)">
      <line x1="-160" y1="0" x2="-25" y2="0" stroke="url(#goldGrad)" stroke-width="2" />
      <circle cx="0" cy="0" r="5" fill="#BFA565" />
      <line x1="25" y1="0" x2="160" y2="0" stroke="url(#goldGrad)" stroke-width="2" />
    </g>

    <!-- Prompt / Blessing Content Box -->
    <g transform="translate(512, 530)" text-anchor="middle">
      <rect x="-350" y="-30" width="700" height="190" rx="18" fill="#F4EFE6" fill-opacity="0.6" stroke="#E0D6C1" stroke-width="1" />
      <text y="28" font-family="'Rubik', sans-serif" font-size="28" font-weight="500" fill="#31422E">"${line1}"</text>
      ${line2 ? `<text y="78" font-family="'Rubik', sans-serif" font-size="26" font-weight="400" fill="#4B5E48">${line2}</text>` : ''}
      ${line3 ? `<text y="124" font-family="'Rubik', sans-serif" font-size="24" font-weight="400" fill="#657A62">${line3}</text>` : ''}
    </g>

    <!-- Bottom Event Details -->
    <g transform="translate(512, 790)" text-anchor="middle">
      <text y="0" font-family="'Rubik', sans-serif" font-size="26" font-weight="700" fill="#243322">יום רביעי, כב' כסלו · 2.12.26 · בשעה 19:00</text>
      <text y="42" font-family="'Rubik', sans-serif" font-size="22" font-weight="500" fill="#5A6D56">${safeVenue}</text>
      <text y="82" font-family="'Rubik', sans-serif" font-size="20" font-weight="400" fill="#84714D">באהבה והערכה רבה, משפחת קלזן 💚</text>
    </g>
  </svg>`;
  }

  // --- Gemini Image Generation Endpoint ---
  app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
    try {
      const { prompt, imageSize = '1K', aspectRatio = '1:1' } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'חסר תיאור לתמונה' });
      }

      // Valid sizes: "1K", "2K", "4K"
      const allowedSizes = ['1K', '2K', '4K'];
      const finalSize = allowedSizes.includes(imageSize) ? imageSize : '1K';
      const eventInfo = loadEvent();

      let imageUrl: string | null = null;

      // 1. Attempt Gemini image generation with gemini-3.1-flash-lite-image
      try {
        const enrichedPrompt = `Bat Mitzvah celebration keepsake illustration: ${prompt}. Elegant, glamorous, festive party lighting, confetti, pastel flowers, golden highlights, joyful high resolution celebration aesthetic.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: enrichedPrompt }],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (geminiError) {
        console.warn('Gemini image generation unavailable, fallback to high-res card renderer:', geminiError);
      }

      // 2. If Gemini returned an image, return it
      if (imageUrl) {
        return res.json({ imageUrl, size: finalSize });
      }

      // 3. Fallback: High-resolution custom Bat Mitzvah commemorative card
      const width = finalSize === '4K' ? 2048 : finalSize === '2K' ? 1536 : 1024;
      const height = width;

      const svgCard = generateCommemorativeCardSvg({
        celebrantName: eventInfo.celebrantName || 'אורי',
        venueName: eventInfo.venueName,
        date: eventInfo.date,
        promptText: prompt,
        width,
        height,
      });

      const base64Svg = Buffer.from(svgCard, 'utf-8').toString('base64');
      imageUrl = `data:image/svg+xml;base64,${base64Svg}`;

      res.json({ imageUrl, size: finalSize });
    } catch (err: any) {
      console.error('Error generating image:', err);
      res.status(500).json({ error: 'אירעה שגיאה' });
    }
  });

  // --- Guest Souvenir Quota Endpoint ---
  app.get('/api/souvenir/quota', (req: Request, res: Response) => {
    const guestId = (req.query.guestId as string) || req.ip || 'anonymous';
    const quota = getGuestQuota(guestId);
    res.json({ guestId, ...quota });
  });

  // --- Guest Souvenir Photo Editing Endpoint ---
  app.post('/api/souvenir/generate', async (req: Request, res: Response) => {
    try {
      const {
        guestId,
        photoBase64,
        mimeType = 'image/jpeg',
        styleId = 'watercolor',
        customPrompt = '',
        creatorName = '',
      } = req.body;
      const effectiveGuestId = (guestId && typeof guestId === 'string' && guestId.trim()) ? guestId.trim() : (req.ip || 'anonymous');

      if (!photoBase64 || typeof photoBase64 !== 'string') {
        return res.status(400).json({ error: 'אנא בחרו או העלו תמונה לפני יצירת המזכרת' });
      }

      // Check server-side quota (if enabled)
      const currentQuota = getGuestQuota(effectiveGuestId);
      if (QUOTA_ENABLED && currentQuota.remaining <= 0) {
        return res.status(429).json({
          error: 'מיצית את מכסת המזכרות האישיות לאירוע זה. תודה שהשתתפת בחגיגה של אורי!',
          remaining: 0,
          used: currentQuota.used,
          max: currentQuota.max,
        });
      }

      // Clean base64 data
      let cleanBase64 = photoBase64;
      let cleanMime = mimeType;
      if (photoBase64.includes(';base64,')) {
        const parts = photoBase64.split(';base64,');
        cleanMime = parts[0].replace('data:', '') || cleanMime;
        cleanBase64 = parts[1];
      }

      const styleDescription = SOUVENIR_STYLE_PROMPTS[styleId] || SOUVENIR_STYLE_PROMPTS['watercolor'];
      const userCustom = (customPrompt && typeof customPrompt === 'string' && customPrompt.trim().length > 0) ? customPrompt.trim() : '';

      // Craft strict identity-preserving, group-preserving instruction
      const promptInstructions = [
        `CRITICAL TASK - USER COMMEMORATIVE PHOTO EDITING:`,
        `1. STRICT IDENTITY PRESERVATION: You MUST strictly preserve the EXACT facial features, facial structure, eye shape, nose, smile, skin tone, hair, age, gender, and personal likeness of every single person visible in the source photo. The person/people in the result MUST be unmistakably and faithfully recognizable as the exact individuals in the uploaded photo.`,
        `2. GROUP CONSISTENCY: Retain every person present in the source image in their relative positions. Do NOT omit any person and do NOT add any additional people.`,
        `3. ARTISTIC STYLE TRANSFORMATION: Transform the clothing, background setting, artistic medium, and ambient lighting into the following style: "${styleDescription}".`,
        userCustom ? `4. CUSTOM USER SPECIFICATION: "${userCustom}". Combine this seamlessly with the chosen style without compromising facial likeness.` : '',
        `5. COMPOSITION: Center the subjects with comfortable headroom and keep the bottom 12% clean for a commemorative dedication. Produce a high-resolution, vibrant, festive portrait.`,
      ].filter(Boolean).join('\n\n');

      let generatedDataUrl: string | null = null;

      // Primary attempt: gemini-3-pro-image (highest fidelity image editing)
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: cleanMime,
                },
              },
              {
                text: promptInstructions,
              },
            ],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            generatedDataUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (proErr: any) {
        console.warn('gemini-3-pro-image error, trying gemini-3.1-flash-lite-image fallback:', proErr?.message || proErr);
        // Secondary attempt: gemini-3.1-flash-lite-image
        try {
          const responseLite = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: cleanMime,
                  },
                },
                {
                  text: promptInstructions,
                },
              ],
            },
          });

          const parts = responseLite.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              generatedDataUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch (liteErr: any) {
          console.error('All image editing models failed:', liteErr?.message || liteErr);
        }
      }

      if (!generatedDataUrl) {
        return res.status(500).json({ error: 'אירעה שגיאה ביצירת המזכרת, אנא נסו שוב בעוד רגע' });
      }

      // Apply official commemorative dedication banner immediately on server
      const stampedImageUrl = await applyDedicationOverlayServer(generatedDataUrl);

      // Success! Deduct 1 from guest quota
      const updatedQuota = consumeGuestQuota(effectiveGuestId);

      const styleName = SOUVENIR_STYLE_NAMES[styleId] || 'סגנון אישי';
      const cleanCreator = (creatorName && typeof creatorName === 'string' && creatorName.trim()) 
        ? creatorName.trim() 
        : 'חבר/ת המשפחה';
      const newSouvenir: SouvenirItem = {
        id: 'souvenir-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        guestId: effectiveGuestId,
        creatorName: cleanCreator,
        styleId,
        styleName,
        imageUrl: stampedImageUrl,
        customPrompt: userCustom || undefined,
        createdAt: new Date().toISOString(),
      };
      const allSouvenirs = loadSouvenirs();
      saveSouvenirs([newSouvenir, ...allSouvenirs]);
      if (firestoreDb) {
        setDoc(doc(firestoreDb, 'souvenirs', newSouvenir.id), sanitizeForFirestore(newSouvenir)).catch((e) =>
          console.error('[Firestore] Souvenir generate save error:', e)
        );
      }

      res.json({
        id: newSouvenir.id,
        imageUrl: stampedImageUrl,
        remaining: updatedQuota.remaining,
        used: updatedQuota.used,
        max: updatedQuota.max,
        styleId,
      });
    } catch (err: any) {
      console.error('Error in /api/souvenir/generate:', err);
      res.status(500).json({ error: 'אירעה שגיאה' });
    }
  });

  // --- Souvenirs Gallery Endpoints ---
  app.get('/api/souvenirs', async (req: Request, res: Response) => {
    let items: SouvenirItem[] = [];
    const now = Date.now();

    if (cachedSouvenirsData && now - lastSouvenirsFetchTime < 30000) {
      items = cachedSouvenirsData;
    } else if (firestoreDb && now > firestoreQuotaExceededUntil) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'souvenirs'));
        if (!snap.empty) {
          snap.forEach((d) => items.push(d.data() as SouvenirItem));
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveSouvenirs(items);
          cachedSouvenirsData = items;
          lastSouvenirsFetchTime = now;
        }
      } catch (err) {
        handleFirestoreReadError('GET /api/souvenirs', err);
      }
    }
    if (items.length === 0) {
      items = loadSouvenirs();
      cachedSouvenirsData = items;
      lastSouvenirsFetchTime = now;
    }

    // Compute overall style counts before filtering
    const allCount = items.length;
    const styleCounts: Record<string, number> = {};
    for (const it of items) {
      if (it.styleId) {
        styleCounts[it.styleId] = (styleCounts[it.styleId] || 0) + 1;
      }
    }

    const { style, limit, offset, all, format } = req.query;
    let result = items;
    if (style && style !== 'all') {
      result = result.filter((s) => s.styleId === style);
    }
    const filteredTotal = result.length;

    // Set informative headers
    res.setHeader('X-Total-Count', filteredTotal.toString());
    res.setHeader('X-Overall-Count', allCount.toString());
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Overall-Count, X-Has-More');

    // If caller explicitly requested all items (e.g., admin dashboard)
    if (all === 'true' || limit === 'all') {
      res.setHeader('X-Has-More', 'false');
      if (format === 'object' || req.query.paginated === 'true') {
        return res.json({
          items: result,
          total: filteredTotal,
          overallTotal: allCount,
          styleCounts,
          hasMore: false,
          offset: 0,
          limit: filteredTotal,
        });
      }
      return res.json(result);
    }

    // Apply pagination (default 20 items per call)
    const parsedLimit = limit !== undefined ? parseInt(limit as string, 10) : 20;
    const parsedOffset = offset !== undefined ? parseInt(offset as string, 10) : 0;
    const safeLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const safeOffset = !isNaN(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const pagedItems = result.slice(safeOffset, safeOffset + safeLimit);
    const hasMore = safeOffset + safeLimit < filteredTotal;

    res.setHeader('X-Has-More', hasMore.toString());

    if (format === 'object' || req.query.paginated === 'true') {
      return res.json({
        items: pagedItems,
        total: filteredTotal,
        overallTotal: allCount,
        styleCounts,
        hasMore,
        offset: safeOffset,
        limit: safeLimit,
      });
    }

    // Default: returns array of up to 20 items
    res.json(pagedItems);
  });

  app.post('/api/souvenirs', (req: Request, res: Response) => {
    const { id, guestId, creatorName, styleId, styleName, imageUrl, customPrompt } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'חסרה תמונה לשמירה' });
    }
    const current = loadSouvenirs();
    const cleanCreator = (creatorName && typeof creatorName === 'string' && creatorName.trim())
      ? creatorName.trim()
      : 'חבר/ת המשפחה';
    const effectiveStyleName = styleName || SOUVENIR_STYLE_NAMES[styleId] || 'סגנון אישי';

    // If ID provided and exists in gallery, update its composed image URL
    if (id && typeof id === 'string') {
      const idx = current.findIndex((s) => s.id === id);
      if (idx !== -1) {
        current[idx] = {
          ...current[idx],
          imageUrl,
          creatorName: cleanCreator,
          styleName: effectiveStyleName,
          customPrompt: customPrompt || current[idx].customPrompt,
        };
        saveSouvenirs(current);
        if (firestoreDb) {
          setDoc(doc(firestoreDb, 'souvenirs', current[idx].id), sanitizeForFirestore(current[idx]), { merge: true }).catch((e) =>
            console.error('[Firestore] Souvenir update error:', e)
          );
        }
        return res.json(current[idx]);
      }
    }

    const newItem: SouvenirItem = {
      id: (id && typeof id === 'string') ? id : 'souvenir-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      guestId,
      creatorName: cleanCreator,
      styleId: styleId || 'watercolor',
      styleName: effectiveStyleName,
      imageUrl,
      customPrompt,
      createdAt: new Date().toISOString(),
    };

    const updatedSouvenirs = [newItem, ...current];
    saveSouvenirs(updatedSouvenirs);
    cachedSouvenirsData = updatedSouvenirs;
    lastSouvenirsFetchTime = Date.now();
    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'souvenirs', newItem.id), sanitizeForFirestore(newItem)).catch((e) => {
        if (!isQuotaExceededError(e)) {
          console.error('[Firestore] Souvenir create error:', e);
        }
      });
    }
    res.json(newItem);
  });

  app.delete('/api/souvenirs/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = loadSouvenirs();
    const filtered = current.filter((s) => s.id !== id);
    saveSouvenirs(filtered);
    cachedSouvenirsData = filtered;
    lastSouvenirsFetchTime = Date.now();
    if (firestoreDb) {
      deleteDoc(doc(firestoreDb, 'souvenirs', id)).catch((e) => {
        if (!isQuotaExceededError(e)) {
          console.error('[Firestore] Souvenir delete error:', e);
        }
      });
    }
    res.json({ success: true, count: filtered.length });
  });

  // --- Gemini Multi-turn Chat Endpoint (gemini-3.8-flash) ---
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      const eventInfo = loadEvent();
      const systemInstruction = `
אתה "שיר" - עוזר הבת מצווה החכם והחם של הבת מצווה של ${eventInfo.celebrantName}!
פרטי האירוע:
- כלת הבת מצווה: ${eventInfo.celebrantName}
- תאריך האירוע: ${eventInfo.date} בשעה ${eventInfo.time}
- קבלת פנים: ${eventInfo.receptionTime}
- אולם / מקום האירוע: ${eventInfo.venueName}, בכתובת: ${eventInfo.address}
- קוד לבוש: ${eventInfo.dressCode}
- טלפון לבירורים: ${eventInfo.contactPhone}
- קולינריה / כיבוד: האירוע חלבי! כשר, מגוון וטעים.

התפקיד שלך:
1. לסייע לאורחים (גם חברות וגם משפחות) בכל שאלה בנוגע לאירוע.
2. לעזור לחברות עם רעיונות למתנות שוות לבת מצווה, מה ללבוש, מתי לבוא, הצעות לשירים לרחבת הריקודים.
3. לעזור לאורחים לנסח ברכות מקוריות, מרגשות וקולעות לבת המצווה בספר הברכות.
4. לתת תשובות קצרות, חייכניות, חמות, מלאות באנרגיה חיובית ואימוג'ים מתאימים בעברית.
      `.trim();

      // Format contents for ai.models.generateContent
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || 'שמחה לעזור! שיהיה אירוע מושלם!';
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Error in chat endpoint:', err);
      res.status(500).json({ error: err.message || 'שגיאה בתקשורת עם העוזרת' });
    }
  });

  // --- Vite Dev or Production Static ---
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bat Mitzvah RSVP Server listening on http://0.0.0.0:${PORT}`);
    // Non-blocking sync with persistent Firestore database
    syncFirestoreOnStartup().catch((err) => {
      console.error('[Firestore] Background sync error:', err);
    });
  });
}

startServer();
