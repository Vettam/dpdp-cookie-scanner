/**
 * Banner detection helpers (spec §4.3). Classification is pure so it can be
 * tested without a browser; Playwright only collects the raw DOM snapshot.
 */

export interface CmpSignature {
  id: string;
  selectors: string[];
}

export const CMP_SIGNATURES: CmpSignature[] = [
  { id: "onetrust", selectors: ["#onetrust-banner-sdk", "#onetrust-consent-sdk", ".ot-sdk-container"] },
  { id: "cookiebot", selectors: ["#CybotCookiebotDialog", "#CybotCookiebotDialogBody"] },
  { id: "cookieyes", selectors: [".cky-consent-container", "#cookie-law-info-bar", ".cky-consent-bar"] },
  { id: "osano", selectors: [".osano-cm-window", "#osano-cm-window"] },
  { id: "quantcast", selectors: ["#qc-cmp2-ui", ".qc-cmp-cleanslate"] },
];

/** English plus Hindi (Devanagari) consent vocabulary. */
export const BANNER_VOCAB = [
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
  "कुकी",
  "कुकीज़",
  "सहमति",
  "गोपनीयता",
  "स्वीकार",
  "अस्वीकार",
  "सहमत",
];

export interface BannerRaw {
  text: string;
  btnText: string;
  hasPreTicked: boolean;
  hasLangSwitcher: boolean;
  cmpId: string | null;
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
}

export function interpretBanner(raw: BannerRaw): BannerFields {
  const text = raw.text.toLowerCase();
  const btn = raw.btnText.toLowerCase();
  return {
    detected: true,
    has_accept: /\b(accept|agree|allow)\b/.test(btn) || /स्वीकार|सहमत|अनुमति/.test(raw.btnText),
    has_reject: /\b(reject|decline|deny|refuse)\b/.test(btn) || /अस्वीकार|इनकार/.test(raw.btnText),
    has_settings: /\b(settings|preferences|manage|customize)\b/.test(btn) || /सेटिंग|वरीयता/.test(raw.btnText),
    has_pre_ticked: raw.hasPreTicked,
    has_language_switcher: raw.hasLangSwitcher,
    mentions_legitimate_interest: /legitimate interest/.test(text) || /वैध हित/.test(raw.text),
    implies_consent_by_browsing:
      /by continuing|by browsing|by scrolling|closing this (banner|message|box)/.test(text) ||
      /ब्राउज़ करके|जारी रखकर/.test(raw.text),
    text_excerpt: raw.text.slice(0, 500),
    detection_confidence: raw.cmpId ? "high" : "medium",
  };
}

export function textLooksLikeBanner(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNER_VOCAB.some((w) => lower.includes(w.toLowerCase()) || text.includes(w));
}

/** CMP-specific accept controls, tried before free-text matching. */
export const ACCEPT_BUTTON_SELECTORS = [
  "#onetrust-accept-btn-handler",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
  "#CybotCookiebotDialogBodyButtonAccept",
  '[data-cky-tag="accept-button"]',
  ".cky-btn-accept",
  "#accept-all",
];

export const REJECT_BUTTON_SELECTORS = [
  "#onetrust-reject-all-handler",
  "#CybotCookiebotDialogBodyButtonDecline",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
  '[data-cky-tag="reject-button"]',
  ".cky-btn-reject",
  "#reject-all",
];

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
    { re: "\\b(accept|agree|allow)\\b|स्वीकार|सहमत", flags: "i", score: 1 },
  ],
  reject: [
    { re: "reject all|decline all|deny all|सभी अस्वीकार", flags: "i", score: 3 },
    { re: "^(reject|decline|deny|refuse|opt.?out|अस्वीकार करें|अस्वीकार)$", flags: "i", score: 2 },
    { re: "\\b(reject|decline|deny|refuse)\\b|अस्वीकार", flags: "i", score: 1 },
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
