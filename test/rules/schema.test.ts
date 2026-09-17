import { describe, expect, it } from "vitest";
import { RuleSchema, validateRule } from "../../src/rules/schema.js";

const validRule = {
  id: "DPDP-C-001",
  title: "Advertising tracker fires before any consent interaction",
  certainty: "settled",
  enforceable_from: "2027-05-13",
  observable: true,
  provisions: ["s.4(1)", "s.5(1)", "s.6(1)"],
  flags: ["PRE", "3PF"],
  categories: ["C6"],
  owner: "engineering",
  penalty_band: "consent_notice",
  detection: {
    match: "request",
    where: { tracker_category: "C6", before_banner_detected: true },
  },
  needs_input: [],
  rationale_plain: "Plain explanation.",
  rationale_dev: "Dev explanation.",
  remediation_summary: "Gate the tag behind consent.",
  explainer_url: "https://sentinel.vettam.ai/rules/DPDP-C-001",
  since: "0.1.0",
  changelog: [{ version: "0.1.0", date: "2026-09-15", note: "Initial rule." }],
};

describe("RuleSchema", () => {
  it("accepts a well-formed settled rule", () => {
    const result = RuleSchema.safeParse(validRule);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown certainty tier", () => {
    const r = validateRule({ ...validRule, certainty: "definitely" });
    expect(r.ok).toBe(false);
  });

  it("rejects an id that is not DPDP-C-NNN", () => {
    const r = validateRule({ ...validRule, id: "DPDP-001" });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty provisions array (cite or don't claim)", () => {
    const r = validateRule({ ...validRule, provisions: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects missing rationale_plain", () => {
    const { rationale_plain: _omit, ...rest } = validRule;
    const r = validateRule(rest);
    expect(r.ok).toBe(false);
  });

  it("rejects missing explainer_url", () => {
    const { explainer_url: _omit, ...rest } = validRule;
    const r = validateRule(rest);
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown overlay flag", () => {
    const r = validateRule({ ...validRule, flags: ["PRE", "MADEUP"] });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown tracker category", () => {
    const r = validateRule({ ...validRule, categories: ["C99"] });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown owner", () => {
    const r = validateRule({ ...validRule, owner: "legal" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown detection match type", () => {
    const r = validateRule({
      ...validRule,
      detection: { match: "websocket", where: {} },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown condition key in where", () => {
    const r = validateRule({
      ...validRule,
      detection: { match: "request", where: { frobnicate: true } },
    });
    expect(r.ok).toBe(false);
  });

  it("accepts a banner-matched rule with banner conditions", () => {
    const r = validateRule({
      ...validRule,
      id: "DPDP-C-004",
      detection: {
        match: "banner",
        where: { has_accept: true, has_reject: false },
      },
    });
    expect(r.ok).toBe(true);
  });

  it("validateRule returns the parsed rule on success", () => {
    const r = validateRule(validRule);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe("DPDP-C-001");
  });
});
