import { ScanResult, type ScanResult as ScanResultT } from "../types.js";

/** Render the full ScanResult as pretty JSON, schema-validated (spec §7.3). */
export function renderJson(sr: ScanResultT): string {
  return JSON.stringify(ScanResult.parse(sr), null, 2) + "\n";
}
