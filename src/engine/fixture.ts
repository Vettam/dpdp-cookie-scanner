import type { MetaObservation, Observation } from "../types.js";
import type { ScanEngine, ScanOptions } from "./types.js";

/**
 * A fixture-backed engine: returns canned Observation[] keyed by URL, or by
 * `url#accept` / `url#reject` when `bannerAction` is set. Used in tests and as
 * a no-browser fallback. A dedicated accept/reject fixture means the click
 * succeeded; falling back to the load URL means the click missed.
 */
export class FixtureEngine implements ScanEngine {
  constructor(private fixtures: Map<string, Observation[]>) {}

  async scan(url: string, options?: ScanOptions): Promise<Observation[]> {
    const action = options?.bannerAction;
    if (!action) {
      const obs = this.fixtures.get(url) ?? this.fixtures.get("*") ?? [];
      return structuredClone(obs);
    }
    const keyed = `${url}#${action}`;
    const clicked = this.fixtures.has(keyed);
    const obs = structuredClone(
      this.fixtures.get(keyed) ?? this.fixtures.get(url) ?? this.fixtures.get("*") ?? [],
    );
    return stampBannerAction(obs, action, clicked);
  }
}

function stampBannerAction(
  obs: Observation[],
  action: "accept" | "reject",
  clicked: boolean,
): Observation[] {
  return obs.map((o) => {
    if (o.type !== "meta") return o;
    return { ...o, banner_action: action, banner_action_clicked: clicked } as MetaObservation;
  });
}
