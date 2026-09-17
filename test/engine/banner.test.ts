import { describe, expect, it } from "vitest";
import {
  BANNER_VOCAB,
  CMP_SIGNATURES,
  interpretBanner,
  pickBannerButton,
  textLooksLikeBanner,
  type BannerRaw,
} from "../../src/engine/banner.js";

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

  it("ships CMP signatures for OneTrust, Cookiebot, CookieYes, Osano, Quantcast", () => {
    const ids = CMP_SIGNATURES.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["onetrust", "cookiebot", "cookieyes", "osano", "quantcast"]));
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

  it("treats Hindi cookie copy as banner vocabulary", () => {
    expect(textLooksLikeBanner("यह वेबसाइट कुकीज़ का उपयोग करती है।")).toBe(true);
    expect(textLooksLikeBanner("Welcome to our shop")).toBe(false);
  });

  it("raises detection_confidence to high when a known CMP signature matched", () => {
    const b = interpretBanner(raw({ cmpId: "cookieyes" }));
    expect(b.detection_confidence).toBe("high");
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
