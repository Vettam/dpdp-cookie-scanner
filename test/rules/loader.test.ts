import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";
import { loadRules, readRulesVersion, RuleLoadError } from "../../src/rules/loader.js";

const validRule = (id: string) => ({
  id,
  title: "t",
  certainty: "settled",
  enforceable_from: "2027-05-13",
  observable: true,
  provisions: ["s.6(1)"],
  flags: ["PRE"],
  categories: ["C6"],
  owner: "engineering",
  penalty_band: "consent_notice",
  detection: { match: "request", where: { tracker_category: "C6", before_banner_detected: true } },
  needs_input: [],
  rationale_plain: "p",
  rationale_dev: "d",
  remediation_summary: "r",
  explainer_url: `https://sentinel.vettam.ai/rules/${id}`,
  since: "0.1.0",
  changelog: [{ version: "0.1.0", date: "2026-09-15", note: "Initial rule." }],
});

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "rules-"));
  mkdirSync(join(dir, "rules"), { recursive: true });
  return dir;
}

describe("loadRules", () => {
  it("loads and validates every YAML file in the rules directory", async () => {
    const dir = makeDir();
    writeFileSync(join(dir, "rules", "DPDP-C-001.yaml"), yaml(validRule("DPDP-C-001")));
    writeFileSync(join(dir, "rules", "DPDP-C-002.yaml"), yaml(validRule("DPDP-C-002")));
    const rules = await loadRules(join(dir, "rules"));
    expect(rules.map((r) => r.id).sort()).toEqual(["DPDP-C-001", "DPDP-C-002"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("throws RuleLoadError listing files that fail validation", async () => {
    const dir = makeDir();
    writeFileSync(join(dir, "rules", "DPDP-C-001.yaml"), yaml(validRule("DPDP-C-001")));
    const broken = validRule("DPDP-C-003");
    broken.provisions = [];
    writeFileSync(join(dir, "rules", "DPDP-C-003.yaml"), yaml(broken));
    await expect(loadRules(join(dir, "rules"))).rejects.toBeInstanceOf(RuleLoadError);
    try {
      await loadRules(join(dir, "rules"));
    } catch (e) {
      expect((e as RuleLoadError).failures.length).toBe(1);
      expect((e as RuleLoadError).failures[0].file).toBe("DPDP-C-003.yaml");
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("ignores non-YAML files", async () => {
    const dir = makeDir();
    writeFileSync(join(dir, "rules", "DPDP-C-001.yaml"), yaml(validRule("DPDP-C-001")));
    writeFileSync(join(dir, "rules", "README.md"), "# nope");
    writeFileSync(join(dir, "rules", "schema.json"), "{}");
    const rules = await loadRules(join(dir, "rules"));
    expect(rules).toHaveLength(1);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("readRulesVersion", () => {
  it("reads the VERSION file", () => {
    const dir = makeDir();
    writeFileSync(join(dir, "rules", "VERSION"), "0.1.0\n");
    expect(readRulesVersion(join(dir, "rules"))).toBe("0.1.0");
    rmSync(dir, { recursive: true, force: true });
  });
});

function yaml(obj: unknown): string {
  return yamlStringify(obj);
}
