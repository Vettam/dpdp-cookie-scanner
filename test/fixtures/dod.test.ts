import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "test", "fixtures", "dod.html"), "utf8");

describe("v0.1 definition-of-done fixture (spec §9)", () => {
  it("loads GTM, GA4, Meta Pixel, Hotjar and a CookieYes banner with no reject", () => {
    expect(html).toMatch(/googletagmanager\.com\/gtm\.js/);
    expect(html).toMatch(/gtag\/js\?id=G-/);
    expect(html).toMatch(/connect\.facebook\.net/);
    expect(html).toMatch(/static\.hotjar\.com/);
    expect(html).toMatch(/cdn-cookieyes\.com/);
    expect(html).toContain('id="cookie-law-info-bar"');
    expect(html).toContain("cky-consent-container");
    expect(html).toContain("cky-btn-accept");
    expect(html).toContain('data-cky-tag="accept-button"');
    expect(html).not.toMatch(/cky-btn-reject|data-cky-tag="reject-button"/);
    expect(html).not.toContain('id="cookie-banner"');
  });
});
