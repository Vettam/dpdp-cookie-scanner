import { describe, expect, it } from "vitest";
import { applyDestinationCountries } from "../../src/engine/geo.js";
import { decodeGeoDb, encodeGeoDb, type GeoDb } from "../../src/geo/lookup.js";
import type { Observation } from "../../src/types.js";

function miniDb(): GeoDb {
  return decodeGeoDb(
    encodeGeoDb({
      date: "2026-09-01",
      source: "DB-IP Lite",
      v4Start: new Uint32Array([0x08080808]),
      v4Cc: new Uint16Array([(0x55 << 8) | 0x53]),
      v6Start: new Uint8Array(0),
      v6Cc: new Uint16Array(0),
    }),
  );
}

function req(host: string, country = ""): Observation {
  return {
    type: "request",
    timestamp_ms: 0,
    before_first_paint: true,
    before_banner_detected: true,
    method: "GET",
    host,
    path: "/",
    initiator_host: "",
    resource_type: "script",
    is_third_party: true,
    destination_country: country,
  };
}

describe("applyDestinationCountries", () => {
  it("fills empty destination_country from the IP map", () => {
    const obs = [req("www.google.com")];
    applyDestinationCountries(obs, new Map([["www.google.com", "8.8.8.8"]]), miniDb());
    expect(obs[0]).toMatchObject({ type: "request", destination_country: "US" });
  });

  it("does not overwrite a country the engine already recorded", () => {
    const obs = [req("www.google.com", "IN")];
    applyDestinationCountries(obs, new Map([["www.google.com", "8.8.8.8"]]), miniDb());
    expect(obs[0]).toMatchObject({ type: "request", destination_country: "IN" });
  });

  it("leaves destination_country empty when no IP was observed", () => {
    const obs = [req("unknown.example")];
    applyDestinationCountries(obs, new Map(), miniDb());
    expect(obs[0]).toMatchObject({ type: "request", destination_country: "" });
  });
});
