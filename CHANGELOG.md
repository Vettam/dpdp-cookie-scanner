# dpdp-cookie-scanner

## 0.3.0

### Minor Changes

- b1b2161: Finish the v0.3 remaining items: bundled DB-IP Lite geo, Indian vendor coverage, and the community contribution guide.
  
  - Offline IP-to-country: packed DB-IP Lite (CC BY 4.0, 2026-09) in `data/geo/`. The engine stamps `destination_country` from CDP `remoteIPAddress` with no extra network call. Unclassified hosts no longer stay empty when an IP was observed.
  - Tracker dataset 0.2.0: Indian-priority vendors (Cashfree, CCAvenue, Instamojo, Juspay, Paytm, VWO, PushEngage, Netcore Smartech, Zoho SalesIQ/PageSense, Freshdesk, Freshmarketer, InMobi, Media.net, Cuelinks, ConvertCart, NotifyVisitors) on top of the v0.1 seed.
  - `CONTRIBUTING.md` for public contributors; `docs/contributing-rules.md` remains the legal-content review bar.

## 0.2.0

### Minor Changes

- d7870a6: Release the hedged certainty tiers (arguable and open) and the v0.3 rule
  catalogue (rules/VERSION → 0.3.0).
  
  ## Arguable tier (new rules)
  - DPDP-C-010 — analytics tracker (C4) fires before consent (s.17(2)(b) statistics exemption competes).
  - DPDP-C-015 — external font/CDN request discloses visitor IP (s.8(2) processor contract is unobservable).
  - DPDP-C-030 — pseudonymous client identifier (_ga, _fbp, IDE, …) treated as personal data (s.2(t) "in relation to").
  - DPDP-C-031 — first-party cookie relies on an unstated s.7(a) basis (no strictly-necessary exemption under DPDP).
  - DPDP-C-060 — fingerprinting API calls observed (s.6(1), s.6(4)); engine now instruments canvas/audio/WebGL/WebRTC.
  - DPDP-C-061 — cookie missing Secure / HttpOnly / SameSite (Rule 6(1) reasonable security safeguards, inferred).
  - DPDP-C-062 — third-party <script> without Subresource Integrity (Rule 6(1)(g), inferred); engine now parses script tags for the integrity attribute.
  
  ## Open tier (new rules)
  - DPDP-C-020 — third-party endpoint resolves outside India. **Not a contravention**: s.16 permits transfer unless the destination is notified. The corrective rule against the GDPR-trained "cross-border = problem" assumption.
  - DPDP-C-041 — access logs as "traffic data" under the one-year retention floor (Rule 8(3)). "Traffic data" is undefined; emitted as a standing question for counsel.
  
  ## Tier correction
  - DPDP-C-050 (Sec-GPC) corrected from `arguable` to `open` to match the authoritative tier table in spec §5.3 (DPDP is silent on browser signals; no Board guidance).
  
  ## Mapper / engine
  - New `where` predicates: `is_third_party`, `destination_country`, `destination_country_not`, `cookie_name` (regex), `cookie_insecure`, `first_party`, `api` (regex), `embed_kind`, `sri`.
  - `observable: false` rules are now standing questions (always asked); `observable: true` with `needs_input` rules remain contingent questions (C-040 corrected to `observable: true`).
  - New `cookie`, `api_call`, and `embed` match branches in the mapper; `Evidence` is now the observation union so cookie/api/embed findings carry their own evidence.
  - Engine instruments fingerprinting APIs via `addInitScript` and records third-party script embeds with their SRI state.
