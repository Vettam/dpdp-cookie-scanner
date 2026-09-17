import type { Observation } from "../types.js";
import type { ScanEngine, ScanOptions } from "./types.js";

/**
 * A fixture-backed engine: returns canned Observation[] keyed by URL, or by
 * `url#accept` / `url#reject` when `bannerAction` is set. Used in tests and as
 * a no-browser fallback.
 */
export class FixtureEngine implements ScanEngine {
  constructor(private fixtures: Map<string, Observation[]>) {}

  async scan(url: string, options?: ScanOptions): Promise<Observation[]> {
    const action = options?.bannerAction;
    const keyed = action ? `${url}#${action}` : url;
    const obs = this.fixtures.get(keyed) ?? this.fixtures.get(url) ?? this.fixtures.get("*") ?? [];
    return structuredClone(obs);
  }
}
