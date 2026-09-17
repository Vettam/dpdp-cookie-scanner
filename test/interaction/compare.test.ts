import { describe, expect, it } from "vitest";
import { attachInteraction, comparePasses } from "../../src/interaction/compare.js";
import type { Finding, ScanResult } from "../../src/types.js";

function finding(over: Partial<Finding> & Pick<Finding, "rule_id" | "id">): Finding {
  return {
    title: over.title ?? over.rule_id,
    certainty: "settled",
    enforceable_from: "2027-05-13",
    observable: true,
    detection_confidence: "high",
    provisions: ["s.6(1)"],
    flags: ["PRE"],
    owner: "engineering",
    tracker: { id: "meta-pixel", vendor: "Meta Platforms", category: "C6" },
    attributed_to: "www.facebook.com",
    evidence: [
      {
        type: "request",
        timestamp_ms: 412,
        before_first_paint: true,
        before_banner_detected: true,
        method: "GET",
        host: "www.facebook.com",
        path: "/tr",
        initiator_host: "",
        resource_type: "image",
        is_third_party: true,
        destination_country: "US",
      },
    ],
    rationale_plain: "p",
    rationale_dev: "d",
    remediation_summary: "r",
    explainer_url: "https://sentinel.vettam.ai/rules/DPDP-C-001",
    needs_input: [],
    ...over,
  };
}

function sr(findings: Finding[], over: Partial<ScanResult> = {}): ScanResult {
  return {
    schema_version: "1.0.0",
    engine_version: "1.0.0",
    rules_version: "0.3.1",
    trackers_version: "0.2.0",
    interpretation_as_of: "2026-09-15",
    scanned_at: "2026-09-17T09:12:00.000Z",
    target: { url: "https://staging.acme.in", final_url: "https://staging.acme.in/", page_language: "en" },
    banner: { detected: true, confidence: "high", has_accept: true, has_reject: true },
    inventory: {
      cookies: [],
      storage: [],
      third_party_hosts: [],
      fingerprinting_apis: [],
      unclassified_hosts: [],
    },
    findings,
    questions: [],
    summary: {
      by_certainty: { settled: findings.length, arguable: 0, open: 0 },
      third_parties: 0,
      third_parties_outside_india: 0,
      fired_before_banner: 0,
    },
    limits: [
      "Consent-banner interaction was not performed; findings reflect the page state before any user action.",
    ],
    interaction: {
      performed: false,
      accept_findings: 0,
      reject_findings: 0,
      survived_reject: [],
      cleared_on_reject: [],
      appeared_on_accept: [],
    },
    ...over,
  };
}

const meta = finding({ id: "f_meta", rule_id: "DPDP-C-001" });
const hotjar = finding({
  id: "f_hotjar",
  rule_id: "DPDP-C-001",
  tracker: { id: "hotjar", vendor: "Hotjar", category: "C5" },
  attributed_to: "static.hotjar.com",
  evidence: [
    {
      type: "request",
      timestamp_ms: 500,
      before_first_paint: true,
      before_banner_detected: true,
      method: "GET",
      host: "static.hotjar.com",
      path: "/c/hotjar.js",
      initiator_host: "",
      resource_type: "script",
      is_third_party: true,
      destination_country: "US",
    },
  ],
});
const gaAfterAccept = finding({
  id: "f_ga",
  rule_id: "DPDP-C-010",
  certainty: "arguable",
  tracker: { id: "ga4", vendor: "Google", category: "C5" },
  attributed_to: "www.google-analytics.com",
  evidence: [
    {
      type: "request",
      timestamp_ms: 4000,
      before_first_paint: false,
      before_banner_detected: false,
      method: "GET",
      host: "www.google-analytics.com",
      path: "/g/collect",
      initiator_host: "",
      resource_type: "xhr",
      is_third_party: true,
      destination_country: "US",
    },
  ],
});

describe("comparePasses", () => {
  it("treats a load finding still present after reject-all as survived_reject", () => {
    const cmp = comparePasses(sr([meta, hotjar]), sr([meta, hotjar]), sr([meta]));
    expect(cmp.performed).toBe(true);
    expect(cmp.survived_reject.map((f) => f.tracker_id)).toEqual(["meta-pixel"]);
    expect(cmp.cleared_on_reject.map((f) => f.tracker_id)).toEqual(["hotjar"]);
  });

  it("records findings that appear only after accept-all", () => {
    const cmp = comparePasses(sr([meta]), sr([meta, gaAfterAccept]), sr([meta]));
    expect(cmp.appeared_on_accept.map((f) => f.tracker_id)).toEqual(["ga4"]);
    expect(cmp.accept_findings).toBe(2);
    expect(cmp.reject_findings).toBe(1);
  });

  it("identifies findings by rule_id + tracker, not by finding id", () => {
    const loadMeta = finding({ id: "a", rule_id: "DPDP-C-001" });
    const rejectMeta = finding({ id: "b", rule_id: "DPDP-C-001" });
    const cmp = comparePasses(sr([loadMeta]), sr([]), sr([rejectMeta]));
    expect(cmp.survived_reject).toHaveLength(1);
    expect(cmp.cleared_on_reject).toHaveLength(0);
  });
});

describe("attachInteraction", () => {
  it("keeps load-pass findings and rewrites the interaction limit", () => {
    const load = sr([meta]);
    const out = attachInteraction(load, sr([meta, gaAfterAccept]), sr([]));
    expect(out.findings).toEqual(load.findings);
    expect(out.interaction.performed).toBe(true);
    expect(out.interaction.cleared_on_reject).toHaveLength(1);
    expect(out.limits.some((l) => /was performed/.test(l))).toBe(true);
    expect(out.limits.some((l) => /was not performed/.test(l))).toBe(false);
  });
});
