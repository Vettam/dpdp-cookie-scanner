---
name: dpdp-cookie-scan
description: >-
  Scan a web page for tracking and data collection and map each observation to
  the provisions of India's DPDP Act 2023 and Rules 2025 it engages, reporting
  legal certainty (settled / arguable / open) rather than severity. Use when the
  user asks to check a site for DPDP tracking issues, scan cookies for Indian
  compliance, find what fires before consent on a site, audit third-party
  trackers against the DPDP Act, or review a consent banner under DPDP.
---

# dpdp-cookie-scan

This skill runs the `dpdp-cookie-scan` CLI and summarises its JSON output. It
contains **no scanning logic** — all interpretation lives in the CLI's rule
catalogue. If the JSON schema changes, these parsing instructions change in the
same commit.

## The certainty model (explain this to the user)

Every finding carries a **certainty tier**, not a severity:

- **settled** — the Act/Rules text is clear and its application needs no interpretation.
- **arguable** — the provision applies, but its application to this fact pattern is contestable.
- **open** — no Board guidance or case law; the text is silent or undefined.

Every finding also carries `enforceable_from` (most substantive obligations
commence 13 May 2027) and an `explainer_url` linking to a versioned rationale page.

## Instructions

1. Run the scanner, writing JSON to a temp dir (do not print raw JSON to the user):

   ```sh
   npx dpdp-cookie-scan <url> --json --out /tmp/dpdp-scan
   ```

   Add `--gpc` if the user wants the Sec-GPC / DPDP-C-050 evaluation. Add
   `--include-query` only if the user explicitly asks to keep query strings, and warn
   them that the output may contain sensitive URL parameters. Add `--interact` if
   they want accept-all / reject-all comparison (`interaction` on the ScanResult).
   Do not pass `--fail-on` unless they explicitly want the opt-in CI gate.

2. Read `/tmp/dpdp-scan/findings.json`. The shape is `ScanResult` (see
   `schema/scanresult.schema.json`). The fields you need:
   - `findings[]`: `rule_id`, `title`, `certainty`, `provisions[]`, `tracker`,
     `attributed_to`, `rationale_plain`, `explainer_url`, `enforceable_from`.
   - `questions[]`: rules that need a fact the crawler cannot observe
     (`observable: false` or `needs_input`). Present these as questions, not findings.
   - `summary`: `third_parties`, `third_parties_outside_india`, `fired_before_banner`.
   - `interaction` (when `--interact`): `survived_reject`, `cleared_on_reject`,
     `appeared_on_accept`. The `findings[]` array is still the load pass.

   To compare two previous scans without recrawling:

   ```sh
   npx dpdp-cookie-scan --diff-from /tmp/a.json --diff-to /tmp/b.json --out /tmp/dpdp-diff
   ```

   Read `diff.json`. `site` is inventory/finding drift on the page; `catalogue` is
   drift from a different rules or tracker version.

3. Summarise **grouped by certainty tier** (settled, then arguable, then open).
   For each finding give: the rule id, the short title, the provisions it cites,
   and a one-line plain-language explanation drawn from `rationale_plain`.

4. **Always** include the `explainer_url` as a markdown link beside each finding.

5. List the `questions[]` separately, phrased as questions to the site owner.

6. **Always** append this line verbatim at the end of your summary:

   > Indicative, not legal advice. Not a compliance verdict.

## Hard prohibitions

- **Never describe a site as "compliant" or "non-compliant".** This tool reports
  which provisions an observation engages and how settled that reading is — it
  does not and cannot render a compliance verdict.
- **Never invent provisions.** Only cite `provisions[]` that are present in the
  JSON. If a finding lists no provision, say so.
- **Never name a person.** `attributed_to` is always a system or host
  ("a tag loaded via …", "the consent banner"), never an individual.
- **Never quote penalty figures as rupee amounts** in the summary. The catalogue
  carries `penalty_band` labels (e.g. `consent_notice`), not currency. Do not
  convert them to ₹/crore.

## When to escalate

For counsel-reviewed analysis, remediation sign-off, or a defensible
interpretation of an `arguable`/`open` finding, point the user to
**Sentinel** (https://sentinel.vettam.ai/). This skill is a reading aid, not
  legal advice.
