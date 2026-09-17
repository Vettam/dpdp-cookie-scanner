import type { Interaction, ScanResult } from "../types.js";
import { findingKey, toPresence } from "./finding-key.js";

export const LOAD_INTERACTION_LIMIT =
  "Consent-banner interaction was not performed; findings reflect the page state before any user action.";

export const PERFORMED_INTERACTION_LIMIT =
  "Consent-banner interaction was performed (load, accept-all, reject-all). The findings array is the load pass; interaction compares load against accept-all and reject-all.";

/**
 * Compare three independently mapped passes. Identity is rule_id + tracker
 * (or host when there is no tracker).
 */
export function comparePasses(
  load: ScanResult,
  accept: ScanResult,
  reject: ScanResult,
): Interaction {
  const loadMap = byKey(load);
  const acceptMap = byKey(accept);
  const rejectMap = byKey(reject);

  const survived_reject = [];
  const cleared_on_reject = [];
  for (const [key, f] of loadMap) {
    if (rejectMap.has(key)) survived_reject.push(toPresence(f));
    else cleared_on_reject.push(toPresence(f));
  }

  const appeared_on_accept = [];
  for (const [key, f] of acceptMap) {
    if (!loadMap.has(key)) appeared_on_accept.push(toPresence(f));
  }

  return {
    performed: true,
    accept_findings: accept.findings.length,
    reject_findings: reject.findings.length,
    survived_reject,
    cleared_on_reject,
    appeared_on_accept,
  };
}

export function attachInteraction(
  load: ScanResult,
  accept: ScanResult,
  reject: ScanResult,
): ScanResult {
  const interaction = comparePasses(load, accept, reject);
  const limits = load.limits.map((l) =>
    l === LOAD_INTERACTION_LIMIT ? PERFORMED_INTERACTION_LIMIT : l,
  );
  return { ...load, interaction, limits };
}

function byKey(sr: ScanResult) {
  const map = new Map<string, ScanResult["findings"][number]>();
  for (const f of sr.findings) map.set(findingKey(f), f);
  return map;
}
