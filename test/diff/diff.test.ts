import { describe, expect, it } from "vitest";
import { diffScanResults } from "../../src/diff/index.js";
import { ScanResultDiff } from "../../src/types.js";
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

function sr(over: Partial<ScanResult> & { findings?: Finding[] }): ScanResult {
  const findings = over.findings ?? [];
  return {
    schema_version: "1.0.0",
    engine_version: "1.0.0",
    rules_version: "0.3.1",
    trackers_version: "0.2.0",
    interpretation_as_of: "2026-09-15",
    scanned_at: "2026-09-17T09:12:00.000Z",
    target: { url: "https://staging.acme.in", final_url: "https://staging.acme.in/", page_language: "en" },
    banner: { detected: true, confidence: "high", has_accept: true, has_reject: false },
    inventory: {
      cookies: [],
      storage: [],
      third_party_hosts: [
        {
          host: "www.facebook.com",
          tracker_id: "meta-pixel",
          category: "C6",
          country: "US",
          first_seen_ms: 412,
          before_banner: true,
        },
      ],
      fingerprinting_apis: [],
      unclassified_hosts: [],
    },
    questions: [],
    summary: {
      by_certainty: { settled: findings.length, arguable: 0, open: 0 },
      third_parties: 1,
      third_parties_outside_india: 1,
      fired_before_banner: 1,
    },
    limits: [],
    interaction: {
      performed: false,
      accept_clicked: false,
      reject_clicked: false,
      accept_findings: 0,
      reject_findings: 0,
      survived_reject: [],
      cleared_on_reject: [],
      appeared_on_accept: [],
    },
    findings,
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

describe("diffScanResults", () => {
  it("attributes host and finding additions to the site when the catalogue is unchanged", () => {
    const from = sr({ findings: [meta] });
    const to = sr({
      findings: [meta, hotjar],
      inventory: {
        cookies: [],
        storage: [],
        third_party_hosts: [
          {
            host: "www.facebook.com",
            tracker_id: "meta-pixel",
            category: "C6",
            country: "US",
            first_seen_ms: 412,
            before_banner: true,
          },
          {
            host: "static.hotjar.com",
            tracker_id: "hotjar",
            category: "C5",
            country: "US",
            first_seen_ms: 500,
            before_banner: true,
          },
        ],
        fingerprinting_apis: [],
        unclassified_hosts: [],
      },
    });
    const d = diffScanResults(from, to);
    expect(ScanResultDiff.safeParse(d).success).toBe(true);
    expect(d.catalogue_changed).toBe(false);
    expect(d.site.hosts_added).toEqual(["static.hotjar.com"]);
    expect(d.site.findings_added.map((f) => f.tracker_id)).toEqual(["hotjar"]);
    expect(d.catalogue.findings_added).toEqual([]);
  });

  it("attributes a new finding on an existing host to the catalogue when versions differ", () => {
    const from = sr({ findings: [meta], rules_version: "0.3.1" });
    const to = sr({
      findings: [meta, finding({ id: "f_new", rule_id: "DPDP-C-099", tracker: meta.tracker })],
      rules_version: "0.4.0",
    });
    const d = diffScanResults(from, to);
    expect(d.catalogue_changed).toBe(true);
    expect(d.site.findings_added).toEqual([]);
    expect(d.catalogue.findings_added.map((f) => f.rule_id)).toEqual(["DPDP-C-099"]);
  });

  it("keeps a new host as a site change even when the catalogue also moved", () => {
    const from = sr({ findings: [meta], rules_version: "0.3.1" });
    const to = sr({
      findings: [meta, hotjar],
      rules_version: "0.4.0",
      inventory: {
        cookies: [],
        storage: [],
        third_party_hosts: [
          {
            host: "www.facebook.com",
            tracker_id: "meta-pixel",
            category: "C6",
            country: "US",
            first_seen_ms: 412,
            before_banner: true,
          },
          {
            host: "static.hotjar.com",
            tracker_id: "hotjar",
            category: "C5",
            country: "US",
            first_seen_ms: 500,
            before_banner: true,
          },
        ],
        fingerprinting_apis: [],
        unclassified_hosts: [],
      },
    });
    const d = diffScanResults(from, to);
    expect(d.site.hosts_added).toEqual(["static.hotjar.com"]);
    expect(d.site.findings_added.map((f) => f.tracker_id)).toEqual(["hotjar"]);
    expect(d.catalogue.findings_added).toEqual([]);
  });

  it("records certainty reclassification as a catalogue change", () => {
    const from = sr({ findings: [meta] });
    const to = sr({ findings: [finding({ id: "f_meta", rule_id: "DPDP-C-001", certainty: "arguable" })] });
    const d = diffScanResults(from, to);
    expect(d.catalogue.findings_reclassified).toEqual([
      {
        rule_id: "DPDP-C-001",
        tracker_id: "meta-pixel",
        host: "www.facebook.com",
        from_certainty: "settled",
        to_certainty: "arguable",
      },
    ]);
  });
});
