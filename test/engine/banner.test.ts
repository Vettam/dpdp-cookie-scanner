import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  BANNER_VOCAB,
  cmpSignaturesFromTrackers,
  consentButtonSelectors,
  interpretBanner,
  pickBannerButton,
  pickNoticeUrl,
  textLooksLikeBanner,
  type BannerRaw,
} from "../../src/engine/banner.js";
import { loadTrackers } from "../../src/trackers/loader.js";

function raw(over: Partial<BannerRaw> = {}): BannerRaw {
  return {
    text: "We use cookies. Accept all or reject.",
    btnText: "Accept all Reject",
    hasPreTicked: false,
    hasLangSwitcher: false,
    cmpId: null,
    ...over,
  };
}

describe("banner vocabulary", () => {
  it("includes English and Hindi consent terms (spec §4.3 / §14.3)", () => {
    expect(BANNER_VOCAB.some((w) => w === "cookie" || w === "consent")).toBe(true);
    expect(BANNER_VOCAB.some((w) => /[\u0900-\u097F]/.test(w))).toBe(true);
  });

  it("covers every Eighth Schedule script family, not only Hindi", () => {
    const joined = BANNER_VOCAB.join("\n");
    const scripts: Record<string, RegExp> = {
      bengali: /[\u0980-\u09FF]/,
      gurmukhi: /[\u0A00-\u0A7F]/,
      gujarati: /[\u0A80-\u0AFF]/,
      odia: /[\u0B00-\u0B7F]/,
      tamil: /[\u0B80-\u0BFF]/,
      telugu: /[\u0C00-\u0C7F]/,
      kannada: /[\u0C80-\u0CFF]/,
      malayalam: /[\u0D00-\u0D7F]/,
      arabic: /[\u0600-\u06FF]/,
      olChiki: /[\u1C50-\u1C7F]/,
      meitei: /[\uABC0-\uABFF]/,
    };
    for (const [name, re] of Object.entries(scripts)) {
      expect(re.test(joined), `missing ${name} consent vocabulary`).toBe(true);
    }
  });

  it("treats Tamil, Bengali and Urdu cookie copy as a banner", () => {
    expect(textLooksLikeBanner("இந்த தளம் குக்கீகளைப் பயன்படுத்துகிறது. ஒப்புதல்.")).toBe(true);
    expect(textLooksLikeBanner("আমরা কুকি ব্যবহার করি। সম্মতি দিন।")).toBe(true);
    expect(textLooksLikeBanner("ہم کوکیز استعمال کرتے ہیں۔ رضامندی۔")).toBe(true);
    expect(textLooksLikeBanner("Welcome to our shop")).toBe(false);
  });
});

describe("CMP signatures from trackers/ C10 (spec §4.3)", () => {
  it("loads OneTrust, Cookiebot, CookieYes, Osano and Quantcast from the dataset", async () => {
    const trackers = await loadTrackers(join(process.cwd(), "trackers"));
    const ids = cmpSignaturesFromTrackers(trackers).map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(["onetrust", "cookiebot", "cookieyes", "osano", "quantcast"]),
    );
  });

  it("uses CMP accept/reject selectors from the tracker records", async () => {
    const trackers = await loadTrackers(join(process.cwd(), "trackers"));
    const sigs = cmpSignaturesFromTrackers(trackers);
    expect(consentButtonSelectors("accept", sigs)).toEqual(
      expect.arrayContaining(["#onetrust-accept-btn-handler", ".osano-cm-accept-all", "#accept-all"]),
    );
    expect(consentButtonSelectors("reject", sigs)).toEqual(
      expect.arrayContaining(["#onetrust-reject-all-handler", ".osano-cm-denyAll", "#reject-all"]),
    );
  });
});

describe("interpretBanner", () => {
  it("classifies accept/reject/settings and implied consent from English copy", () => {
    const b = interpretBanner(
      raw({
        text: "By continuing to browse you agree. Legitimate interest applies.",
        btnText: "Accept Settings",
      }),
    );
    expect(b.detected).toBe(true);
    expect(b.has_accept).toBe(true);
    expect(b.has_reject).toBe(false);
    expect(b.has_settings).toBe(true);
    expect(b.implies_consent_by_browsing).toBe(true);
    expect(b.mentions_legitimate_interest).toBe(true);
    expect(b.detection_confidence).toBe("medium");
  });

  it("classifies Hindi accept/reject controls", () => {
    const b = interpretBanner(
      raw({
        text: "यह वेबसाइट कुकीज़ का उपयोग करती है।",
        btnText: "स्वीकार करें अस्वीकार करें",
      }),
    );
    expect(b.has_accept).toBe(true);
    expect(b.has_reject).toBe(true);
  });

  it("flags IAB TCF legitimate-interest phrasing beyond English and Hindi", () => {
    expect(
      interpretBanner(raw({ text: "Vendors rely on berechtigtes Interesse for some purposes." }))
        .mentions_legitimate_interest,
    ).toBe(true);
    expect(
      interpretBanner(raw({ text: "Certains fournisseurs invoquent un intérêt légitime." }))
        .mentions_legitimate_interest,
    ).toBe(true);
    expect(
      interpretBanner(raw({ text: "Tratamos datos por interés legítimo de los proveedores." }))
        .mentions_legitimate_interest,
    ).toBe(true);
  });

  it("treats Hindi cookie copy as banner vocabulary", () => {
    expect(textLooksLikeBanner("यह वेबसाइट कुकीज़ का उपयोग करती है।")).toBe(true);
    expect(textLooksLikeBanner("Welcome to our shop")).toBe(false);
  });

  it("raises detection_confidence to high when a known CMP signature matched", () => {
    const b = interpretBanner(raw({ cmpId: "cookieyes" }));
    expect(b.detection_confidence).toBe("high");
  });

  it("captures a privacy-notice URL from banner links", () => {
    const b = interpretBanner(
      raw({
        links: [
          { href: "https://staging.acme.in/about", text: "About" },
          { href: "https://staging.acme.in/privacy", text: "Privacy policy" },
        ],
      }),
    );
    expect(b.notice_url).toBe("https://staging.acme.in/privacy");
  });
});

describe("pickNoticeUrl", () => {
  it("prefers privacy / cookie notice links and skips unrelated hrefs", () => {
    expect(
      pickNoticeUrl([
        { href: "https://acme.in/pricing", text: "Pricing" },
        { href: "https://acme.in/cookie-policy", text: "Cookie policy" },
      ]),
    ).toBe("https://acme.in/cookie-policy");
    expect(pickNoticeUrl([{ href: "javascript:void(0)", text: "Privacy policy" }])).toBe("");
    expect(pickNoticeUrl([])).toBe("");
  });
});

describe("pickBannerButton", () => {
  it("prefers accept-all over a generic accept, and ignores settings", () => {
    const picked = pickBannerButton(
      [{ text: "Settings" }, { text: "Accept" }, { text: "Accept all" }],
      "accept",
    );
    expect(picked?.text).toBe("Accept all");
  });

  it("matches Hindi reject copy and does not pick subscribe", () => {
    const picked = pickBannerButton(
      [{ text: "Subscribe" }, { text: "अस्वीकार करें" }],
      "reject",
    );
    expect(picked?.text).toBe("अस्वीकार करें");
  });
});
