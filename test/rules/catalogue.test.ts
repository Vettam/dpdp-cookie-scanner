import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadRules, readRulesVersion } from "../../src/rules/loader.js";

const rulesDir = join(process.cwd(), "rules");

describe("shipped rule catalogue", () => {
  it("loads every shipped rule without error", async () => {
    const rules = await loadRules(rulesDir);
    expect(rules.length).toBeGreaterThanOrEqual(9);
  });

  it("ships only settled-tier rules in v0.1", async () => {
    const rules = await loadRules(rulesDir);
    for (const r of rules) {
      expect(r.certainty).toBe("settled");
    }
  });

  it("every rule's explainer_url matches the confirmed pattern", async () => {
    const rules = await loadRules(rulesDir);
    for (const r of rules) {
      expect(r.explainer_url).toBe(`https://sentinel.vettam.ai/rules/${r.id}`);
    }
  });

  it("every rule has a non-empty changelog and a since version", async () => {
    const rules = await loadRules(rulesDir);
    for (const r of rules) {
      expect(r.changelog.length).toBeGreaterThan(0);
      expect(r.since.length).toBeGreaterThan(0);
    }
  });

  it("has a VERSION file", () => {
    expect(readRulesVersion(rulesDir)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("rule ids are unique", async () => {
    const rules = await loadRules(rulesDir);
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
