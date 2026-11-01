export interface SouvenirStyle {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  badgeColor: string;
}

export const SOUVENIR_STYLES: SouvenirStyle[] = [
  {
    id: 'watercolor',
    name: 'איור בצבעי מים',
    emoji: '🌿',
    tagline: 'שטיפות מים עדינות ורכות, גווני ירוק בוטני ואקליפטוס מעודן',
    badgeColor: 'bg-[#EFF5ED] text-[#344E31] border-[#CCDCCD]',
  },
  {
    id: 'festive-party',
    name: 'מסיבה חגיגית',
    emoji: '🪩',
    tagline: 'קונפטי זהוב מתעופף, אורות בוקה נוצצים ואווירת מסיבה משמחת',
    badgeColor: 'bg-[#FBF6E9] text-[#7A612B] border-[#E8DAC0]',
  },
  {
    id: 'retro-80s',
    name: 'רטרו שנות ה־80',
    emoji: '📼',
    tagline: 'תאורת ניאון פסטל, זוהר רטרו חמים ואווירת מסיבה נוסטלגית',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  },
  {
    id: 'pop-art',
    name: 'קומיקס ופופ ארט',
    emoji: '💥',
    tagline: 'קווי מתאר גרפיים, נקודות בנגיעות רוי ליכטנשטיין וצבעים עזים',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'caricature',
    name: 'קריקטורה חגיגית',
    emoji: '🎨',
    tagline: 'איור דיגיטלי מתוק, שובב ומחמיא עם הבעות שמחות ומלאות חיים',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    id: 'oil-painting',
    name: 'ציור שמן קלאסי',
    emoji: '🖼️',
    tagline: 'משיכות מכחול עשירות, תאורת מאסטר חמה ומרקם בד ציור יוקרתי',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
  },
  {
    id: 'vintage-bw',
    name: 'וינטג׳ שחור־לבן',
    emoji: '🎞️',
    tagline: 'צילום קלאסי על־זמני בגווני כסף עמוקים וגרעיניות פילם אותנטית',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  },
  {
    id: 'princess',
    name: 'נסיכות ואגדות',
    emoji: '👑',
    tagline: 'נשף מלכותי קסום, ניצוצות זוהרים וגן פרחים כמו באגדות',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    id: 'hawaii',
    name: 'חופשה בהוואי',
    emoji: '🌺',
    tagline: 'חוף טרופי חלומי בשקיעה, עצי דקל ומי טורקיז צלולים ופסטורליים',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    id: '3d-animation',
    name: 'אנימציה תלת־ממדית',
    emoji: '🎬',
    tagline: 'דמויות תלת־ממד בסגנון סרטי אנימציה מודרניים עם תאורת אולפן',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
];
