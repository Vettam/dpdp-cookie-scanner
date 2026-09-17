import { describe, expect, it } from "vitest";
import { FixtureEngine } from "../../src/engine/fixture.js";
import type { Observation } from "../../src/types.js";

const load: Observation[] = [
  {
    type: "meta",
    timestamp_ms: 0,
    before_first_paint: true,
    before_banner_detected: true,
    url: "https://staging.acme.in",
    final_url: "https://staging.acme.in/",
    page_language: "en",
    title: "Acme",
    scan_started_at: "2026-09-17T09:12:00.000Z",
    engine_version: "1.0.0",
    rules_version: "0.1.0",
    trackers_version: "0.1.0",
  },
];

describe("FixtureEngine bannerAction", () => {
  it("stamps a successful click when a dedicated accept/reject fixture exists", async () => {
    const engine = new FixtureEngine(
      new Map([
        ["https://staging.acme.in", load],
        ["https://staging.acme.in#reject", load],
      ]),
    );
    const obs = await engine.scan("https://staging.acme.in", { bannerAction: "reject" });
    const meta = obs.find((o) => o.type === "meta");
    expect(meta).toMatchObject({ banner_action: "reject", banner_action_clicked: true });
  });

  it("stamps a missed click when the extra pass falls back to the load fixture", async () => {
    const engine = new FixtureEngine(new Map([["https://staging.acme.in", load]]));
    const obs = await engine.scan("https://staging.acme.in", { bannerAction: "reject" });
    const meta = obs.find((o) => o.type === "meta");
    expect(meta).toMatchObject({ banner_action: "reject", banner_action_clicked: false });
  });
});
