import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { loadGeoDb, lookupCountry, defaultGeoPath, geoMeta } from "../../src/geo/lookup.js";

describe("bundled DB-IP Lite", () => {
  it("is present in data/geo and dated", () => {
    expect(existsSync(defaultGeoPath())).toBe(true);
    const db = loadGeoDb();
    expect(db.date).toBe("2026-09-01");
    expect(geoMeta(db)).toEqual({ source: "DB-IP Lite", date: "2026-09-01" });
  });

  it("resolves well-known public IPs without a network call", () => {
    const db = loadGeoDb();
    expect(lookupCountry("8.8.8.8", db)).toBe("US");
    expect(lookupCountry("1.1.1.1", db)).toBe("AU");
    expect(lookupCountry("49.36.0.1", db)).toBe("IN");
    expect(lookupCountry("127.0.0.1", db)).toBe("");
  });
});
