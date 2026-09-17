import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadRules, readRulesVersion } from "./rules/loader.js";
import { loadTrackers, readTrackersVersion } from "./trackers/loader.js";
import { TrackerIndex } from "./trackers/matcher.js";
import { mapScan } from "./mapper/index.js";
import type { ScanResult } from "./types.js";
import type { ScanEngine, ScanOptions } from "./engine/types.js";

export { FixtureEngine } from "./engine/fixture.js";
export type { ScanEngine, ScanOptions } from "./engine/types.js";
export { renderTerminal } from "./report/terminal.js";
export { renderJson } from "./report/json.js";
export { renderMarkdown } from "./report/markdown.js";
export type { ScanResult, Finding, Question, Observation } from "./types.js";

export interface ScanRunOptions extends ScanOptions {
  /** Override the engine (tests pass a FixtureEngine). Defaults to the real engine. */
  engine?: ScanEngine;
  /** Override the rules directory. */
  rulesDir?: string;
  /** Override the trackers directory. */
  trackersDir?: string;
  /** Override the interpretation-as-of date. */
  interpretationAsOf?: string;
}

const ENGINE_VERSION = "0.3.0";

function defaultRulesDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "rules");
}

function defaultTrackersDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "trackers");
}

/**
 * The library entry point (spec §3.1): scan(url, options) → ScanResult.
 * Surfaces are thin renderers over this. Never forks logic per surface.
 */
export async function scan(url: string, options: ScanRunOptions = {}): Promise<ScanResult> {
  const engine = options.engine ?? (await import("./engine/playwright.js")).defaultEngine;
  const observations = await engine.scan(url, options);

  const rulesDir = options.rulesDir ?? defaultRulesDir();
  const trackersDir = options.trackersDir ?? defaultTrackersDir();

  const rules = await loadRules(rulesDir);
  const trackers = await loadTrackers(trackersDir);
  const index = new TrackerIndex(trackers);

  return mapScan({
    observations,
    rules,
    trackers: index,
    engineVersion: ENGINE_VERSION,
    rulesVersion: readRulesVersion(rulesDir),
    trackersVersion: readTrackersVersion(trackersDir),
    interpretationAsOf: options.interpretationAsOf ?? new Date().toISOString().slice(0, 10),
  });
}
