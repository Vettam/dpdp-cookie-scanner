import type { Finding, FindingPresence } from "../types.js";

/** Identity for comparing findings across passes or scans: rule + tracker, else host. */
export function findingKey(f: Finding): string {
  const tracker = f.tracker?.id ?? "";
  if (tracker) return `${f.rule_id}::${tracker}`;
  const host = findingHost(f);
  return `${f.rule_id}::${host}`;
}

export function findingHost(f: Finding): string {
  for (const e of f.evidence) {
    if (e.type === "request" || e.type === "embed") return e.host;
    if (e.type === "cookie") return e.domain.replace(/^\./, "");
  }
  return "";
}

export function toPresence(f: Finding): FindingPresence {
  return {
    rule_id: f.rule_id,
    tracker_id: f.tracker?.id ?? null,
    host: findingHost(f),
    certainty: f.certainty,
    title: f.tracker ? `${f.tracker.vendor} (${f.tracker.id})` : f.title,
  };
}
