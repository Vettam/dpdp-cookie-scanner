import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CERTAINTY_TIERS, OVERLAY_FLAGS, RULE_OWNERS, TRACKER_CATEGORIES } from "./taxonomy.js";

/**
 * Core data types: Observation[], Finding, Question, ScanResult.
 * Observation is what the engine records (facts). Finding/Question is what the
 * mapper produces (interpretation). They are kept separate so the facts can be
 * trusted independently of the reading (spec §1.5).
 */

export const ObservationBase = z.object({
  timestamp_ms: z.number().int().min(0),
  before_first_paint: z.boolean(),
  before_banner_detected: z.boolean(),
});

export const CookieObservation = ObservationBase.extend({
  type: z.literal("cookie"),
  name: z.string(),
  domain: z.string(),
  path: z.string().default("/"),
  expires: z.number().int().nullable().default(null),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  sameSite: z.string().default(""),
  first_party: z.boolean(),
  set_by: z.string().default(""),
});

export const StorageObservation = ObservationBase.extend({
  type: z.literal("storage"),
  kind: z.enum(["local", "session", "indexeddb"]),
  key: z.string(),
  first_party: z.boolean(),
});

export const RequestObservation = ObservationBase.extend({
  type: z.literal("request"),
  method: z.string().default("GET"),
  host: z.string(),
  path: z.string().default("/"),
  initiator_host: z.string().default(""),
  resource_type: z.string().default(""),
  is_third_party: z.boolean(),
  destination_country: z.string().default(""),
});

export const ApiCallObservation = ObservationBase.extend({
  type: z.literal("api_call"),
  api: z.string(),
});

export const EmbedObservation = ObservationBase.extend({
  type: z.literal("embed"),
  host: z.string(),
  kind: z.enum(["iframe", "script", "img", "font"]),
  sri: z.boolean().default(false),
  is_third_party: z.boolean().default(false),
});

