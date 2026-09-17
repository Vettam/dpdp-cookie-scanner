import type { Observation } from "../types.js";

/**
 * The engine records facts (Observation[]). It does NOT interpret them — that is
 * the mapper's job (spec §1.5). Default scan is load-only; `bannerAction` runs
 * a single extra pass. `scan({ interact: true })` orchestrates three passes
 * without changing this one-call interface (spec §4.1 / §9 v1.0).
 */
export interface ScanOptions {
  timeout?: number;
  settle?: number;
  gpc?: boolean;
  includeQuery?: boolean;
  screenshot?: boolean;
  /** Viewport PNG path. Written only when --screenshot is set; never embedded in JSON. */
  screenshotPath?: string;
  browserPath?: string;
  /**
   * After load, click the matching consent-banner control and settle again.
   * Each call is still one pass with a fresh context (spec §4.1).
   */
  bannerAction?: "accept" | "reject";
  /** C10 CMP banner signatures loaded from trackers/ (spec §4.3). */
  cmpSignatures?: import("./banner.js").CmpSignature[] | undefined;
}

export interface ScanEngine {
  scan(url: string, options?: ScanOptions): Promise<Observation[]>;
}
