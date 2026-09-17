import type { Rule } from "../rules/schema.js";
import type { Tracker } from "../trackers/schema.js";
import { TrackerIndex } from "../trackers/matcher.js";
import type {
  BannerObservation,
  CookieObservation,
  Evidence,
  Finding,
  MetaObservation,
  Observation,
  Question,
  RequestObservation,
  ScanResult,
  StorageObservation,
} from "../types.js";

export interface MapInput {
  observations: Observation[];
  rules: Rule[];
  trackers: TrackerIndex;
  engineVersion: string;
  rulesVersion: string;
  trackersVersion: string;
  interpretationAsOf: string;
}

const SCHEMA_VERSION = "1.0.0";

/** Built-in finding for third-party hosts with no dataset match (web data map §2.3). */
const UNMAPPED_RULE = {
  id: "UNMAPPED",
  certainty: "settled" as const,
  enforceable_from: "2027-05-13",
  observable: true,
  provisions: ["s.4(1)", "s.7"],
  flags: ["3PF"] as const,
  owner: "engineering" as const,
  rationale_plain:
    "A third-party host received data about the visitor but is not in the tracker dataset. Under DPDP an unmapped purpose cannot lawfully continue: every processor needs a written contract (s.8(2)) and every independent use needs consent (s.6(1)).",
  rationale_dev:
    "A request to a third-party host with no dataset match was observed. Its purpose is unmapped, so no s.7 limb or consent can be evidenced for it. This is a prompt to add the host to the dataset with a documented classification.",
  remediation_summary: "Identify the host, classify it in the tracker dataset, and gate it behind consent or a documented s.7 limb.",
  explainer_url: "https://sentinel.vettam.ai/rules/UNMAPPED",
  penalty_band: "consent_notice",
};

export function mapScan(input: MapInput): ScanResult {
  const meta = findMeta(input.observations);
  const banner = findBanner(input.observations);
  const requests = input.observations.filter(
    (o): o is RequestObservation => o.type === "request",
  );
  const cookies = input.observations.filter(
    (o): o is CookieObservation => o.type === "cookie",
  );
  const storage = input.observations.filter(
    (o): o is StorageObservation => o.type === "storage",
  );

  const resolved = requests.map((r) => ({
    request: r,
    tracker: input.trackers.byRequest(r.host, r.path),
  }));

  const findings: Finding[] = [];
  const questions: Question[] = [];
  const seenQuestionRules = new Set<string>();

  for (const rule of input.rules) {
    const matches = evaluateRule(rule, input.observations, input.trackers, banner, meta);
    if (matches.length === 0) continue;
    const isQuestion = !rule.observable || rule.needs_input.length > 0;
    if (isQuestion) {
      if (seenQuestionRules.has(rule.id)) continue;
      seenQuestionRules.add(rule.id);
      questions.push(toQuestion(rule));
    } else {
      for (const m of matches) findings.push(toFinding(rule, m));
    }
  }

  // Built-in unmapped-host findings (one per unclassified third-party host).
  const unclassifiedHosts: string[] = [];
  for (const r of resolved) {
    if (r.request.is_third_party && !r.tracker && !unclassifiedHosts.includes(r.request.host)) {
      unclassifiedHosts.push(r.request.host);
      findings.push(unmappedFinding(r.request, meta));
    }
  }

  sortFindings(findings);

  const inventory = buildInventory(resolved, cookies, storage, input.observations, input.trackers);
  const summary = buildSummary(findings, inventory, banner);

  return {
    schema_version: SCHEMA_VERSION,
    engine_version: input.engineVersion,
    rules_version: input.rulesVersion,
    trackers_version: input.trackersVersion,
    interpretation_as_of: input.interpretationAsOf,
    scanned_at: meta?.scan_started_at ?? "",
    target: {
      url: meta?.url ?? "",
      final_url: meta?.final_url ?? "",
      page_language: meta?.page_language ?? "",
    },
    banner: bannerSummary(banner),
    inventory,
    findings,
    questions,
    summary,
    limits: defaultLimits(),
  };
}

function findMeta(obs: Observation[]): MetaObservation | undefined {
  return obs.find((o): o is MetaObservation => o.type === "meta");
}

function findBanner(obs: Observation[]): BannerObservation | undefined {
  return obs.find((o): o is BannerObservation => o.type === "banner");
}

interface RuleMatch {
  evidence: Evidence[];
  tracker: Tracker | undefined;
  detectionConfidence: "high" | "medium" | "low";
}

