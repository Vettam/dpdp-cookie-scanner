import { describe, expect, it } from "vitest";
import { applyBeforeFirstPaint, redirectChain } from "../../src/engine/timing.js";
import type { Observation } from "../../src/types.js";

function req(ms: number): Observation {
  return {
    type: "request",
    timestamp_ms: ms,
    before_first_paint: false,
    before_banner_detected: false,
    method: "GET",
    host: "cdn.example",
    path: "/",
    initiator_host: "",
    resource_type: "script",
    is_third_party: true,
    destination_country: "",
  };
}

describe("applyBeforeFirstPaint", () => {
  it("marks observations whose timestamp is before first paint", () => {
    const obs = [req(12), req(80)];
    applyBeforeFirstPaint(obs, 50);
    expect(obs[0]?.before_first_paint).toBe(true);
    expect(obs[1]?.before_first_paint).toBe(false);
  });

  it("leaves timestamps of 0 alone when they mean 'unknown' (cookies, storage)", () => {
    const cookie: Observation = {
      type: "cookie",
      timestamp_ms: 0,
      before_first_paint: false,
      before_banner_detected: false,
      name: "sid",
      domain: "acme.in",
      path: "/",
      expires: null,
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
      first_party: true,
      set_by: "",
    };
    applyBeforeFirstPaint([cookie], 40);
    expect(cookie.before_first_paint).toBe(false);
  });
});

describe("redirectChain", () => {
  it("returns intermediate hops excluding the original URL, preserving order", () => {
    expect(
      redirectChain("https://acme.in", "https://www.acme.in/", [
        "https://acme.in/",
        "https://www.acme.in/",
      ]),
    ).toEqual(["https://www.acme.in/"]);
  });

  it("returns empty when there was no redirect", () => {
    expect(redirectChain("https://acme.in/", "https://acme.in/", ["https://acme.in/"])).toEqual([]);
  });
});
