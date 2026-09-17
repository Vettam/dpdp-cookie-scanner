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
});