function evaluateRule(
  rule: Rule,
  obs: Observation[],
  trackers: TrackerIndex,
  banner: BannerObservation | undefined,
  meta: MetaObservation | undefined,
): RuleMatch[] {
  const where = rule.detection.where;
  if (rule.detection.match === "banner") {
    if (!banner) return [];
    if (evalBannerConditions(where, banner, meta)) {
      return [{ evidence: [], tracker: undefined, detectionConfidence: banner.detection_confidence }];
    }
    return [];
  }
  if (rule.detection.match === "request") {
    const matches: RuleMatch[] = [];
    const byTracker = new Map<string, Evidence[]>();
    for (const o of obs) {
      if (o.type !== "request") continue;
      const tracker = trackers.byRequest(o.host, o.path);
      if (!evalRequestConditions(where, o, tracker, banner)) continue;
      const key = tracker?.id ?? o.host;
      const list = byTracker.get(key) ?? [];
      list.push(o);
      byTracker.set(key, list);
    }
    for (const [trackerId, evidence] of byTracker) {
      const tracker = trackers.all().find((t) => t.id === trackerId);
      matches.push({ evidence, tracker, detectionConfidence: "high" });
    }
    return matches;
  }
  // cookie / storage / api_call / embed / meta matches: not used by v0.1 rules.
  return [];
}

function evalRequestConditions(
  where: Rule["detection"]["where"],
  o: RequestObservation,
  tracker: Tracker | undefined,
  banner: BannerObservation | undefined,
): boolean {
  if (where.tracker_category && tracker?.category !== where.tracker_category) return false;
  if (where.tracker_categories && (!tracker || !where.tracker_categories.includes(tracker.category))) return false;
  if (where.tracker_flags && (!tracker || !where.tracker_flags.some((f) => tracker.flags.includes(f)))) return false;
  if (where.before_banner_detected !== undefined && o.before_banner_detected !== where.before_banner_detected) return false;
  if (where.before_first_paint !== undefined && o.before_first_paint !== where.before_first_paint) return false;
  if (where.banner_detected !== undefined && (banner?.detected ?? false) !== where.banner_detected) return false;
  return true;
}

function evalBannerConditions(
  where: Rule["detection"]["where"],
  banner: BannerObservation,
  meta: MetaObservation | undefined,
): boolean {
  const checks: Array<[unknown | undefined, unknown]> = [
    [where.banner_detected, banner.detected],
    [where.has_accept, banner.has_accept],
    [where.has_reject, banner.has_reject],
    [where.has_settings, banner.has_settings],
    [where.has_pre_ticked, banner.has_pre_ticked],
    [where.has_language_switcher, banner.has_language_switcher],
    [where.mentions_legitimate_interest, banner.mentions_legitimate_interest],
    [where.implies_consent_by_browsing, banner.implies_consent_by_browsing],
    [where.page_language, meta?.page_language ?? ""],
  ];
  for (const [expected, actual] of checks) {
    if (expected !== undefined && actual !== expected) return false;
  }
  return true;
}

function toFinding(rule: Rule, m: RuleMatch): Finding {
  const tracker = m.tracker;
  const firstEvidence = m.evidence[0];
  return {
    id: `f_${rule.id}_${tracker?.id ?? "banner"}`.toLowerCase(),
    rule_id: rule.id,
    title: rule.title,
    certainty: rule.certainty,
    enforceable_from: rule.enforceable_from,
    observable: rule.observable,
    detection_confidence: m.detectionConfidence,
    provisions: rule.provisions,
    flags: rule.flags,
    owner: rule.owner,
    tracker: tracker ? { id: tracker.id, vendor: tracker.vendor, category: tracker.category } : null,
    attributed_to: attributeTo(firstEvidence),
    evidence: m.evidence,
    rationale_plain: rule.rationale_plain,
    rationale_dev: rule.rationale_dev,
    remediation_summary: rule.remediation_summary,
    explainer_url: rule.explainer_url,
    needs_input: rule.needs_input,
  };
}

function toQuestion(rule: Rule): Question {
  return {
    rule_id: rule.id,
    title: rule.title,
    prompt: rule.prompt ?? defaultPrompt(rule),
    certainty: rule.certainty,
    enforceable_from: rule.enforceable_from,
    provisions: rule.provisions,
    flags: rule.flags,
    owner: rule.owner,
    needs_input: rule.needs_input,
    fact_needed: rule.needs_input[0] ?? "",
    consequence_if_true: rule.remediation_summary,
    rationale_plain: rule.rationale_plain,
    explainer_url: rule.explainer_url,
  };
}

