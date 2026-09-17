import type { ScanResult } from "../types.js";

/** Render the full ScanResult as pretty JSON (the schema-validated output). */
export function renderJson(sr: ScanResult): string {
  return JSON.stringify(sr, null, 2) + "\n";
}
