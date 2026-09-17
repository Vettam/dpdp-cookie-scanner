import { describe, expect, it } from "vitest";
import { redactBannerText } from "../../src/engine/redact.js";

describe("redactBannerText", () => {
  it("masks email-like, phone-like, and long-numeric tokens", () => {
    const raw =
      "Contact privacy@acme.in or +91 98765 43210. Ref 123456789012.";
    const out = redactBannerText(raw);
    expect(out).not.toMatch(/privacy@acme\.in/);
    expect(out).not.toMatch(/98765/);
    expect(out).not.toMatch(/123456789012/);
    expect(out).toContain("[redacted]");
    expect(out).toContain("Contact");
  });

  it("leaves ordinary banner copy intact", () => {
    expect(redactBannerText("We use cookies. Accept or Reject.")).toBe(
      "We use cookies. Accept or Reject.",
    );
  });
});