function unmappedFinding(o: RequestObservation, meta: MetaObservation | undefined): Finding {
  return {
    id: `f_unmapped_${o.host}`.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    rule_id: "UNMAPPED",
    title: "Unmapped third-party host",
    certainty: "settled",
    enforceable_from: UNMAPPED_RULE.enforceable_from,
    observable: true,
    detection_confidence: "high",
    provisions: UNMAPPED_RULE.provisions,
    flags: ["3PF"],
    owner: "engineering",
    tracker: null,
    attributed_to: attributeTo(o),
    evidence: [o],
    rationale_plain: UNMAPPED_RULE.rationale_plain,
    rationale_dev: UNMAPPED_RULE.rationale_dev,
    remediation_summary: UNMAPPED_RULE.remediation_summary,
    explainer_url: UNMAPPED_RULE.explainer_url,
    needs_input: [],
  };
}

function attributeTo(o: Evidence | undefined): string {
  if (!o) return "the consent banner";
  if (o.initiator_host) return `a tag loaded via ${o.initiator_host}`;
  return `the page at ${hostOf(o.host)}`;
}

function defaultPrompt(rule: Rule): string {
  const fact = rule.needs_input[0];
  if (fact === "reaches_minors") return "Does this site reach people under 18?";
  return fact ? `Confirm: ${fact}` : rule.title;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function sortFindings(findings: Finding[]): void {
  const order = ["settled", "arguable", "open"];
  findings.sort((a, b) => {
    const c = order.indexOf(a.certainty) - order.indexOf(b.certainty);
    if (c !== 0) return c;
    return a.rule_id.localeCompare(b.rule_id);
  });
}

function buildInventory(
  resolved: Array<{ request: RequestObservation; tracker: Tracker | undefined }>,
  cookies: CookieObservation[],
  storage: StorageObservation[],
  obs: Observation[],
  trackers: TrackerIndex,
) {
  const thirdPartyHosts = resolved
    .filter((r) => r.request.is_third_party)
    .map((r) => ({
      host: r.request.host,
      tracker_id: r.tracker?.id ?? null,
      category: r.tracker?.category ?? ("UNCLASSIFIED" as const),
      country: r.request.destination_country,
      first_seen_ms: r.request.timestamp_ms,
      before_banner: r.request.before_banner_detected,
    }));
  const fingerprinting = obs.filter((o) => o.type === "api_call");
  const unclassified = resolved
    .filter((r) => r.request.is_third_party && !r.tracker)
    .map((r) => r.request.host);
  return {
    cookies,
    storage,
    third_party_hosts: thirdPartyHosts,
    fingerprinting_apis: fingerprinting,
    unclassified_hosts: Array.from(new Set(unclassified)),
  };
}

function bannerSummary(banner: BannerObservation | undefined) {
  const base = {
    detected: false,
    confidence: "medium" as const,
    has_accept: false,
    has_reject: false,
    has_settings: false,
    has_pre_ticked: false,
    has_language_switcher: false,
    mentions_legitimate_interest: false,
    implies_consent_by_browsing: false,
  };
  if (!banner) return base;
  return {
    ...base,
    detected: banner.detected,
    confidence: banner.detection_confidence,
    has_accept: banner.has_accept,
    has_reject: banner.has_reject,
    has_settings: banner.has_settings,
    has_pre_ticked: banner.has_pre_ticked,
    has_language_switcher: banner.has_language_switcher,
    mentions_legitimate_interest: banner.mentions_legitimate_interest,
    implies_consent_by_browsing: banner.implies_consent_by_browsing,
  };
}

function buildSummary(
  findings: Finding[],
  inventory: { third_party_hosts: Array<{ host: string; country: string; before_banner: boolean }> },
  banner: BannerObservation | undefined,
) {
  const byCertainty = { settled: 0, arguable: 0, open: 0 };
  for (const f of findings) byCertainty[f.certainty]++;
  const hosts = inventory.third_party_hosts;
  const uniqueHosts = new Set(hosts.map((h) => h.host));
  const outsideIndia = new Set(
    hosts.filter((h) => h.country && h.country !== "IN").map((h) => h.host),
  );
  const firedBefore = new Set(
    hosts.filter((h) => h.before_banner && (banner?.detected ?? false)).map((h) => h.host),
  );
  return {
    by_certainty: byCertainty,
    third_parties: uniqueHosts.size,
    third_parties_outside_india: outsideIndia.size,
    fired_before_banner: firedBefore.size,
  };
}

function defaultLimits(): string[] {
  return [
    "Server-side tagging, backend relays, logs and retention are not observable by a crawler.",
    "Consent-banner interaction was not performed; findings reflect the page state before any user action.",
    "This is a reading of the DPDP Act and Rules, not legal advice and not a compliance verdict.",
  ];
}
