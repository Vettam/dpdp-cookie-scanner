/**
 * Banner detection helpers (spec §4.3). Classification is pure so it can be
 * tested without a browser; Playwright only collects the raw DOM snapshot.
 * CMP CSS signatures live on C10 tracker records, not in this file.
 */

export interface CmpSignature {
  id: string;
  selectors: string[];
  accept_selectors: string[];
  reject_selectors: string[];
}

export function cmpSignaturesFromTrackers(
  trackers: Array<{
    id: string;
    category: string;
    cmp?: {
      selectors?: string[];
      accept_selectors?: string[];
      reject_selectors?: string[];
    } | undefined;
  }>,
): CmpSignature[] {
  const out: CmpSignature[] = [];
  for (const t of trackers) {
    if (t.category !== "C10") continue;
    const selectors = t.cmp?.selectors ?? [];
    if (selectors.length === 0) continue;
    out.push({
      id: t.id,
      selectors,
      accept_selectors: t.cmp?.accept_selectors ?? [],
      reject_selectors: t.cmp?.reject_selectors ?? [],
    });
  }
  return out;
}

/**
 * Consent vocabulary in English plus every Eighth Schedule language (spec §4.3).
 * Detection is substring match on banner text; terms are the words sites
 * actually put on consent UI, including English loanwords in native script.
 */
export const BANNER_VOCAB = [
  // English
  "cookie",
  "cookies",
  "consent",
  "privacy",
  "preferences",
  "accept",
  "reject",
  "agree",
  "i agree",
  "by continuing",
  "by browsing",
  "legitimate interest",
  // Hindi, Bodo, Dogri, Konkani, Maithili, Marathi, Nepali, Sanskrit, Sindhi (Devanagari)
  "कुकी",
  "कुकीज़",
  "कुकीज",
  "सहमति",
  "सहमती",
  "संमती",
  "सम्मतिः",
  "गोपनीयता",
  "स्वीकार",
  "स्वीकारा",
  "अस्वीकार",
  "नाकारा",
  "सहमत",
  "वैध हित",
  // Assamese / Bengali
  "কুকি",
  "কুকিজ",
  "সম্মতি",
  "গোপনীয়তা",
  "গ্রহণ",
  "প্রত্যাখ্যান",
  "স্বীকার",
  // Gujarati
  "કુકી",
  "સંમતિ",
  "ગોપનીયતા",
  "સ્વીકાર",
  "નામંજૂર",
  // Kannada
  "ಕುಕೀ",
  "ಸಮ್ಮತಿ",
  "ಗೌಪ್ಯತೆ",
  "ಒಪ್ಪಿಕೊಳ್ಳಿ",
  "ನಿರಾಕರಿಸಿ",
  // Malayalam
  "കുക്കി",
  "സമ്മതം",
  "സ്വകാര്യത",
  "സ്വീകരിക്കുക",
  "നിരസിക്കുക",
  // Manipuri (Meitei Mayek)
  "ꯀꯨꯀꯤ",
  "ꯑꯌꯥꯕ",
  // Odia
  "କୁକି",
  "ସମ୍ମତି",
  "ଗୋପନୀୟତା",
  "ସ୍ୱୀକାର",
  "ପ୍ରତ୍ୟାଖ୍ୟାନ",
  // Punjabi (Gurmukhi)
  "ਕੁਕੀ",
  "ਸਹਿਮਤੀ",
  "ਗੋਪਨੀਯਤਾ",
  "ਸਵੀਕਾਰ",
  "ਅਸਵੀਕਾਰ",
  // Santali (Ol Chiki)
  "ᱠᱩᱠᱤ",
  "ᱥᱟᱹᱨᱤ",
  // Tamil
  "குக்கி",
  "குக்கீ",
  "குக்கீகள்",
  "ஒப்புதல்",
  "தனியுரிமை",
  "ஏற்கவும்",
  "நிராகரிக்கவும்",
  // Telugu
  "కుకీ",
  "కుకీలు",
  "సమ్మతి",
  "గోప్యత",
  "అంగీకరించు",
  "తిరస్కరించు",
  // Urdu / Kashmiri / Sindhi (Perso-Arabic)
  "کوکی",
  "کوکیز",
  "رضامندی",
  "رازداری",
  "قبول",
  "مسترد",
  "ڪوڪي",
];

