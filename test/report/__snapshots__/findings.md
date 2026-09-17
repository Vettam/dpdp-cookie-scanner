# dpdp-cookie-scan — staging.acme.in

> Interpretation as of 2026-09-15. Indicative, not legal advice. Not a compliance verdict.

**2 third parties · 2 outside India · 2 fired before the banner.**

## SETTLED (5) — enforceable 2027-05-13

<details><summary><b>DPDP-C-001</b> — Meta Platforms (meta-pixel)</summary>

- **Certainty:** settled (enforceable 2027-05-13)
- **Provisions:** s.4(1), s.5(1), s.6(1)
- **Owner:** engineering
- **Attributed to:** a tag loaded via www.googletagmanager.com
- **Rationale:** A request to a C6 vendor was observed before any consent banner was detected (or before any interaction, once interaction scans are enabled). s.6(1) requires a clear affirmative act before processing; s.5(1) requires notice to precede or accompany the consent request. Firing on page load satisfies neither. The vendor is an independent or joint Data Fiduciary for this disclosure (s.2(i)), so s.11(1)(b) also requires it to be named.

- **Remediation:** Gate the tag behind a consent signal so it does not load until an affirmative act is recorded.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-001

| host | path | before banner | country |
|---|---|---|---|
| www.facebook.com | /tr | true | US |

</details>

<details><summary><b>DPDP-C-004</b> — Banner has an accept control but no equivalent reject control</summary>

- **Certainty:** settled (enforceable 2027-05-13)
- **Provisions:** s.6(1), s.6(4)
- **Owner:** engineering
- **Attributed to:** the consent banner
- **Rationale:** The banner exposes an accept control but no reject control. s.6(1) requires consent to be "free … unconditional"; s.6(4) requires withdrawal with ease comparable to giving. An asymmetric banner fails both.

- **Remediation:** Add a reject control of equal prominence to the accept control.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-004

</details>

<details><summary><b>DPDP-C-007</b> — Hotjar (hotjar)</summary>

- **Certainty:** settled (enforceable 2027-05-13)
- **Provisions:** s.6(1), s.9(3)
- **Owner:** engineering
- **Attributed to:** a tag loaded via www.googletagmanager.com
- **Rationale:** A request to a C5 (session replay / heatmap) vendor was observed before any consent banner was detected. s.6(1) requires a clear affirmative act before processing. Where the site plausibly reaches under-18s, s.9(3) prohibits behavioural monitoring entirely (see DPDP-C-040).

- **Remediation:** Gate the session-replay / heatmap tag behind a consent signal; on a site reaching minors, do not load it at all.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-007

| host | path | before banner | country |
|---|---|---|---|
| static.hotjar.com | /c/hotjar.js | true | US |

</details>

<details><summary><b>DPDP-C-009</b> — No language option beyond English in the notice or banner</summary>

- **Certainty:** settled (enforceable 2027-05-13)
- **Provisions:** s.5(3), s.6(3)
- **Owner:** counsel
- **Attributed to:** the consent banner
- **Rationale:** No language switcher was detected on the banner and the page language is English. s.5(3) and s.6(3) require the option of English or any Eighth Schedule language. This is a heuristic — a site may offer language choice elsewhere — so detection confidence is marked accordingly and the finding is phrased as "we could not find".

- **Remediation:** Offer the notice in English plus at least the relevant Eighth Schedule languages, with a visible language control.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-009

</details>

<details><summary><b>DPDP-C-013</b> — Hotjar (hotjar)</summary>

- **Certainty:** settled (enforceable 2027-05-13)
- **Provisions:** s.6(1)
- **Owner:** engineering
- **Attributed to:** a tag loaded via www.googletagmanager.com
- **Rationale:** A request to a C5 vendor was observed. Behavioural monitoring requires consent (s.6(1)); where children are reachable it is prohibited regardless of consent (s.9(3), see DPDP-C-040). This finding flags presence; the pre-consent variant is DPDP-C-007.

- **Remediation:** Confirm the tool is consent-gated and does not record before the affirmative act; mask sensitive fields by default.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-013

| host | path | before banner | country |
|---|---|---|---|
| static.hotjar.com | /c/hotjar.js | true | US |

</details>

## QUESTIONS (1)

### DPDP-C-040 — If this site reaches under-18s, switch off C5 (behavioural monitoring) and C6 (targeted advertising) for those users; consent does not cure it.


- **Provisions:** s.9(3)
- **If true:** If this site reaches under-18s, switch off C5 (behavioural monitoring) and C6 (targeted advertising) for those users; consent does not cure it.

- **Rationale:** Tracking, behavioural monitoring and targeted advertising directed at children are prohibited under DPDP, and consent cannot lift that prohibition. Whether a site reaches people under 18 is something a crawler cannot see — so this is a question for you, not a finding from the scan.

- **Explainer:** https://sentinel.vettam.ai/rules/DPDP-C-040

## Limits

- Server-side tagging, backend relays, logs and retention are not observable by a crawler.
- Consent-banner interaction was not performed; findings reflect the page state before any user action.
- This is a reading of the DPDP Act and Rules, not legal advice and not a compliance verdict.
