import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { mapScan } from "../../src/mapper/index.js";
import { TrackerIndex } from "../../src/trackers/matcher.js";
import { loadRules } from "../../src/rules/loader.js";
import { loadTrackers } from "../../src/trackers/loader.js";
import { renderTerminal } from "../../src/report/terminal.js";
import { renderJson } from "../../src/report/json.js";
import { renderMarkdown } from "../../src/report/markdown.js";
import { ScanResult } from "../../src/types.js";

const rules = await loadRules(join(process.cwd(), "rules"));
const trackers = await loadTrackers(join(process.cwd(), "trackers"));
const index = new TrackerIndex(trackers);

function fixtureScan() {
  const obs = [
    {
      type: "meta" as const, timestamp_ms: 0, before_first_paint: true, before_banner_detected: true,
      url: "https://staging.acme.in", final_url: "https://staging.acme.in/",
      page_language: "en", title: "Acme", scan_started_at: "2026-09-17T09:12:00.000Z",
      engine_version: "0.1.0", rules_version: "0.1.0", trackers_version: "0.1.0",
      geo_source: "DB-IP Lite", geo_date: "2026-09-01",
    },
    {
      type: "request" as const, timestamp_ms: 412, before_first_paint: true, before_banner_detected: true,
      method: "GET", host: "www.facebook.com", path: "/tr",
      initiator_host: "www.googletagmanager.com", resource_type: "image",
      is_third_party: true, destination_country: "US",
    },
    {
      type: "request" as const, timestamp_ms: 500, before_first_paint: true, before_banner_detected: true,
      method: "GET", host: "static.hotjar.com", path: "/c/hotjar.js",
      initiator_host: "www.googletagmanager.com", resource_type: "script",
      is_third_party: true, destination_country: "US",
    },
    {
      type: "banner" as const, timestamp_ms: 2000, before_first_paint: false, before_banner_detected: false,
      detected: true, has_accept: true, has_reject: false, has_settings: false,
      has_pre_ticked: false, has_language_switcher: false, mentions_legitimate_interest: false,
      implies_consent_by_browsing: false, text_excerpt: "", detection_confidence: "high" as const,
    },
  ];
  return mapScan({
    observations: obs as never,
    rules,
    trackers: index,
    engineVersion: "0.1.0",
    rulesVersion: "0.1.0",
    trackersVersion: "0.1.0",
    interpretationAsOf: "2026-09-15",
  });
}

describe("renderers", () => {
  it("terminal output matches snapshot and contains no rupee figures", async () => {
    const sr = fixtureScan();
    const out = renderTerminal(sr, { color: false });
    expect(out).not.toMatch(/₹|rupee|crore/i);
    expect(out).toContain("SETTLED");
    expect(out).toContain("QUESTIONS");
    expect(out).toContain("https://sentinel.vettam.ai/rules/<id>");
    await expect(out).toMatchFileSnapshot(snapshotPath("terminal.txt"));
  });

  it("json output is valid ScanResult and matches snapshot", async () => {
    const sr = fixtureScan();
    const out = renderJson(sr);
    expect(ScanResult.safeParse(JSON.parse(out)).success).toBe(true);
    await expect(out).toMatchFileSnapshot(snapshotPath("scanresult.json"));
  });

  it("markdown output matches snapshot and has collapsible blocks", async () => {
    const sr = fixtureScan();
    const out = renderMarkdown(sr);
    expect(out).toContain("<details>");
    await expect(out).toMatchFileSnapshot(snapshotPath("findings.md"));
  });
});

function snapshotPath(name: string): string {
  return join(import.meta.dirname, "__snapshots__", name);
}
