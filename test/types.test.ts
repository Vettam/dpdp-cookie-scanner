import { describe, expect, it } from "vitest";
import { ScanResult, Observation, Finding, Question } from "../src/types.js";

const requestObs = {
  type: "request" as const,
  timestamp_ms: 412,
  before_first_paint: true,
  before_banner_detected: true,
  method: "GET",
  host: "www.facebook.com",
  path: "/tr",
  initiator_host: "www.googletagmanager.com",
  resource_type: "image",
  is_third_party: true,
  destination_country: "US",
};

const bannerObs = {
  type: "banner" as const,
  timestamp_ms: 100,
  before_first_paint: false,
  before_banner_detected: false,
  detected: true,
  has_accept: true,
  has_reject: false,
  detection_confidence: "high" as const,
};

const metaObs = {
  type: "meta" as const,
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
};

describe("Observation", () => {
  it("parses a request observation", () => {
    expect(Observation.safeParse(requestObs).success).toBe(true);
  });
  it("parses a banner observation", () => {
    expect(Observation.safeParse(bannerObs).success).toBe(true);
  });
  it("rejects an observation with an unknown type", () => {
    expect(Observation.safeParse({ ...requestObs, type: "websocket" }).success).toBe(false);
  });
});

describe("Finding", () => {
  it("parses a finding with evidence", () => {
    const f = {
      id: "f_01",
      rule_id: "DPDP-C-001",
      title: "Advertising tracker fires before any consent interaction",
      certainty: "settled",
      enforceable_from: "2027-05-13",
      observable: true,
      detection_confidence: "high",
      provisions: ["s.4(1)", "s.5(1)", "s.6(1)"],
      flags: ["PRE", "3PF"],
      owner: "engineering",
      tracker: { id: "meta-pixel", vendor: "Meta Platforms", category: "C6" },
      attributed_to: "tag manager container (googletagmanager.com)",
      evidence: [requestObs],
      rationale_plain: "p",
      rationale_dev: "d",
      remediation_summary: "r",
      explainer_url: "https://sentinel.vettam.ai/rules/DPDP-C-001",
      needs_input: [],
    };
    expect(Finding.safeParse(f).success).toBe(true);
  });
});

describe("Question", () => {
  it("parses a question with a needed fact", () => {
    const q = {
      rule_id: "DPDP-C-040",
      title: "Behavioural tracking or targeted advertising on a site plausibly reaching under-18s",
      prompt: "Does this site reach people under 18?",
      certainty: "settled",
      enforceable_from: "2027-05-13",
      provisions: ["s.9(3)"],
      flags: ["KIDS", "3PF"],
      owner: "counsel",
      needs_input: ["reaches_minors"],
      fact_needed: "reaches_minors",
      consequence_if_true: "C5/C6 tags are prohibited for under-18s regardless of consent.",
      rationale_plain: "p",
      explainer_url: "https://sentinel.vettam.ai/rules/DPDP-C-040",
    };
    expect(Question.safeParse(q).success).toBe(true);
  });
});

describe("ScanResult", () => {
  it("parses a complete scan result", () => {
    const sr = {
      schema_version: "1.0.0",
      engine_version: "0.1.0",
      rules_version: "0.1.0",
      trackers_version: "0.1.0",
      interpretation_as_of: "2026-09-15",
      scanned_at: "2026-09-17T09:12:00.000Z",
      target: { url: "https://staging.acme.in", final_url: "https://staging.acme.in/", page_language: "en" },
      banner: { detected: true, confidence: "high", has_accept: true, has_reject: false },
      inventory: {
        cookies: [],
        storage: [],
        third_party_hosts: [
          { host: "www.facebook.com", tracker_id: "meta-pixel", category: "C6", country: "US", first_seen_ms: 412, before_banner: true },
        ],
        fingerprinting_apis: [],
        unclassified_hosts: [],
      },
      findings: [],
      questions: [],
      summary: { by_certainty: { settled: 0, arguable: 0, open: 0 }, third_parties: 1, third_parties_outside_india: 1, fired_before_banner: 1 },
      limits: ["Server-side tagging, backend relays, logs and retention are not observable by a crawler."],
    };
    expect(ScanResult.safeParse(sr).success).toBe(true);
  });
});
