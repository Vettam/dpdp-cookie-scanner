import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadTrackers, readTrackersVersion } from "../../src/trackers/loader.js";

const trackersDir = join(process.cwd(), "trackers");

describe("shipped tracker dataset", () => {
  it("loads every shipped tracker without error", async () => {
    const trackers = await loadTrackers(trackersDir);
    expect(trackers.length).toBeGreaterThanOrEqual(10);
  });

  it("tracker ids are unique", async () => {
    const trackers = await loadTrackers(trackersDir);
    const ids = trackers.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every tracker cites provisions and has a category", async () => {
    const trackers = await loadTrackers(trackersDir);
    for (const t of trackers) {
      expect(t.provisions.length).toBeGreaterThan(0);
      expect(t.category.length).toBeGreaterThan(0);
    }
  });

  it("has a VERSION file", () => {
    expect(readTrackersVersion(trackersDir)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("covers the spec §6 Indian-vendor priority set plus the v0.3 expansion", async () => {
    const trackers = await loadTrackers(trackersDir);
    const ids = new Set(trackers.map((t) => t.id));
    for (const id of [
      "razorpay",
      "payu",
      "cashfree",
      "ccavenue",
      "instamojo",
      "juspay",
      "paytm",
      "clevertap",
      "moengage",
      "webengage",
      "netcore-smartech",
      "notifyvisitors",
      "convertcart",
      "freshchat",
      "freshdesk",
      "freshmarketer",
      "zoho-salesiq",
      "zoho-pagesense",
      "vwo",
      "pushengage",
      "inmobi",
      "media-net",
      "cuelinks",
      "cookieyes",
    ]) {
      expect(ids.has(id), `missing Indian-priority tracker ${id}`).toBe(true);
    }
  });

  it("ships spec §4.3 CMP signatures as C10 tracker records", async () => {
    const trackers = await loadTrackers(trackersDir);
    const byId = new Map(trackers.map((t) => [t.id, t]));
    for (const id of ["onetrust", "cookiebot", "cookieyes", "osano", "quantcast"]) {
      const t = byId.get(id);
      expect(t, `missing C10 CMP ${id}`).toBeDefined();
      expect(t!.category).toBe("C10");
      expect(t!.cmp?.selectors.length, `${id} needs cmp.selectors`).toBeGreaterThan(0);
    }
  });
});
