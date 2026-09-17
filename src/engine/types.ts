import type { Observation } from "../types.js";

/**
 * The engine records facts (Observation[]). It does NOT interpret them — that is
 * the mapper's job (spec §1.5). v0.1 ships a baseline scan with no banner
 * interaction; the interface is shaped so a second and third pass can be added
 * without restructuring (spec §4.1).
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
}

export interface ScanEngine {
  scan(url: string, options?: ScanOptions): Promise<Observation[]>;
}
