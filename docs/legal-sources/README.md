# Legal sources

Primary texts of India's Digital Personal Data Protection Act and Rules, plus
the project's reading of them. These files are the legal grounding for every
rule in `rules/`.

Where the spec and the web data map disagree on legal content, the web data
map wins. Where they disagree on product shape, the spec wins. Where any of
those disagree with a Gazette PDF in this directory, **the Gazette wins**.

## Official texts (Gazettes)

Copies of public documents of the Government of India. Rule PRs that cite a
provision must be checkable against these files.

| File | Instrument | Citation |
|---|---|---|
| [`DPDP Act 2023.pdf`](DPDP%20Act%202023.pdf) | Digital Personal Data Protection Act, 2023 | Act 22 of 2023 (11 August 2023) |
| [`DPDP Rules 2025.pdf`](DPDP%20Rules%202025.pdf) | Digital Personal Data Protection Rules, 2025 | G.S.R. 846(E), 13 November 2025 |
| [`DPDP Rules 2025 Corrigendum.pdf`](DPDP%20Rules%202025%20Corrigendum.pdf) | Corrigenda to the Rules | G.S.R. 892(E), 10 December 2025 |
| [`DPDP Enforcement Timeline.pdf`](DPDP%20Enforcement%20Timeline.pdf) | Commencement notification | G.S.R. 843(E), 13 November 2025 |

`DPDP Enforcement Timeline.pdf` is the Gazette commencement notification
(G.S.R. 843(E)), not a secondary timeline graphic. Tranche dates used in the
rule catalogue (`enforceable_from`) come from this instrument.

## Project readings

- [`dpdp-web-data-map.md`](dpdp-web-data-map.md) — engineering reference mapping web data collection to the Act and Rules. **Primary source for the rule catalogue and tracker categories** (Parts 2–6).
- [`dpdp-guide.md`](dpdp-guide.md) — provision-by-provision guide to the Act.
- [`spec.md`](spec.md) — product specification (what to build, not a legal source).
