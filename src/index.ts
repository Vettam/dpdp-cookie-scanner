import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadRules, readRulesVersion } from "./rules/loader.js";
import { loadTrackers, readTrackersVersion } from "./trackers/loader.js";
import { TrackerIndex } from "./trackers/matcher.js";
import { mapScan } from "./mapper/index.js";
import { attachInteraction } from "./interaction/compare.js";
import type { ScanResult } from "./types.js";
import type { ScanEngine, ScanOptions } from "./engine/types.js";

export { FixtureEngine } from "./engine/fixture.js";
export type { ScanEngine, ScanOptions } from "./engine/types.js";
export { renderTerminal } from "./report/terminal.js";
export { renderJson } from "./report/json.js";
export { renderMarkdown } from "./report/markdown.js";
export { diffScanResults } from "./diff/index.js";
export { comparePasses, attachInteraction } from "./interaction/compare.js";
export type { ScanResult, Finding, Question, Observation, ScanResultDiff, Interaction } from "./types.js";

export interface ScanRunOptions extends ScanOptions {
  /** Override the engine (tests pass a FixtureEngine). Defaults to the real engine. */
  engine?: ScanEngine;
  /** Override the rules directory. */
  rulesDir?: string;
  /** Override the trackers directory. */
  trackersDir?: string;
  /** Override the interpretation-as-of date. */
  interpretationAsOf?: string;
  /**
   * Run three independent passes (load, accept-all, reject-all) and attach
   * `interaction` comparing their findings. Default is load-only.
   */
  interact?: boolean;
}

const ENGINE_VERSION = "1.0.0";

function defaultRulesDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "rules");
}

function defaultTrackersDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "trackers");
}

function engineOptions(options: ScanRunOptions): ScanOptions {
  const out: ScanOptions = {};
  if (options.timeout !== undefined) out.timeout = options.timeout;
  if (options.settle !== undefined) out.settle = options.settle;
  if (options.gpc !== undefined) out.gpc = options.gpc;
  if (options.includeQuery !== undefined) out.includeQuery = options.includeQuery;
  if (options.screenshot !== undefined) out.screenshot = options.screenshot;
  if (options.screenshotPath !== undefined) out.screenshotPath = options.screenshotPath;
  if (options.browserPath !== undefined) out.browserPath = options.browserPath;
  if (options.bannerAction !== undefined) out.bannerAction = options.bannerAction;
  return out;
}

function withoutBannerAction(options: ScanOptions): ScanOptions {
  const { bannerAction: _unused, ...rest } = options;
  return rest;
}

function passOptions(options: ScanOptions, bannerAction: "accept" | "reject"): ScanOptions {
  const { screenshotPath: _unused, ...rest } = options;
  return { ...rest, bannerAction };
}

/**
 * The library entry point (spec §3.1): scan(url, options) → ScanResult.
 * Surfaces are thin renderers over this. Never forks logic per surface.
 */
export async function scan(url: string, options: ScanRunOptions = {}): Promise<ScanResult> {
  const engine = options.engine ?? (await import("./engine/playwright.js")).defaultEngine;
  const rulesDir = options.rulesDir ?? defaultRulesDir();
  const trackersDir = options.trackersDir ?? defaultTrackersDir();

  const rules = await loadRules(rulesDir);
  const trackers = await loadTrackers(trackersDir);
  const index = new TrackerIndex(trackers);
  const mapped = {
    rules,
    trackers: index,
    engineVersion: ENGINE_VERSION,
    rulesVersion: readRulesVersion(rulesDir),
    trackersVersion: readTrackersVersion(trackersDir),
    interpretationAsOf: options.interpretationAsOf ?? new Date().toISOString().slice(0, 10),
  };

  const opts = engineOptions(options);
  const loadObs = await engine.scan(url, options.interact ? withoutBannerAction(opts) : opts);
  const load = mapScan({ observations: loadObs, ...mapped });
  if (!options.interact) return load;

  const acceptObs = await engine.scan(url, passOptions(opts, "accept"));
  const rejectObs = await engine.scan(url, passOptions(opts, "reject"));
  return attachInteraction(
    load,
    mapScan({ observations: acceptObs, ...mapped }),
    mapScan({ observations: rejectObs, ...mapped }),
  );
}
