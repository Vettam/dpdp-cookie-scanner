import type { Interaction, Observation, ScanResult } from "../types.js";
import { findingKey, toPresence } from "./finding-key.js";

export const LOAD_INTERACTION_LIMIT =
  "Consent-banner interaction was not performed; findings reflect the page state before any user action.";

export const PERFORMED_INTERACTION_LIMIT =
  "Consent-banner interaction was performed (load, accept-all, reject-all). The findings array is the load pass; interaction compares load against accept-all and reject-all.";

export const MISSED_ACCEPT_LIMIT =
  "Accept-all control was not found; accept comparison was not performed.";

export const MISSED_REJECT_LIMIT =
  "Reject-all control was not found; reject comparison was not performed.";

export interface ClickOutcome {
  accept: boolean;
  reject: boolean;
}

const CLICKS_SUCCEEDED: ClickOutcome = { accept: true, reject: true };

/**
 * Compare three independently mapped passes. Identity is rule_id + tracker
 * (or host when there is no tracker). A missed accept/reject click is a load
 * pass, not an interaction — do not report survived_reject / appeared_on_accept
 * for a click that never happened.
 */
export function comparePasses(
  load: ScanResult,
  accept: ScanResult,
  reject: ScanResult,
  clicks: ClickOutcome = CLICKS_SUCCEEDED,
): Interaction {
  const loadMap = byKey(load);
  const acceptMap = byKey(accept);
  const rejectMap = byKey(reject);

  const survived_reject = [];
  const cleared_on_reject = [];
  if (clicks.reject) {
    for (const [key, f] of loadMap) {
      if (rejectMap.has(key)) survived_reject.push(toPresence(f));
      else cleared_on_reject.push(toPresence(f));
    }
  }

  const appeared_on_accept = [];
  if (clicks.accept) {
    for (const [key, f] of acceptMap) {
      if (!loadMap.has(key)) appeared_on_accept.push(toPresence(f));
    }
  }

  return {
    performed: clicks.accept || clicks.reject,
    accept_clicked: clicks.accept,
    reject_clicked: clicks.reject,
    accept_findings: clicks.accept ? accept.findings.length : 0,
    reject_findings: clicks.reject ? reject.findings.length : 0,
    survived_reject,
    cleared_on_reject,
    appeared_on_accept,
  };
}

export function attachInteraction(
  load: ScanResult,
  accept: ScanResult,
  reject: ScanResult,
  clicks: ClickOutcome = CLICKS_SUCCEEDED,
): ScanResult {
  const interaction = comparePasses(load, accept, reject, clicks);
  if (!interaction.performed) return { ...load, interaction };

  const limits = load.limits.map((l) =>
    l === LOAD_INTERACTION_LIMIT ? PERFORMED_INTERACTION_LIMIT : l,
  );
  if (!clicks.accept) limits.push(MISSED_ACCEPT_LIMIT);
  if (!clicks.reject) limits.push(MISSED_REJECT_LIMIT);
  return { ...load, interaction, limits };
}

export function bannerActionClicked(obs: Observation[]): boolean {
  const meta = obs.find((o) => o.type === "meta");
  return Boolean(meta && meta.banner_action_clicked);
}

function byKey(sr: ScanResult) {
  const map = new Map<string, ScanResult["findings"][number]>();
  for (const f of sr.findings) map.set(findingKey(f), f);
  return map;
}
