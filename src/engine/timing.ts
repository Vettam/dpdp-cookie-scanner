import type { Observation } from "../types.js";

/** Stamp before_first_paint from a Performance paint timestamp (ms from navigation start). */
export function applyBeforeFirstPaint(observations: Observation[], firstPaintMs: number | null): void {
  if (firstPaintMs == null || firstPaintMs <= 0) return;
  for (const o of observations) {
    if (o.type === "meta") continue;
    if (o.timestamp_ms === 0) continue;
    o.before_first_paint = o.timestamp_ms < firstPaintMs;
  }
}

/**
 * Main-frame URLs seen during navigation, minus the URL the user asked to scan.
 * The final URL is included if it differs (spec §4.2 meta.redirects).
 */
export function redirectChain(requestedUrl: string, finalUrl: string, hops: string[]): string[] {
  const start = normalize(requestedUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const hop of hops) {
    const n = normalize(hop);
    if (!n || n === start || n === "about:blank" || seen.has(n)) continue;
    seen.add(n);
    out.push(hop);
  }
  const final = normalize(finalUrl);
  if (final && final !== start && !seen.has(final)) out.push(finalUrl);
  return out;
}

function normalize(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "/" : u.pathname.replace(/\/$/, "");
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return url;
  }
}
