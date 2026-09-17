import type { Finding, FindingPresence, ScanResult, ScanResultDiff } from "../types.js";
import { findingKey, findingHost, toPresence } from "../interaction/finding-key.js";

/**
 * Diff two ScanResults, splitting inventory/finding drift (site) from
 * catalogue-driven finding drift (rules/tracker version change).
 */
export function diffScanResults(from: ScanResult, to: ScanResult): ScanResultDiff {
  const catalogue_changed =
    from.rules_version !== to.rules_version ||
    from.trackers_version !== to.trackers_version ||
    from.interpretation_as_of !== to.interpretation_as_of;

  const fromHosts = siteHosts(from);
  const toHosts = siteHosts(to);

  const hosts_added = [...toHosts].filter((h) => !fromHosts.has(h)).sort();
  const hosts_removed = [...fromHosts].filter((h) => !toHosts.has(h)).sort();

  const fromMap = byKey(from);
  const toMap = byKey(to);

  const siteAdded: FindingPresence[] = [];
  const siteRemoved: FindingPresence[] = [];
  const catalogueAdded: FindingPresence[] = [];
  const catalogueRemoved: FindingPresence[] = [];
  const findings_reclassified: ScanResultDiff["catalogue"]["findings_reclassified"] = [];

  for (const [key, f] of toMap) {
    const prev = fromMap.get(key);
    if (!prev) {
      if (catalogue_changed && isCatalogueFinding(f, fromHosts)) catalogueAdded.push(toPresence(f));
      else siteAdded.push(toPresence(f));
    } else if (prev.certainty !== f.certainty) {
      findings_reclassified.push({
        rule_id: f.rule_id,
        tracker_id: f.tracker?.id ?? null,
        host: findingHost(f),
        from_certainty: prev.certainty,
        to_certainty: f.certainty,
      });
    }
  }

  for (const [key, f] of fromMap) {
    if (toMap.has(key)) continue;
    if (catalogue_changed && isCatalogueFinding(f, toHosts)) catalogueRemoved.push(toPresence(f));
    else siteRemoved.push(toPresence(f));
  }

  return {
    schema_version: "1.0.0",
    from: side(from),
    to: side(to),
    catalogue_changed,
    site: {
      hosts_added,
      hosts_removed,
      findings_added: siteAdded,
      findings_removed: siteRemoved,
    },
    catalogue: {
      findings_added: catalogueAdded,
      findings_removed: catalogueRemoved,
      findings_reclassified,
    },
  };
}

function side(sr: ScanResult) {
  return {
    scanned_at: sr.scanned_at,
    rules_version: sr.rules_version,
    trackers_version: sr.trackers_version,
    interpretation_as_of: sr.interpretation_as_of,
    target_url: sr.target.url,
  };
}

function siteHosts(sr: ScanResult): Set<string> {
  const s = new Set<string>();
  for (const h of sr.inventory.third_party_hosts) s.add(h.host);
  for (const h of sr.inventory.unclassified_hosts) s.add(h);
  for (const c of sr.inventory.cookies) s.add(c.domain.replace(/^\./, ""));
  return s;
}

function byKey(sr: ScanResult) {
  const map = new Map<string, Finding>();
  for (const f of sr.findings) map.set(findingKey(f), f);
  return map;
}

/** A finding whose evidence hosts were already on the other scan — catalogue, not a new tag. */
function isCatalogueFinding(f: Finding, otherHosts: Set<string>): boolean {
  const host = findingHost(f);
  if (!host) return true;
  return otherHosts.has(host);
}
