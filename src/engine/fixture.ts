import type { Observation } from "../types.js";
import type { ScanEngine, ScanOptions } from "./types.js";

/**
 * A fixture-backed engine: returns canned Observation[] keyed by URL. Used in
 * tests and as a no-browser fallback. The real Playwright engine lives in
 * engine/playwright.ts (added last).
 */
export class FixtureEngine implements ScanEngine {
  constructor(private fixtures: Map<string, Observation[]>) {}

  async scan(url: string, _options?: ScanOptions): Promise<Observation[]> {
    const obs = this.fixtures.get(url) ?? this.fixtures.get("*") ?? [];
    return structuredClone(obs);
  }
}
