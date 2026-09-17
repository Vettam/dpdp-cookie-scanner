# dpdp-cookie-scanner

> A scanner that loads a web page in a headless browser, records everything the
> page collects about a visitor, and maps each observation to the provisions of
> India's **Digital Personal Data Protection Act 2023** and **DPDP Rules 2025**
> that it engages — reporting **how settled the law is**, not how severe the
> tracker is.

India has no cookie law. The entire relevance of a cookie scan under DPDP
rests on an inference chain: a tracker collects data → that data identifies a
person → processing personal data needs a lawful basis → DPDP's lawful bases
are a closed list (consent, or s.7) → so most trackers need consent, which
must be preceded by notice and be a clear affirmative act. Some links in that
chain are settled, some are arguable, some nobody knows yet. **This tool's job
is to show you which is which.** That interpretation layer is the product; the
scanning engine is commodity.

## The certainty model

Every finding carries a **certainty tier** (interpretive confidence) and an
**enforceability date** (temporal status). There is no severity field.

| Tier | Meaning |
|---|---|
| `settled` | The text of the Act or Rules is clear and its application needs no interpretation. |
| `arguable` | The provision applies, but its application to this fact pattern is contestable. |
| `open` | No Board guidance, no case law, the text is silent; resolved by future orders. |

Most substantive obligations commence **13 May 2027**. A finding whose rule is
not yet enforceable is still reported; the date is shown beside it.

## What it is — and is not

- **Not an enforcement gate.** It surfaces risk; it never blocks a build. Exit
  code is `0` on any successful scan.
- **Not a consent manager.** It does not fix anything.
- **Not a compliance verdict.** It never says a site "is" or "is not"
  compliant. That judgement, with counsel review, is the paid Sentinel product.
- **Not a static analyser.** It observes a running page; it does not read
  source code.

## Install / run

```bash
npx dpdp-cookie-scanner <url> [options]
```

Detects an existing system Chrome/Edge and uses it; downloads Chromium only as
a fallback (with a one-time message). No outbound network calls other than the
target URL and its subresources — no telemetry, no update checks, no remote
rule fetching.

```
  --json                 write findings.json (default in --ci)
  --md                   write findings.md
  --out <dir>            output directory (default ./dpdp-scan)
  --ci                   machine mode: no colour, no spinner, JSON always, exit 0
  --gpc                  send Sec-GPC: 1 and evaluate DPDP-C-050
  --include-query        keep query strings in request evidence (prints a warning)
  --screenshot           save a viewport screenshot alongside output
  --timeout <ms>         navigation timeout (default 15000)
  --settle <ms>          post-load settle wait (default 3000)
  --rules-version        print catalogue version and exit
  --browser <path>       use a specific Chrome/Edge/Chromium binary
```

Exit codes: `0` completed scan · `2` usage error · `3` navigation failure.
There is **no** exit code for "findings present".

## Notice content checks

The scanner captures the inventory and the consent banner; it does **not**
check the published notice's text. That is `dpdp-notice-lint` (v0.2), a
separate command that checks a notice against DPDP **Rule 3** — itemisation of
each observed tracker (bridged via the tracker dataset's `notice_itemisation`
field), a withdrawal mechanism (s.6(4)), a grievance officer (Rule 3), and
English + Hindi text:

```bash
npx dpdp-notice-lint <notice-url-or-file> [--scan ./dpdp-scan/findings.json] [--json] [--ci]
```

Pass `--scan` a `findings.json` from `dpdp-cookie-scan` to drive per-tracker
itemisation checks against what the scan actually observed.

## Agent skill

`skill/SKILL.md` is a Cursor/agent skill that runs the CLI and summarises the
`ScanResult` grouped by certainty — for "check this site for DPDP tracking
issues" style prompts. It contains no scanning logic; if the JSON schema
changes, the skill's parsing instructions change in the same commit.

## Architecture

One engine, many surfaces. The core is a library: `scan(url, options)` returns
a `ScanResult`. The CLI, CI mode, and agent skill are thin renderers over the
same `ScanResult`. Observation (facts) and interpretation (rules) are kept in
separate modules so the facts can be trusted independently of the reading.

```
Surfaces (CLI / --ci / skill)  →  Mapper  →  Engine (Playwright)
                                  ↑            ↑
                          rules/*.yaml   trackers/*.yaml
```

## Licensing

- **Code:** Apache-2.0 (see `LICENSE`, `NOTICE`).
- **`trackers/` dataset:** CC BY-SA 4.0 (see `trackers/LICENSE`).
- **Rule rationale text and explainer pages:** CC BY-ND 4.0, owned by Rylematic
  Technologies Private Limited.
- **IP-to-country dataset:** DB-IP Lite, CC BY 4.0 (see `trackers/PROVENANCE.md`).

## Trademarks

"Sentinel" and "Vettam" are names and marks of Rylematic Technologies Private
Limited. The code grant under the Apache-2.0 licence does **not** extend to
these trademarks. Forks and derivative works may not use the "Sentinel" or
"Vettam" names, logos, or marks — in the project name, package name, domain,
or marketing — to present themselves as the official, endorsed, or affiliated
tool. Choose your own name.

## Status

v0.1 — "sharp and narrow": settled-tier rules only, baseline scan (no banner
interaction), terminal + JSON output. See `docs/` for the product spec, the
provision-by-provision guide, and the web-data map that grounds every rule.

v0.2 — "reach": markdown renderer, `--ci` mode, `--gpc` flag and rule C-050
(arguable tier), the `/skill/SKILL.md` agent skill, and the separate
`dpdp-notice-lint` command for Rule 3 notice-content checks.

v0.3 — "the hedged tiers": arguable and open rules released. Arguable tier
adds C-010 (analytics before consent), C-015 (font/CDN IP disclosure),
C-030 (pseudonymous IDs as personal data), C-031 (first-party cookies need a
stated s.7(a) basis), C-060 (fingerprinting API calls), C-061 (insecure
cookie flags), and C-062 (third-party scripts without SRI). Open tier adds
C-020 (cross-border transfer — *not* a contravention, the corrective rule)
and C-041 (access logs as "traffic data", a standing question). C-050's
tier is corrected from arguable to open to match spec §5.3. The engine now
instruments fingerprinting APIs and parses `<script>` tags for SRI.

---

*This tool reports risk under the DPDP Act and Rules. It is not legal advice
and does not state that any site is or is not compliant.*
