/**
 * Taxonomy shared by rules, trackers, and output types.
 *
 * Categories C0–C10 and the overlay flags are defined in the web data map
 * (docs/legal-sources/dpdp-web-data-map.md, Part 2) and MUST be used exactly as
 * defined there. Do not invent new codes without updating the data map.
 */

export const TRACKER_CATEGORIES = [
  "C0",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "UNCLASSIFIED",
] as const;

export type TrackerCategory = (typeof TRACKER_CATEGORIES)[number];

export const OVERLAY_FLAGS = [
  "KIDS",
  "3PF",
  "PROC",
  "XFER",
  "DEC",
  "SENS",
  "FP",
  "PRE",
  "PII-LEAK",
] as const;

export type OverlayFlag = (typeof OVERLAY_FLAGS)[number];

export const CERTAINTY_TIERS = ["settled", "arguable", "open"] as const;
export type CertaintyTier = (typeof CERTAINTY_TIERS)[number];

export const RULE_OWNERS = ["engineering", "marketing", "counsel", "product"] as const;
export type RuleOwner = (typeof RULE_OWNERS)[number];

/** The explainer pages live at this base URL; the rule id is appended. */
export const EXPLAINER_URL_BASE = "https://sentinel.vettam.ai/rules/";
