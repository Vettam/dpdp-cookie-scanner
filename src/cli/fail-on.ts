import type { ScanResult } from "../types.js";

/**
 * Opt-in CI gate (spec §8.1 / §9 v1.0). The only accepted value is `settled`.
 * Arguable and open findings, and every question, must never trip this gate.
 */
export function parseFailOn(value: string): "settled" | "" | "invalid" {
  const v = value.trim().toLowerCase();
  if (v === "" || v === "none") return "";
  if (v === "settled") return "settled";
  return "invalid";
}

export function hasSettledFindings(sr: ScanResult): boolean {
  return sr.findings.some((f) => f.certainty === "settled");
}
