import { describe, expect, it } from "vitest";
import { TrackerIndex } from "../../src/trackers/matcher.js";
import type { Tracker } from "../../src/trackers/schema.js";

const t = (over: Partial<Tracker> & Pick<Tracker, "id" | "vendor" | "category" | "role" | "lawful_basis" | "provisions" | "notice_itemisation" | "last_verified" | "match">): Tracker => ({
  data_points: [],
  flags: [],
  destination_countries: [],
  fires_pre_consent_by_default: false,
  withdrawal_mechanism: "",
  provenance: "direct observation",
  ...over,
}) as Tracker;

const meta = t({
  id: "meta-pixel",
  vendor: "Meta",
  category: "C6",
  role: "independent_or_joint_fiduciary",
  lawful_basis: "consent",
  provisions: ["s.6(1)"],
  notice_itemisation: "n",
  last_verified: "2026-09-15",
  match: { hosts: ["connect.facebook.net", "www.facebook.com"], paths: ["/tr"] },
});

const ga = t({
  id: "google-analytics-4",
  vendor: "Google",
  category: "C4",
  role: "processor_or_3pf",
  lawful_basis: "consent",
  provisions: ["s.6(1)"],
  notice_itemisation: "n",
  last_verified: "2026-09-15",
  match: { hosts: ["www.google-analytics.com", "region1.google-analytics.com"], cookies: ["_ga", "_ga_*"] },
});

const hotjar = t({
  id: "hotjar",
  vendor: "Hotjar",
  category: "C5",
  role: "processor",
  lawful_basis: "consent",
  provisions: ["s.6(1)"],
  notice_itemisation: "n",
  last_verified: "2026-09-15",
  match: { hosts: ["static.hotjar.com", "ws.hotjar.com"], cookies: ["_hjSessionUser_*"], storage_keys: ["hjSessionUser"] },
});

const index = new TrackerIndex([meta, ga, hotjar]);

describe("TrackerIndex", () => {
  it("matches a request by host and path", () => {
    expect(index.byRequest("www.facebook.com", "/tr").id).toBe("meta-pixel");
  });

  it("does not match a request when the path is wrong", () => {
    expect(index.byRequest("www.facebook.com", "/page")).toBeUndefined();
  });

  it("matches a request by host alone when no paths are declared", () => {
    expect(index.byRequest("www.google-analytics.com", "/collect").id).toBe("google-analytics-4");
  });

  it("matches a subdomain of a declared host", () => {
    expect(index.byRequest("region1.google-analytics.com", "/j/collect").id).toBe("google-analytics-4");
  });

  it("matches a cookie by exact name", () => {
    expect(index.byCookie("_ga").id).toBe("google-analytics-4");
  });

  it("matches a cookie by glob pattern (_ga_*)", () => {
    expect(index.byCookie("_ga_ABC123").id).toBe("google-analytics-4");
  });

  it("matches a storage key", () => {
    expect(index.byStorageKey("hjSessionUser").id).toBe("hotjar");
  });

  it("returns undefined for an unclassified host", () => {
    expect(index.byRequest("evil-tracker.example", "/x")).toBeUndefined();
  });

  it("matches an embed by host", () => {
    expect(index.byEmbed("static.hotjar.com").id).toBe("hotjar");
  });
});