export const BannerObservation = ObservationBase.extend({
  type: z.literal("banner"),
  detected: z.boolean(),
  has_accept: z.boolean().default(false),
  has_reject: z.boolean().default(false),
  has_settings: z.boolean().default(false),
  has_pre_ticked: z.boolean().default(false),
  has_language_switcher: z.boolean().default(false),
  mentions_legitimate_interest: z.boolean().default(false),
  implies_consent_by_browsing: z.boolean().default(false),
  text_excerpt: z.string().default(""),
  detection_confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export const MetaObservation = ObservationBase.extend({
  type: z.literal("meta"),
  url: z.string(),
  final_url: z.string().default(""),
  redirects: z.array(z.string()).default([]),
  page_language: z.string().default(""),
  title: z.string().default(""),
  scan_started_at: z.string(),
  engine_version: z.string(),
  rules_version: z.string(),
  trackers_version: z.string(),
  geo_source: z.string().default(""),
  geo_date: z.string().default(""),
  gpc_sent: z.boolean().default(false),
  /** Set on accept/reject passes: which control we tried to click. */
  banner_action: z.string().default(""),
  /** True only when that control was found and clicked. */
  banner_action_clicked: z.boolean().default(false),
});

export const Observation = z.discriminatedUnion("type", [
  CookieObservation,
  StorageObservation,
  RequestObservation,
  ApiCallObservation,
  EmbedObservation,
  BannerObservation,
  MetaObservation,
]);
export type Observation = z.infer<typeof Observation>;

export type CookieObservation = z.infer<typeof CookieObservation>;
export type StorageObservation = z.infer<typeof StorageObservation>;
export type RequestObservation = z.infer<typeof RequestObservation>;
export type ApiCallObservation = z.infer<typeof ApiCallObservation>;
export type EmbedObservation = z.infer<typeof EmbedObservation>;
export type BannerObservation = z.infer<typeof BannerObservation>;
export type MetaObservation = z.infer<typeof MetaObservation>;

export const TrackerRef = z.object({
  id: z.string(),
  vendor: z.string(),
  category: z.enum(TRACKER_CATEGORIES),
});
export type TrackerRef = z.infer<typeof TrackerRef>;

/** Evidence attached to a finding: the observation(s) that triggered it (a request, cookie, or api call). */
export const Evidence = Observation;
export type Evidence = z.infer<typeof Evidence>;

export const Finding = z.object({
  id: z.string(),
  rule_id: z.string(),
  title: z.string(),
  certainty: z.enum(CERTAINTY_TIERS),
  enforceable_from: z.string(),
  observable: z.boolean(),
  detection_confidence: z.enum(["high", "medium", "low"]).default("medium"),
  provisions: z.array(z.string()),
  flags: z.array(z.enum(OVERLAY_FLAGS)).default([]),
  owner: z.enum(RULE_OWNERS),
  tracker: TrackerRef.nullable(),
  attributed_to: z.string(),
  evidence: z.array(Evidence).default([]),
  rationale_plain: z.string(),
  rationale_dev: z.string(),
  remediation_summary: z.string().default(""),
  explainer_url: z.string().url(),
  needs_input: z.array(z.string()).default([]),
});
export type Finding = z.infer<typeof Finding>;

export const Question = z.object({
  rule_id: z.string(),
  title: z.string(),
  prompt: z.string(),
  certainty: z.enum(CERTAINTY_TIERS),
  enforceable_from: z.string(),
  provisions: z.array(z.string()),
  flags: z.array(z.enum(OVERLAY_FLAGS)).default([]),
  owner: z.enum(RULE_OWNERS),
  needs_input: z.array(z.string()),
  fact_needed: z.string(),
  consequence_if_true: z.string(),
  rationale_plain: z.string(),
  explainer_url: z.string().url(),
});
export type Question = z.infer<typeof Question>;

export const Target = z.object({
  url: z.string(),
  final_url: z.string().default(""),
  page_language: z.string().default(""),
});
export type Target = z.infer<typeof Target>;

export const BannerSummary = z.object({
  detected: z.boolean().default(false),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  has_accept: z.boolean().default(false),
  has_reject: z.boolean().default(false),
  has_settings: z.boolean().default(false),
  has_pre_ticked: z.boolean().default(false),
  has_language_switcher: z.boolean().default(false),
  mentions_legitimate_interest: z.boolean().default(false),
  implies_consent_by_browsing: z.boolean().default(false),
});
export type BannerSummary = z.infer<typeof BannerSummary>;

export const ThirdPartyHost = z.object({
  host: z.string(),
  tracker_id: z.string().nullable(),
  category: z.enum(TRACKER_CATEGORIES),
  country: z.string().default(""),
  first_seen_ms: z.number().int().min(0),
  before_banner: z.boolean(),
});
export type ThirdPartyHost = z.infer<typeof ThirdPartyHost>;

export const Inventory = z.object({
  cookies: z.array(CookieObservation).default([]),
  storage: z.array(StorageObservation).default([]),
  third_party_hosts: z.array(ThirdPartyHost).default([]),
  fingerprinting_apis: z.array(ApiCallObservation).default([]),
  unclassified_hosts: z.array(z.string()).default([]),
});
export type Inventory = z.infer<typeof Inventory>;

export const Summary = z.object({
  by_certainty: z.object({
    settled: z.number().int().min(0).default(0),
    arguable: z.number().int().min(0).default(0),
    open: z.number().int().min(0).default(0),
  }),
  third_parties: z.number().int().min(0).default(0),
  third_parties_outside_india: z.number().int().min(0).default(0),
  fired_before_banner: z.number().int().min(0).default(0),
});
export type Summary = z.infer<typeof Summary>;

/** Compact finding identity used in interaction comparison and scan diffs. */
export const FindingPresence = z.object({
  rule_id: z.string(),
  tracker_id: z.string().nullable(),
  host: z.string().default(""),
  certainty: z.enum(CERTAINTY_TIERS),
  title: z.string(),
});
export type FindingPresence = z.infer<typeof FindingPresence>;

/**
 * Comparison of load vs accept-all vs reject-all (spec §4.1 / §9 v1.0).
 * The ScanResult findings array remains the load pass.
 */
export const Interaction = z.object({
  performed: z.boolean().default(false),
  accept_clicked: z.boolean().default(false),
  reject_clicked: z.boolean().default(false),
  accept_findings: z.number().int().min(0).default(0),
  reject_findings: z.number().int().min(0).default(0),
  survived_reject: z.array(FindingPresence).default([]),
  cleared_on_reject: z.array(FindingPresence).default([]),
  appeared_on_accept: z.array(FindingPresence).default([]),
});
export type Interaction = z.infer<typeof Interaction>;

export const emptyInteraction = (): Interaction => ({
  performed: false,
  accept_clicked: false,
  reject_clicked: false,
  accept_findings: 0,
  reject_findings: 0,
  survived_reject: [],
  cleared_on_reject: [],
  appeared_on_accept: [],
});

export const ScanResult = z.object({
  schema_version: z.string(),
  engine_version: z.string(),
  rules_version: z.string(),
  trackers_version: z.string(),
  interpretation_as_of: z.string(),
  scanned_at: z.string(),
  target: Target,
  banner: BannerSummary.default({}),
  inventory: Inventory.default({}),
  findings: z.array(Finding).default([]),
  questions: z.array(Question).default([]),
  summary: Summary,
  limits: z.array(z.string()).default([]),
  interaction: Interaction.default({
    performed: false,
    accept_clicked: false,
    reject_clicked: false,
    accept_findings: 0,
    reject_findings: 0,
    survived_reject: [],
    cleared_on_reject: [],
    appeared_on_accept: [],
  }),
});
export type ScanResult = z.infer<typeof ScanResult>;

export const ScanDiffSide = z.object({
  scanned_at: z.string().default(""),
  rules_version: z.string(),
  trackers_version: z.string(),
  interpretation_as_of: z.string(),
  target_url: z.string().default(""),
});
export type ScanDiffSide = z.infer<typeof ScanDiffSide>;

export const FindingReclassified = z.object({
  rule_id: z.string(),
  tracker_id: z.string().nullable(),
  host: z.string().default(""),
  from_certainty: z.enum(CERTAINTY_TIERS),
  to_certainty: z.enum(CERTAINTY_TIERS),
});
export type FindingReclassified = z.infer<typeof FindingReclassified>;

/**
 * Diff of two ScanResults (spec §9 v1.0). Site changes are inventory/finding
 * shifts on the page; catalogue changes are shifts attributable to a different
 * rules or tracker dataset version.
 */
export const ScanResultDiff = z.object({
  schema_version: z.literal("1.0.0"),
  from: ScanDiffSide,
  to: ScanDiffSide,
  catalogue_changed: z.boolean(),
  site: z.object({
    hosts_added: z.array(z.string()).default([]),
    hosts_removed: z.array(z.string()).default([]),
    findings_added: z.array(FindingPresence).default([]),
    findings_removed: z.array(FindingPresence).default([]),
  }),
  catalogue: z.object({
    findings_added: z.array(FindingPresence).default([]),
    findings_removed: z.array(FindingPresence).default([]),
    findings_reclassified: z.array(FindingReclassified).default([]),
  }),
});
export type ScanResultDiff = z.infer<typeof ScanResultDiff>;

/** JSON Schema (draft-07) for the published ScanResult. Published at schema/scanresult.schema.json. */
export function scanResultJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(ScanResult) as Record<string, unknown>;
}

/** JSON Schema (draft-07) for ScanResultDiff. Published at schema/scanresult-diff.schema.json. */
export function scanResultDiffJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(ScanResultDiff) as Record<string, unknown>;
}
