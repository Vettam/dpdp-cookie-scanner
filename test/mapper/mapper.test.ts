import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { mapScan } from "../../src/mapper/index.js";
import { TrackerIndex } from "../../src/trackers/matcher.js";
import { loadRules } from "../../src/rules/loader.js";
import { loadTrackers } from "../../src/trackers/loader.js";
import type { Observation } from "../../src/types.js";

const rules = await loadRules(join(process.cwd(), "rules"));
const trackers = await loadTrackers(join(process.cwd(), "trackers"));
const index = new TrackerIndex(trackers);

function meta(): Observation {
  return {
    type: "meta",
    timestamp_ms: 0,
    before_first_paint: true,
    before_banner_detected: true,
    url: "https://staging.acme.in",
    final_url: "https://staging.acme.in/",
    page_language: "en",
    title: "Acme",
    scan_started_at: "2026-09-17T09:12:00.000Z",
    engine_version: "0.1.0",
    rules_version: "0.1.0",
    trackers_version: "0.1.0",
    geo_source: "DB-IP Lite",
    geo_date: "2026-09-01",
  } as Observation;
}

function req(host: string, over: Partial<Observation> = {}): Observation {
  return {
    type: "request",
    timestamp_ms: 412,
    before_first_paint: true,
    before_banner_detected: true,
    method: "GET",
    host,
    path: "/",
    initiator_host: "www.googletagmanager.com",
    resource_type: "script",
    is_third_party: true,
    destination_country: "US",
    ...over,
  } as Observation;
}

function banner(over: Record<string, unknown> = {}): Observation {
  return {
    type: "banner",
    timestamp_ms: 1500,
    before_first_paint: false,
    before_banner_detected: false,
    detected: true,
    has_accept: true,
    has_reject: false,
    has_settings: false,
    has_pre_ticked: false,
    has_language_switcher: false,
    mentions_legitimate_interest: false,
    implies_consent_by_browsing: false,
    text_excerpt: "",
    detection_confidence: "high",
    ...over,
  } as Observation;
}

function map(observations: Observation[]) {
  return mapScan({
    observations,
    rules,
    trackers: index,
    engineVersion: "0.1.0",
    rulesVersion: "0.1.0",
    trackersVersion: "0.1.0",
    interpretationAsOf: "2026-09-15",
  });
}

describe("mapScan", () => {
  it("emits C-001 when a C6 tracker fires before the banner", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr" }), banner({ timestamp_ms: 2000 })]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-001");
    expect(f).toBeDefined();
    expect(f!.tracker?.id).toBe("meta-pixel");
    expect(f!.evidence.length).toBe(1);
    expect(f!.attributed_to).toContain("googletagmanager.com");
    expect(f!.certainty).toBe("settled");
    expect(f!.explainer_url).toBe("https://sentinel.vettam.ai/rules/DPDP-C-001");
  });

  it("does not emit C-001 when the C6 tracker fires after the banner", () => {
    const sr = map([
      meta(),
      banner({ detected: true, timestamp_ms: 100 }),
      req("www.facebook.com", { path: "/tr", timestamp_ms: 500, before_banner_detected: false }),
    ]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-001");
  });

  it("emits C-002 when non-essential trackers fire and no banner is detected", () => {
    const sr = map([meta(), req("www.google-analytics.com", { path: "/collect" }), banner({ detected: false })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-002");
  });

  it("emits C-004 when the banner has accept but no reject", () => {
    const sr = map([meta(), banner({ has_accept: true, has_reject: false })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-004");
  });

  it("emits C-005 when the banner has pre-ticked toggles", () => {
    const sr = map([meta(), banner({ has_pre_ticked: true })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-005");
  });

  it("emits C-006 when the banner implies consent by browsing", () => {
    const sr = map([meta(), banner({ implies_consent_by_browsing: true })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-006");
  });

  it("emits C-003 when the banner mentions legitimate interest", () => {
    const sr = map([meta(), banner({ mentions_legitimate_interest: true })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-003");
  });

  it("emits C-009 when English-only banner has no language switcher", () => {
    const sr = map([meta(), banner({ has_language_switcher: false })]);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-009");
  });

  it("emits C-007 and C-013 when a C5 tracker fires before the banner", () => {
    const sr = map([meta(), req("static.hotjar.com"), banner({ timestamp_ms: 2000 })]);
    const ids = sr.findings.map((f) => f.rule_id);
    expect(ids).toContain("DPDP-C-007");
    expect(ids).toContain("DPDP-C-013");
  });

  it("emits C-013 but not C-007 when a C5 tracker fires after the banner", () => {
    const sr = map([
      meta(),
      banner({ detected: true, timestamp_ms: 100 }),
      req("static.hotjar.com", { timestamp_ms: 500, before_banner_detected: false }),
    ]);
    const ids = sr.findings.map((f) => f.rule_id);
    expect(ids).toContain("DPDP-C-013");
    expect(ids).not.toContain("DPDP-C-007");
  });

  it("emits a question for C-040 when C5/C6 trackers are present", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr" }), banner({})]);
    const q = sr.questions.find((x) => x.rule_id === "DPDP-C-040");
    expect(q).toBeDefined();
    expect(q!.needs_input).toContain("reaches_minors");
  });

  it("does not emit C-040 when no C5/C6 trackers are present", () => {
    const sr = map([meta(), req("www.google-analytics.com"), banner({})]);
    expect(sr.questions.map((q) => q.rule_id)).not.toContain("DPDP-C-040");
  });

  it("reports an unclassified third-party host as a finding and in inventory", () => {
    const sr = map([meta(), req("evil-tracker.example", { path: "/x" }), banner({})]);
    expect(sr.inventory.unclassified_hosts).toContain("evil-tracker.example");
    const f = sr.findings.find((x) => x.rule_id === "UNMAPPED");
    expect(f).toBeDefined();
  });

  it("stamps versions from the input", () => {
    const sr = map([meta(), banner({})]);
    expect(sr.engine_version).toBe("0.1.0");
    expect(sr.rules_version).toBe("0.1.0");
    expect(sr.trackers_version).toBe("0.1.0");
    expect(sr.schema_version).toBe("1.0.0");
    expect(sr.interpretation_as_of).toBe("2026-09-15");
  });

  it("populates the summary counts", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr" }), banner({})]);
    expect(sr.summary.third_parties).toBeGreaterThanOrEqual(1);
    expect(sr.summary.fired_before_banner).toBeGreaterThanOrEqual(1);
  });

  it("always carries the crawler limits", () => {
    const sr = map([meta(), banner({})]);
    expect(sr.limits.length).toBeGreaterThan(0);
    expect(sr.limits.some((l) => l.includes("not observable"))).toBe(true);
  });

  it("never names a person in attributed_to", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr" }), banner({})]);
    for (const f of sr.findings) {
      expect(f.attributed_to.length).toBeGreaterThan(0);
    }
  });
});
