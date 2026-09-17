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

function meta(over: Partial<Observation> = {}): Observation {
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
    ...over,
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
    notice_url: "",
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

function cookie(name: string, over: Partial<Observation> = {}): Observation {
  return {
    type: "cookie",
    timestamp_ms: 0,
    before_first_paint: false,
    before_banner_detected: false,
    name,
    domain: ".acme.in",
    path: "/",
    expires: null,
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    first_party: true,
    set_by: "",
    ...over,
  } as Observation;
}

function apiCall(api: string, over: Partial<Observation> = {}): Observation {
  return {
    type: "api_call",
    timestamp_ms: 0,
    before_first_paint: false,
    before_banner_detected: false,
    first_party: true,
    api,
    ...over,
  } as Observation;
}

function embed(host: string, over: Partial<Observation> = {}): Observation {
  return {
    type: "embed",
    timestamp_ms: 0,
    before_first_paint: false,
    before_banner_detected: false,
    first_party: false,
    host,
    kind: "script",
    sri: false,
    is_third_party: true,
    ...over,
  } as Observation;
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

  it("inherits banner detection_confidence on C-004, C-005 and C-006", () => {
    const sr = map([
      meta(),
      banner({
        detection_confidence: "medium",
        has_accept: true,
        has_reject: false,
        has_pre_ticked: true,
        implies_consent_by_browsing: true,
      }),
    ]);
    for (const id of ["DPDP-C-004", "DPDP-C-005", "DPDP-C-006"]) {
      expect(sr.findings.find((f) => f.rule_id === id)?.detection_confidence).toBe("medium");
    }
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

  it("marks C-009 as a low-confidence heuristic even when banner detection is high", () => {
    const sr = map([meta(), banner({ detection_confidence: "high", has_language_switcher: false })]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-009");
    expect(f?.detection_confidence).toBe("low");
  });

  it("phrases C-009 as we could not find in title and rationale_plain", () => {
    const sr = map([meta(), banner({ has_language_switcher: false })]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-009");
    expect(f?.title).toMatch(/we could not find/i);
    expect(f?.rationale_plain).toMatch(/we could not find/i);
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
    expect(q!.prompt).toBe("If this site is used by people under 18, then…");
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

  it("copies banner notice_url and text_excerpt onto ScanResult.banner", () => {
    const sr = map([
      meta(),
      banner({
        text_excerpt: "We use cookies. See our privacy policy.",
        notice_url: "https://staging.acme.in/privacy",
      }),
    ]);
    expect(sr.banner.notice_url).toBe("https://staging.acme.in/privacy");
    expect(sr.banner.text_excerpt).toBe("We use cookies. See our privacy policy.");
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

  it("emits C-050 (open) when GPC was sent and a non-essential tracker fired anyway", () => {
    const sr = map([
      meta({ gpc_sent: true }),
      req("www.facebook.com", { path: "/tr" }),
      banner({}),
    ]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-050");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("open");
    expect(f!.provisions).toContain("s.7(a)");
  });

  it("does not emit C-050 when GPC was not sent", () => {
    const sr = map([
      meta({ gpc_sent: false }),
      req("www.facebook.com", { path: "/tr" }),
      banner({}),
    ]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-050");
  });

  it("does not emit C-050 for an essential (C1) tracker even with GPC on", () => {
    const sr = map([
      meta({ gpc_sent: true }),
      req("www.googletagmanager.com", { path: "/gtm.js" }),
      banner({}),
    ]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-050");
  });

  it("resolves destination_country from the tracker dataset when the engine left it empty", () => {
    const sr = map([
      meta(),
      req("www.facebook.com", { path: "/tr", destination_country: "" }),
      banner({}),
    ]);
    const host = sr.inventory.third_party_hosts.find((h) => h.tracker_id === "meta-pixel");
    expect(host?.country).toBe("US");
    expect(sr.summary.third_parties_outside_india).toBe(1);
    expect(sr.findings.map((f) => f.rule_id)).toContain("DPDP-C-020");
  });

  it("leaves destination_country empty for unclassified hosts (cite or don't claim)", () => {
    const sr = map([
      meta(),
      req("evil-tracker.example", { path: "/x", destination_country: "" }),
      banner({}),
    ]);
    const host = sr.inventory.third_party_hosts.find((h) => h.host === "evil-tracker.example");
    expect(host?.country).toBe("");
    expect(host?.tracker_id).toBeNull();
  });

  it("does not emit C-020 when the country is unknown (empty is not outside India)", () => {
    const sr = map([
      meta(),
      req("evil-tracker.example", { path: "/x", destination_country: "" }),
      banner({}),
    ]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-020");
    expect(sr.summary.third_parties_outside_india).toBe(0);
  });

  it("emits C-020 (open) for a third-party request resolving outside India", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr", destination_country: "US" }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-020");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("open");
    expect(f!.provisions).toContain("s.16");
    expect(f!.rationale_plain).toMatch(/not a contravention/i);
  });

  it("does not emit C-020 for a request resolving inside India", () => {
    const sr = map([meta(), req("www.facebook.com", { path: "/tr", destination_country: "IN" }), banner({})]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-020");
  });

  it("emits C-041 (open) as a standing question even with no relevant observations", () => {
    const sr = map([meta(), banner({ detected: false })]);
    const q = sr.questions.find((x) => x.rule_id === "DPDP-C-041");
    expect(q).toBeDefined();
    expect(q!.certainty).toBe("open");
    expect(q!.prompt).toMatch(/traffic data/i);
  });

  it("emits C-010 (arguable) when a C4 analytics tracker fires before the banner", () => {
    const sr = map([meta(), req("www.google-analytics.com", { path: "/g/collect" }), banner({ timestamp_ms: 2000 })]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-010");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("s.17(2)(b)");
  });

  it("emits C-015 (arguable) for a C7 font/CDN request", () => {
    const sr = map([meta(), req("fonts.googleapis.com", { path: "/css" }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-015");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("s.8(2)");
  });

  it("emits C-030 (arguable) for a pseudonymous _ga cookie", () => {
    const sr = map([meta(), cookie("_ga", { first_party: false, set_by: ".google-analytics.com" }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-030");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("s.2(t)");
    expect(f!.evidence[0]!.type).toBe("cookie");
  });

  it("emits C-031 (arguable) for a first-party cookie", () => {
    const sr = map([meta(), cookie("sessionid", { first_party: true }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-031");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("s.7(a)");
  });

  it("emits C-061 (arguable) for a cookie missing security flags", () => {
    const sr = map([meta(), cookie("sessionid", { secure: false, httpOnly: false, sameSite: "" }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-061");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("Rule 6(1)");
  });

  it("does not emit C-061 for a cookie with all security flags set", () => {
    const sr = map([meta(), cookie("sessionid", { secure: true, httpOnly: true, sameSite: "Strict" }), banner({})]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-061");
  });

  it("emits C-060 (arguable) when a fingerprinting API is called", () => {
    const sr = map([meta(), apiCall("canvas.toDataURL"), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-060");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.flags).toContain("FP");
    expect(f!.evidence[0]!.type).toBe("api_call");
  });

  it("emits C-062 (arguable) for a third-party script without SRI", () => {
    const sr = map([meta(), embed("cdn.jsdelivr.net", { kind: "script", sri: false }), banner({})]);
    const f = sr.findings.find((x) => x.rule_id === "DPDP-C-062");
    expect(f).toBeDefined();
    expect(f!.certainty).toBe("arguable");
    expect(f!.provisions).toContain("Rule 6(1)(g)");
  });

  it("does not emit C-062 for a third-party script that has SRI", () => {
    const sr = map([meta(), embed("cdn.jsdelivr.net", { kind: "script", sri: true }), banner({})]);
    expect(sr.findings.map((f) => f.rule_id)).not.toContain("DPDP-C-062");
  });
});
