import { describe, expect, it } from "vitest";
import {
  decodeGeoDb,
  encodeGeoDb,
  lookupCountry,
  type GeoDb,
} from "../../src/geo/lookup.js";

function db(partial: Partial<GeoDb> = {}): GeoDb {
  return {
    date: "2026-09-01",
    source: "DB-IP Lite",
    v4Start: new Uint32Array([0x08080808, 0x31000000]),
    v4Cc: new Uint16Array([(0x55 << 8) | 0x53, (0x49 << 8) | 0x4e]), // US, IN
    v6Start: new Uint8Array(0),
    v6Cc: new Uint16Array(0),
    ...partial,
  };
}

describe("lookupCountry", () => {
  it("returns the country for an IPv4 address in a packed range", () => {
    expect(lookupCountry("8.8.8.8", db())).toBe("US");
    expect(lookupCountry("8.8.8.9", db())).toBe("US");
    expect(lookupCountry("49.0.0.1", db())).toBe("IN");
  });

  it("returns empty string for private, loopback, and unmapped addresses", () => {
    expect(lookupCountry("127.0.0.1", db())).toBe("");
    expect(lookupCountry("10.0.0.1", db())).toBe("");
    expect(lookupCountry("192.168.1.1", db())).toBe("");
    expect(lookupCountry("not-an-ip", db())).toBe("");
    expect(lookupCountry("1.1.1.1", db())).toBe(""); // before first range
  });

  it("does not claim a country across a gap between ranges", () => {
    const gapped: GeoDb = {
      date: "2026-09-01",
      source: "DB-IP Lite",
      v4Start: new Uint32Array([0x08080808, 0x08080900, 0x31000000]),
      v4Cc: new Uint16Array([(0x55 << 8) | 0x53, 0, (0x49 << 8) | 0x4e]),
      v6Start: new Uint8Array(0),
      v6Cc: new Uint16Array(0),
    };
    expect(lookupCountry("8.8.8.8", gapped)).toBe("US");
    expect(lookupCountry("8.8.9.1", gapped)).toBe("");
    expect(lookupCountry("49.1.0.0", gapped)).toBe("IN");
  });

  it("round-trips through the packed on-disk format", () => {
    const original = db();
    const packed = encodeGeoDb(original);
    const restored = decodeGeoDb(packed);
    expect(restored.date).toBe("2026-09-01");
    expect(restored.source).toBe("DB-IP Lite");
    expect(lookupCountry("8.8.8.8", restored)).toBe("US");
    expect(lookupCountry("49.0.0.1", restored)).toBe("IN");
  });

  it("looks up IPv6 and IPv4-mapped IPv6", () => {
    const withV6: GeoDb = {
      date: "2026-09-01",
      source: "DB-IP Lite",
      v4Start: new Uint32Array([0x08080808]),
      v4Cc: new Uint16Array([(0x55 << 8) | 0x53]),
      v6Start: new Uint8Array([
        0x20, 0x01, 0x48, 0x60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
      v6Cc: new Uint16Array([(0x55 << 8) | 0x53]),
    };
    expect(lookupCountry("2001:4860::8888", withV6)).toBe("US");
    expect(lookupCountry("::ffff:8.8.8.8", withV6)).toBe("US");
  });
});