/** Button / control labels that indicate a language switcher (spec §4.3). */
export const LANG_SWITCHER_TERMS = [
  "language",
  "english",
  "भाषा",
  "हिंदी",
  "हिन्दी",
  "assamese",
  "bengali",
  "bodo",
  "dogri",
  "gujarati",
  "hindi",
  "kannada",
  "kashmiri",
  "konkani",
  "maithili",
  "malayalam",
  "manipuri",
  "marathi",
  "nepali",
  "odia",
  "oriya",
  "punjabi",
  "sanskrit",
  "santali",
  "sindhi",
  "tamil",
  "telugu",
  "urdu",
  "বাংলা",
  "অসমীয়া",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "ગુજરાતી",
  "ਪੰਜਾਬੀ",
  "मराठी",
  "ଓଡ଼ିଆ",
  "اردو",
  "संस्कृत",
];

/** IAB TCF "legitimate interest" phrasing (spec §4.3). */
const LEGITIMATE_INTEREST_PHRASES = [
  "legitimate interest",
  "legitimate interests",
  "berechtigtes interesse",
  "berechtigte interessen",
  "intérêt légitime",
  "intérêts légitimes",
  "interés legítimo",
  "intereses legítimos",
  "interesse legittimo",
  "interessi legittimi",
  "interesse legítimo",
  "interesses legítimos",
  "gerechtvaardigd belang",
  "gerechtvaardigde belangen",
  "prawnie uzasadniony interes",
  "berättigat intresse",
  "legitim interesse",
  "वैध हित",
];

export interface BannerRaw {
  text: string;
  btnText: string;
  hasPreTicked: boolean;
  hasLangSwitcher: boolean;
  cmpId: string | null;
  links?: Array<{ href: string; text: string }>;
}

export interface BannerFields {
  detected: true;
  has_accept: boolean;
  has_reject: boolean;
  has_settings: boolean;
  has_pre_ticked: boolean;
  has_language_switcher: boolean;
  mentions_legitimate_interest: boolean;
  implies_consent_by_browsing: boolean;
  text_excerpt: string;
  detection_confidence: "high" | "medium" | "low";
  notice_url: string;
}

const ACCEPT_NATIVE =
  /स्वीकार|सहमत|अनुमति|ग्रহণ|স্বীকার|સ્વીકાર|ಒಪ್ಪಿಕೊಳ್ಳಿ|സ്വീകരിക്കുക|ସ୍ୱୀକାର|ਸਵੀਕਾਰ|ஏற்கவும்|ஒப்புதல்|అంగీకరించు|قبول|ꯑꯌꯥꯕ/;
const REJECT_NATIVE =
  /अस्वीकार|इनकार|नाकारा|প্রত্যাখ্যান|નામંજૂર|ನಿರಾಕರಿಸಿ|നിരസിക്കുക|ପ୍ରତ୍ୟାଖ୍ୟାନ|ਅਸਵੀਕਾਰ|நிராகரிக்கவும்|తిరస్కరించు|مسترد/;
const SETTINGS_NATIVE = /सेटिंग|वरीयता|அமைப்பு|సెట్టింగ్|സജ്ജീകരണം/;

export function interpretBanner(raw: BannerRaw): BannerFields {
  const text = raw.text.toLowerCase();
  const btn = raw.btnText.toLowerCase();
  return {
    detected: true,
    has_accept: /\b(accept|agree|allow)\b/.test(btn) || ACCEPT_NATIVE.test(raw.btnText),
    has_reject: /\b(reject|decline|deny|refuse)\b/.test(btn) || REJECT_NATIVE.test(raw.btnText),
    has_settings: /\b(settings|preferences|manage|customize)\b/.test(btn) || SETTINGS_NATIVE.test(raw.btnText),
    has_pre_ticked: raw.hasPreTicked,
    has_language_switcher: raw.hasLangSwitcher,
    mentions_legitimate_interest: mentionsLegitimateInterest(raw.text),
    implies_consent_by_browsing:
      /by continuing|by browsing|by scrolling|closing this (banner|message|box)/.test(text) ||
      /ब्राउज़ करके|जारी रखकर/.test(raw.text),
    text_excerpt: raw.text.slice(0, 500),
    detection_confidence: raw.cmpId ? "high" : "medium",
    notice_url: pickNoticeUrl(raw.links ?? []),
  };
}

export function mentionsLegitimateInterest(text: string): boolean {
  const lower = text.toLowerCase();
  return LEGITIMATE_INTEREST_PHRASES.some((p) => lower.includes(p.toLowerCase()) || text.includes(p));
}

export function textLooksLikeBanner(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNER_VOCAB.some((w) => lower.includes(w.toLowerCase()) || text.includes(w));
}

const NOTICE_LINK =
  /privacy(\s|-)?(policy|notice)?|cookie(\s|-)?(policy|notice)|गोपनीयता|কুকি\s*নীতি|குக்கி\s*கொள்கை|కుకీ\s*విధానం|कुकी\s*नीति|सूचना/i;

/** First banner link that looks like a privacy/cookie notice. Empty if none. */
export function pickNoticeUrl(links: Array<{ href: string; text: string }>): string {
  for (const link of links) {
    const href = link.href.trim();
    if (!href || /^(javascript:|mailto:|#)/i.test(href)) continue;
    if (NOTICE_LINK.test(link.text) || NOTICE_LINK.test(href)) return href;
  }
  return "";
}

/** Generic accept/reject fallbacks; CMP-specific selectors come from tracker YAML. */
export const ACCEPT_BUTTON_SELECTORS = ["#accept-all"];
export const REJECT_BUTTON_SELECTORS = ["#reject-all"];

export function consentButtonSelectors(
  intent: "accept" | "reject",
  signatures: CmpSignature[],
): string[] {
  const fromCmp = signatures.flatMap((s) =>
    intent === "accept" ? s.accept_selectors : s.reject_selectors,
  );
  const fallback = intent === "accept" ? ACCEPT_BUTTON_SELECTORS : REJECT_BUTTON_SELECTORS;
  return [...fromCmp, ...fallback];
}

export interface ButtonScorePattern {
  re: string;
  flags: string;
  score: number;
}

/** Higher score wins. Settings/subscribe copy is never a match. */
export const BUTTON_SCORE_PATTERNS: Record<"accept" | "reject", ButtonScorePattern[]> = {
  accept: [
    { re: "accept all|allow all|agree to all|सभी स्वीकार", flags: "i", score: 3 },
    { re: "^(accept|agree|allow|i agree|accept cookies|स्वीकार करें|स्वीकार|सहमत)$", flags: "i", score: 2 },
    { re: "\\b(accept|agree|allow)\\b|स्वीकार|सहमत|ஏற்கவும்|అంగీకరించు|গ্রহণ|સ્વીಕાર|قبول", flags: "i", score: 1 },
  ],
  reject: [
    { re: "reject all|decline all|deny all|सभी अस्वीकार", flags: "i", score: 3 },
    { re: "^(reject|decline|deny|refuse|opt.?out|अस्वीकार करें|अस्वीकार)$", flags: "i", score: 2 },
    { re: "\\b(reject|decline|deny|refuse)\\b|अस्वीकार|நிராகரிக்கவும்|తిరస్కరించు|প্রত্যাখ্যান|مسترد", flags: "i", score: 1 },
  ],
};

export function scoreButtonText(text: string, intent: "accept" | "reject"): number {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return 0;
  if (/\b(settings|preferences|manage|customize|subscribe|सेटिंग|वरीयता)\b/i.test(t)) return 0;
  let best = 0;
  for (const p of BUTTON_SCORE_PATTERNS[intent]) {
    if (new RegExp(p.re, p.flags).test(t)) best = Math.max(best, p.score);
  }
  return best;
}

export function pickBannerButton(
  buttons: Array<{ text: string }>,
  intent: "accept" | "reject",
): { text: string; score: number; index: number } | null {
  let best: { text: string; score: number; index: number } | null = null;
  for (let i = 0; i < buttons.length; i++) {
    const text = buttons[i]!.text;
    const score = scoreButtonText(text, intent);
    if (score > 0 && (!best || score > best.score)) best = { text, score, index: i };
  }
  return best;
}
