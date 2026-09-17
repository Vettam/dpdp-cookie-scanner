# The DPDP Act 2023 + Rules 2025: A Provision-by-Provision Guide for People Who Build Software

*Based on: DPDP Act 2023 (Act 22 of 2023) · DPDP Rules 2025 (G.S.R. 846(E), 13 Nov 2025) · Corrigendum (G.S.R. 892(E), 10 Dec 2025) · Commencement notification (G.S.R. 843(E), 13 Nov 2025)*

---

## Part 0 — The clock: when does any of this actually bite?

This matters more than anything else, because it tells you what you must do now versus what you can architect toward.

The Act was passed in August 2023 but had no commencement date. G.S.R. 843(E) of 13 November 2025 finally supplied one, in three tranches. The Rules mirror it exactly (Rule 1(2)–(4)).

**Tranche 1 — live now (from 13 Nov 2025)**

| Act | Rules |
|---|---|
| s.1(2), s.2 (definitions) | Rules 1, 2 |
| ss.18–26 (constitution of the Data Protection Board) | Rules 17–21 (Board appointments, salaries, meetings, digital office, staff) |
| ss.35, 38–43 (good-faith immunity, overriding effect, bar of civil jurisdiction, rule-making, amending the Schedule) | |
| s.44(1) and (3) | |

s.44(1) amends the TRAI Act to make TDSAT the appellate tribunal under DPDP. s.44(3) rewrites s.8(1)(j) of the RTI Act so that *all* personal information is exempt from disclosure — a quietly significant change to transparency law that took effect immediately.

**Tranche 2 — 13 November 2026**

s.6(9) and s.27(1)(d) — Consent Manager registration and the Board's power to inquire into Consent Manager registration breaches. Rule 4 and the First Schedule.

*Why early?* So the Consent Manager ecosystem exists and is populated before the general consent obligations switch on a year later. Consent Managers can't be a compliance route if nobody is registered yet.

**Tranche 3 — 13 May 2027**

Everything substantive: ss.3–5, s.6(1)–(8) and (10), ss.7–17, the rest of s.27, ss.28–34, 36, 37, s.44(2). Rules 3, 5–16, 22, 23.

**What this means practically.** The Board legally exists today but cannot penalise you for a substantive breach until May 2027. You have roughly fifteen months from now. That is *not* generous for anyone with an existing product and an accumulated data estate, because several obligations (erasure clocks, log retention, consent re-collection for legacy users) require you to have been doing things correctly for a while before the switch flips.

---

## Part 1 — Does it apply to you at all? (ss.2, 3)

### s.3(a) — Territorial application

Applies to digital personal data processed in India, whether collected in digital form **or collected on paper and digitised later**. That second limb closes the obvious loophole of paper-first collection.

### s.3(b) — Extraterritorial reach

Applies to processing *outside* India if it's connected with offering goods or services to Data Principals *in* India. So a Delaware C-corp with Indian users is squarely in scope. Note what's missing compared to GDPR: there's no "monitoring behaviour" limb. Pure profiling of Indian users without offering them goods or services is arguably outside s.3(b) — a gap that will probably get litigated.

### s.3(c) — What's carved out

1. Personal or domestic processing by an individual.
2. Personal data **made publicly available by the Data Principal herself**, or by someone under a statutory obligation to publish it.

The second carve-out is broad and consequential. The Act's own illustration: someone blogging their views and putting personal data on social media takes that data outside the Act entirely. For anyone building on scraped or public-web data, this is the provision you'll be relying on — but note the limit: it must be the Data Principal who made it public, or a legal publication obligation. A third party leaking or republishing your data does not make it "publicly available" in this sense.

### The definitions that carry the weight (s.2)

- **"Personal data"** (s.2(t)): any data about an individual who is identifiable by or in relation to that data. Deliberately broad, and — critically — **there is no category of "sensitive personal data"**. Health records, biometrics, financial data, caste, sexual orientation: all treated identically to a name. India's earlier SPDI Rules had such a category; the DPDP Act abolished it.

  *Rationale:* the drafters chose to calibrate risk at the **entity** level (via Significant Data Fiduciary designation) rather than the **data** level. Whether that's wise is contested, but it's the design.

- **"Processing"** (s.2(x)): wholly or partly automated operations — collection, recording, structuring, storage, retrieval, use, indexing, sharing, transmission, restriction, erasure, destruction. Everything your system does.

- **"Data Fiduciary"** (s.2(i)): whoever determines purpose *and* means. The GDPR "controller".
- **"Data Processor"** (s.2(k)): processes on behalf of a Fiduciary.
- **"Data Principal"** (s.2(j)): the individual. For a child, this *includes* the parent/guardian. For a person with disability with a lawful guardian, it includes the guardian.

- **"Child"** (s.2(f)): under **eighteen**. Remember this number; it drives Part 7 and it is the highest such threshold in any major data protection regime.

- **"she"** (s.2(y)): the Act uses feminine pronouns throughout for all persons regardless of gender. Not a substantive provision, but it explains the drafting style you'll see quoted everywhere.

### Where a technology company usually lands

Almost every SaaS business wears both hats simultaneously:

- **Fiduciary** for its own users — signup data, account details, billing, telemetry, support tickets, product analytics, marketing lists, employee data.
- **Processor** for its customers' data — the documents, records, and end-user data your customers put into your system.

These are different legal positions with different obligations and you need to know, field by field, which hat applies. This mapping exercise is the foundation of everything else and most companies discover it takes far longer than expected.

---

## Part 2 — You need a lawful basis, and there are only two (ss.4, 7)

### s.4 — The gateway

Process personal data only for a **lawful purpose** (defined negatively in s.4(2) as any purpose not expressly forbidden by law), and only on one of two bases:

1. Consent, or
2. "Certain legitimate uses" under s.7.

**This is the single biggest divergence from GDPR.** There is no "necessary for performance of a contract" basis. There is no "legitimate interests" balancing test. If your processing isn't on the s.7 list, you need consent — full stop.

### s.7 — The exhaustive legitimate-uses list

- **(a)** The specified purpose for which the Data Principal **voluntarily provided** her data, and in respect of which she hasn't indicated non-consent.
  *Illustrations in the Act:* a pharmacy customer who asks for a payment receipt by SMS; someone messaging a broker asking for rental listings.
- **(b)** State provision of any subsidy, benefit, service, certificate, licence or permit.
- **(c)** State functions, sovereignty and integrity of India, security of the State.
- **(d)** Statutory disclosure obligations to the State.
- **(e)** Compliance with judgments, decrees, orders (Indian, or foreign orders on contractual/civil claims).
- **(f)** Medical emergency — threat to life or immediate threat to health.
- **(g)** Epidemic, disease outbreak, or other public health threat.
- **(h)** Disaster or breakdown of public order.
- **(i)** **Employment purposes**, or safeguarding the employer from loss or liability — prevention of corporate espionage, protection of trade secrets, IP, classified information, or provision of a service or benefit sought by an employee.

### What this means for you

**s.7(a) is narrower than it first appears.** It covers what the user handed you, for the purpose they handed it to you for. It does not cover: inferred attributes, data enrichment from third parties, behavioural analytics beyond the specified purpose, retraining models on user content, or repurposing for a new feature. All of that needs consent.

**s.7(i) is a genuine relief.** Your entire HR stack — payroll, performance, access logs, device monitoring, DLP, insider-threat tooling — sits on a non-consent basis. You do not need employee consent, which is good, because employee consent is rarely "free" anyway.

*Rationale for the design:* the Justice Srikrishna Committee and subsequent drafts worried that a broad "legitimate interests" clause would swallow the consent requirement, as many argue it has under GDPR. India's answer was to enumerate the exceptions exhaustively. The cost is rigidity — there is no room for a genuinely reasonable use case that Parliament didn't foresee.

---

## Part 3 — Notice (s.5, Rule 3)

### s.5(1) — Every consent request needs a notice

The notice must **accompany or precede** the consent request, and must tell the person:

1. The personal data and the purpose of processing;
2. How to exercise the right to withdraw consent (s.6(4)) and the right to grievance redressal (s.13);
3. How to complain to the Board.

### s.5(2) — Legacy consent

If you obtained consent before the Act commenced, you must give the notice "as soon as it is reasonably practicable" — and you may keep processing until the person withdraws. The Act's illustration is an e-commerce app emailing or in-app-notifying its existing users.

**Practical point:** this is a re-papering exercise across your entire existing user base, and it has to land around the commencement date. Start planning it now, not in 2027.

### s.5(3) — Language

The person must be given the **option** to access the notice in English or any of the 22 languages in the Eighth Schedule to the Constitution. You don't have to translate into all 22 by default, but you must offer the option — which in practice means having the translations ready.

### Rule 3 — What the notice must actually contain

This is where the Rules add real teeth:

- **(a)** The notice must be presented and be understandable **independently of any other information** made available by the Fiduciary.
- **(b)** In clear and plain language, a fair account of what's needed for specific and informed consent, including at minimum:
  - an **itemised description** of the personal data, and
  - the specified purpose(s), with a **specific description of the goods or services to be provided or uses to be enabled**.
- **(c)** The particular communication link for the website or app, and a description of other means, by which the person may withdraw consent (with ease comparable to giving it), exercise her rights, and complain to the Board.

### Impact on how you build

Rule 3(a) is the killer. "Independently understandable" ends the "by continuing you agree to our Privacy Policy" pattern. The consent notice is a **standalone artefact**, not a hyperlink to a 40-page document.

Rule 3(b)(i)'s "itemised description" ends category-level notices. "We collect device information" is not itemised. You need the actual list: device model, OS version, IP address, advertising ID, and so on.

Engineering consequences:
- A **notice registry** with versioning. Every notice you've ever shown, immutably stored, with a version ID.
- Consent records that reference the notice version under which consent was obtained.
- A translation pipeline, because the language option isn't optional.
- Per-purpose notices rather than one global notice, since bundling breaks the specificity requirement.

---

## Part 4 — Consent (s.6)

### s.6(1) — The quality standard

Consent must be **free, specific, informed, unconditional and unambiguous, with a clear affirmative action**, signifying agreement to processing for the specified purpose, and **limited to such personal data as is necessary for that purpose**.

The Act's illustration is the sharpest thing in it. A telemedicine app asks for (i) consent to process personal data for telemedicine and (ii) access to the phone contact list. The user says yes to both. Because contacts aren't necessary for telemedicine, **the consent is legally limited to the telemedicine processing only**. The contact-list consent is simply void.

Read that again, because it inverts the usual assumption. Necessity is not a best practice you should follow — it is a hard limit on what consent can validly cover. Over-collection isn't a compliance risk you mitigate; the consent for it doesn't exist.

### s.6(2) — Severability of invalid consent

Any part of consent that infringes the Act or any other law is invalid to that extent. Illustration: an insurance app where the user consents to (i) processing for issuing the policy and (ii) waiving her right to complain to the Board. Part (ii) is void.

**So: you cannot draft around this Act in your Terms of Service.** Waivers of DPDP rights are unenforceable.

### s.6(3) — Presentation

Clear and plain language, with the Eighth Schedule language option, and the contact details of the DPO (if applicable) or another authorised person.

### s.6(4)–(6) — Withdrawal

- Withdrawable **at any time**, with **ease comparable to the ease with which it was given**.
- The consequences are borne by the Data Principal, and withdrawal is **not retroactive** — processing before withdrawal remains lawful.
- Illustration: a shopper withdraws consent after ordering and paying. The seller may stop letting her place new orders, but may not stop processing for the delivery of goods already paid for.
- On withdrawal, the Fiduciary must, within a reasonable time, **cease processing and cause its Data Processors to cease** processing.

The Act's illustration for s.6(6) is a telecom provider whose Data Processor emails bills; when the customer switches to app-only billing, the telco must stop *and* make its processor stop.

### s.6(10) — The evidentiary provision that will decide most disputes

> Where consent is the basis of processing and a question arises in a proceeding, **the Data Fiduciary is obliged to prove** that notice was given and consent was obtained in accordance with the Act.

This is a reverse burden of proof. In front of the Board, the user says "I never consented" and you must produce the evidence. There is no presumption in your favour.

### What you have to build

A **consent ledger**. Not a boolean column on the users table. An append-only record capturing, for every consent event:

- Data Principal identifier
- Purpose ID (from a purpose registry)
- Itemised data categories consented to
- Notice version shown
- Language in which it was shown
- Timestamp, channel, and the UI state at the moment of the affirmative action
- Withdrawal events, with timestamps
- Downstream propagation status — which processors were notified of the withdrawal, and when

And a **withdrawal propagation mechanism**: an event queue that fans out revocations to every processor and sub-processor holding that data, with acknowledgement tracking. If you're the fiduciary, your processor's failure is your liability (s.8(1), below).

Patterns that are now non-compliant: pre-ticked boxes, bundled consent, "accept all cookies to continue" walls, consent buried in ToS acceptance, and any withdrawal flow that's harder than the sign-up flow.

---

## Part 5 — Consent Managers (s.6(7)–(9), Rule 4, First Schedule)

A **Consent Manager** (s.2(g)) is a person registered with the Board who acts as a single point of contact enabling a Data Principal to give, manage, review and withdraw consent through an accessible, transparent and **interoperable** platform.

### Registration conditions (First Schedule, Part A)

1. A company incorporated in India.
2. Sufficient technical, operational and financial capacity.
3. Sound financial condition and general character of management.
4. **Net worth of at least ₹2 crore.**
5. Adequate volume of business, capital structure, earning prospects.
6. Directors, KMP and senior management of good repute and integrity.
7. The MoA and AoA must lock in the conflict-of-interest obligations, amendable only with prior Board approval.
8. Operations must be in the interests of Data Principals.
9. **Independent certification** that the interoperable platform conforms to the data protection standards and assurance framework the Board publishes, and that appropriate technical and organisational measures are in place.

### Obligations (First Schedule, Part B)

- Enable consent to be given either directly to an onboarded Fiduciary or **routed through another onboarded Fiduciary** that holds the data.
- **Must not be able to read the contents** of the personal data it makes available or routes. It is a blind pipe.
- Maintain records of consents given/denied/withdrawn, the notices that preceded them, and every sharing event with a transferee Fiduciary.
- Give the Data Principal access to those records and, on request, a **machine-readable export**. Retain for **at least seven years**.
- Maintain a website or app as the primary access channel.
- **No sub-contracting or assignment** of any obligation.
- Reasonable security safeguards.
- **Act in a fiduciary capacity** toward the Data Principal.
- Avoid conflicts of interest with Data Fiduciaries, including their promoters and KMP; have measures preventing conflicts arising from directorships, financial interests, employment or beneficial ownership in Fiduciaries.
- Publish promoters, directors, KMP, senior management, every >2% shareholder, and every body corporate in which any of those people hold >2%.
- Effective audit mechanisms reporting to the Board.
- **Change of control requires prior Board approval.**

The Schedule's illustration is unmistakably the Account Aggregator flow: platform P, banks B1 and B2, with X either consenting directly to B1 or routing consent through B2 to instruct B2 to send her statement to B1.

### What this means for you

Using a Consent Manager is **optional** for a Data Fiduciary. Nothing requires you to onboard. But two things follow:

1. In regulated sectors (finance, health, telecom), Consent Manager routing will likely become the expected pattern, and RBI/IRDAI/sectoral regulators may effectively mandate it.
2. This is India generalising the DEPA / Account Aggregator architecture from financial data to all personal data. If you're building infrastructure, "Consent Manager" is a licensed category with a ₹2 crore capital floor, a blind-pipe technical constraint, a seven-year retention duty, and a Board-approved change-of-control regime. It is closer to a regulated financial intermediary than to a SaaS product.

---

## Part 6 — General obligations of every Data Fiduciary (s.8, Rules 6–9)

This is the core operational chapter. Read it as your engineering backlog.

### s.8(1) — Non-delegable responsibility

> Irrespective of any agreement to the contrary **or failure of a Data Principal to carry out her duties**, the Data Fiduciary is responsible for compliance in respect of any processing undertaken by it **or on its behalf by a Data Processor**.

Two things here. First, you cannot contract your way out of liability — an indemnity from your vendor is a commercial remedy, not a legal defence. Second, if the user lied to you (say, about her age), that doesn't discharge you either.

### s.8(2) — Processors only under a valid contract

Short provision, big consequence: every vendor touching personal data for you needs a written data processing agreement.

### s.8(3) — Accuracy where it matters

Ensure completeness, accuracy and consistency where the data is likely to be **used to make a decision affecting the Data Principal**, or **disclosed to another Data Fiduciary**.

The first limb is a quiet AI provision. If a model output affects a user — credit, eligibility, ranking, moderation, pricing — the input data must be accurate and complete. This is a data-quality obligation attached to automated decision-making, without ever using the phrase.

### s.8(4) — Technical and organisational measures

The general accountability duty.

### s.8(5) + Rule 6 — Security safeguards: the mandatory floor

Rule 6 is prescriptive in a way the rest of the Rules mostly aren't. **At minimum**:

| Rule 6(1) | Requirement |
|---|---|
| (a) | Data security measures such as **encryption, obfuscation, masking, or virtual tokens** mapped to the personal data |
| (b) | Access control over the computer resources used by the Fiduciary or its Processor |
| (c) | **Visibility on access** — logs, monitoring and review, sufficient to detect unauthorised access, investigate it, and remediate to prevent recurrence |
| (d) | Continuity measures — e.g. **backups** — for loss of confidentiality, integrity or availability |
| (e) | **Retain such logs and personal data for one year**, unless another law requires otherwise |
| (f) | Contractual security obligations flowed down to Data Processors |
| (g) | Technical and organisational measures to ensure the safeguards are actually observed |

Note the framing: "at the minimum". This is a floor, not a ceiling, and failing it carries the **highest penalty in the Act (₹250 crore)**. The legislature's priority ordering is explicit — security failure is punished more heavily than consent failure.

Note also the tension between Rule 6(1)(e) (retain logs a year) and s.8(7) (erase when the purpose is served). Rule 8(3) resolves it in favour of retention, discussed below.

### s.8(6) + Rule 7 — Breach notification

**To each affected Data Principal** — *without delay*, concise, clear and plain, via her user account or any registered communication channel:

1. Description of the breach: nature, extent, timing of occurrence
2. The consequences **relevant to her** likely to arise
3. Mitigation measures implemented and being implemented
4. Safety measures **she** may take to protect her interests
5. Business contact information of someone who can respond to her queries

**To the Board** — in two stages:

- *Without delay:* description including nature, extent, timing **and location** of occurrence, and the **likely impact**.
- *Within 72 hours* (extendable on written request to the Board):
  - updated and detailed information
  - the broad facts — events, circumstances and reasons leading to the breach
  - mitigation measures implemented or proposed
  - **any findings regarding the person who caused the breach**
  - remedial measures to prevent recurrence
  - **a report on the intimations given to affected Data Principals**

### Why this is harder than GDPR

There is **no materiality threshold and no risk-based trigger**. GDPR lets you skip notifying individuals where the breach is unlikely to result in a risk to their rights. DPDP does not. Every personal data breach — a misdirected email, a single mis-scoped S3 object, one support agent viewing a record they shouldn't have — is notifiable to every affected person *and* to the Board.

And note the definition (s.2(u)): a breach includes **accidental loss of access** to personal data. An availability incident — an outage, a corrupted database, a ransomware event even without exfiltration — is a notifiable personal data breach.

**Build accordingly:**
- A breach classification runbook that assumes notification, and asks only "who and how fast".
- Pre-drafted, pre-translated notification templates per breach archetype.
- A 72-hour clock that starts on *becoming aware*, with an internal escalation SLA well inside it (assume 24 hours to reach the DPO).
- Forensic logging good enough to answer "who caused it" within 72 hours — which is precisely what Rule 6(1)(c) and (e) exist to make possible.
- A count-and-contact capability: you must be able to enumerate affected Data Principals and reach each one.

### s.8(7)–(8) + Rule 8 — Erasure and retention

**s.8(7):** Unless retention is necessary for legal compliance, erase personal data on withdrawal of consent, or **as soon as it is reasonable to assume the specified purpose is no longer being served**, whichever is earlier — and cause your Processor to erase it too.

Illustrations: an online marketplace must stop retaining a seller's data once the used-car sale concludes; but a bank must retain KYC records for ten years post-closure because banking law requires it.

**s.8(8):** The purpose is *deemed* no longer served if the Data Principal neither approaches the Fiduciary for the specified purpose nor exercises any right, for a prescribed period — which may differ by class of Fiduciary and by purpose.

**Rule 8(1) + Third Schedule:** the prescribed periods, which apply only to three classes:

| Class | Threshold | Period |
|---|---|---|
| E-commerce entity | ≥ 2 crore registered users in India | 3 years |
| Online gaming intermediary | ≥ 50 lakh registered users in India | 3 years |
| Social media intermediary | ≥ 2 crore registered users in India | 3 years |

Three years from the later of: the date the person last approached you for the specified purpose or exercised her rights, or the commencement of the Rules. **Excluded from the erasure duty**: data needed to let her access her user account, and data needed to let her access any virtual token issued by you, stored on your platform, usable to get money, goods or services (so, wallet balances, loyalty points, in-game currency survive).

**Rule 8(2):** at least **48 hours before** the erasure deadline, tell her that the data will be erased unless she logs in or otherwise initiates contact.

**Rule 8(3) — the retention floor that cuts the other way:** irrespective of the above, a Data Fiduciary must retain the personal data, associated traffic data, and processing logs for a **minimum of one year** from the date of processing, for the purposes in the Seventh Schedule, after which it must be erased unless another law or government notification requires longer.

The Rule's own illustrations:
- *Case 1:* someone buys an e-book. Delivery completes; the purpose is served. The platform must nonetheless retain order details, personal data and logs (order confirmation, payment, delivery events) for at least a year **even if she deletes her account**.
- *Case 2:* a company using a cloud provider as its Processor must ensure the **provider** also retains data and logs for at least a year before erasure.

**So the retention model is a corridor, not a deadline:** a one-year floor for everyone, and a three-year ceiling on inactivity for the three notified large-platform classes. Everyone else has no prescribed inactivity clock yet — you fall back on the s.8(7) "purpose no longer served" judgement, which you should document as a reasoned retention schedule.

### s.8(9) + Rule 9 — Contact point

Prominently publish on your website or app — **and mention in every response to a rights request** — the business contact information of your DPO (if you have one) or of a person who can answer questions about processing.

### s.8(10) — Grievance mechanism

Establish an effective grievance redressal mechanism. See s.13 and Rule 14(3) below for the timeline.

---

## Part 7 — Children and persons with disabilities (s.9, Rules 10–12, Fourth Schedule)

This is the hardest part of the Act to implement and the second-highest penalty band (₹200 crore).

### s.9(1) — Verifiable parental consent

Before processing **any** personal data of a child, or of a person with disability who has a lawful guardian, obtain the **verifiable consent** of the parent or lawful guardian.

### s.9(2) — The wellbeing duty

No processing likely to cause **any detrimental effect on the well-being of a child**. Note: this has **no exemption anywhere** in the Act or Rules. Even the Fourth Schedule carve-outs only disapply s.9(1) and s.9(3). The wellbeing duty is absolute.

### s.9(3) — The prohibitions

No **tracking**, no **behavioural monitoring** of children, and no **targeted advertising directed at children**.

### Rule 10 — What "verifiable" means

You must adopt appropriate technical and organisational measures to ensure parental consent is obtained, **and observe due diligence to check that the person identifying herself as the parent is an adult who is identifiable** (where identifiability is needed for compliance with Indian law), by reference to:

- (a) reliable identity and age details you **already hold**, or
- (b) identity and age details voluntarily provided — either directly by the individual, or **through a virtual token mapped to such details, issued by an authorised entity**.

"Authorised entity" includes any entity entrusted by law or government with issuing identity/age details or tokens, anyone they appoint, **and DigiLocker service providers**.

The Rule gives four illustration cases, which reduce to two paths:
- If the parent is already a registered user whose verified identity and age you hold → check your own records confirm she is an identifiable adult.
- If she isn't → verify against government-issued identity/age details or a mapped virtual token, which she may supply voluntarily via DigiLocker.

### Rule 11 — Guardians of persons with disability

Observe due diligence to verify the guardian was appointed by a court, a designated authority under s.15 of the RPwD Act 2016, or a local level committee under the National Trust Act 1999.

### Rule 12 + Fourth Schedule — The exemptions from s.9(1) and (3)

**Part A — by class of Data Fiduciary:**

| Class | Condition |
|---|---|
| Clinical establishment, mental health establishment, or healthcare professional | Restricted to provision of health services to the child, to the extent necessary for protecting her health |
| Allied healthcare professional | Restricted to supporting a treatment/referral plan recommended for the child, to the extent necessary for her health |
| Educational institution | Tracking/behavioural monitoring restricted to the institution's educational activities, or the safety of enrolled children |
| Individual running a crèche or child day care centre | Tracking/monitoring restricted to the safety of children in their care |
| Transport provider engaged by a school/crèche/child care centre | Restricted to tracking children's location, for safety, during travel to and from the institution |

**Part B — by purpose:**

| Purpose | Condition |
|---|---|
| Exercise of any power / performance of duties in the interests of a child under Indian law | To the extent necessary |
| Providing a subsidy, benefit, service, certificate, licence or permit in the interests of a child under s.7(b) | To the extent necessary |
| **Creating a user account for communicating by email** | Restricted to what's necessary for creating such an account, used only for email |
| **Determining real-time location of a child** | Restricted to location tracking, in the interest of her safety, protection or security |
| **Ensuring information, services or advertisements likely to harm a child's well-being are not accessible to her** | Restricted to what's necessary to make them inaccessible |
| **Confirming that the Data Principal is not a child, and the Rule 10 due diligence itself** | Restricted to what's necessary for that confirmation |

That last one is essential and easy to miss: **age assurance is itself exempt**. You are permitted to process a user's data to find out whether she is a child, without first needing parental consent. Without it the requirement would be circular.

### s.9(4)–(5) — Government flexibility

s.9(4) lets the government prescribe classes and purposes exempt from s.9(1) and (3) — that's Rule 12. s.9(5) lets it notify, for a Fiduciary that has made children's-data processing "verifiably safe", an **age above which** that Fiduciary is exempt from s.9(1) and (3). This is the escape hatch from 18 — a de facto lower age threshold, but only per-Fiduciary, only by notification, and only on a demonstrated safety showing. None has been granted yet.

### What you actually have to decide

There are three viable postures, and you must pick one deliberately:

1. **Age-gate and support parental consent.** Build an age declaration, an adult-verification flow (DigiLocker or equivalent token), a linked parent–child account model, and a differentiated experience for under-18s with tracking, behavioural profiling and targeted ads switched off. Expensive, but the only option if minors are a real user segment.

2. **Exclude minors technically and contractually.** Terms restrict the service to adults; you implement age assurance at signup (permitted by Fourth Schedule Part B, item 6) and enforce it. But remember s.8(1): a child lying about her age does not discharge you. The question the Board will ask is whether your measures were *appropriate*, not whether the user was honest. A checkbox saying "I am over 18" is unlikely to be enough for a product plainly attractive to minors.

3. **Fit within a Fourth Schedule exemption.** Only if you genuinely are (or serve, in the relevant capacity) a healthcare, education, childcare, or child-safety entity, and only within the stated conditions.

And in all three cases, s.9(2) applies unconditionally: no processing likely to harm a child's wellbeing.

*Rationale:* Parliament chose a bright-line age of majority over a graduated-capacity model, prioritising administrability and a strong protective signal. The Rules then soften the edges by carving out exactly the cases where demanding parental consent would be perverse — a doctor treating a child, a school bus tracking its route, a platform trying to keep harmful ads away from minors.

---

## Part 8 — Significant Data Fiduciaries (s.10, Rule 13)

### s.10(1) — Designation

The Central Government may notify any Fiduciary or class of Fiduciaries as a **Significant Data Fiduciary**, assessing relevant factors including:

(a) volume and sensitivity of personal data processed
(b) risk to the rights of Data Principals
(c) potential impact on the sovereignty and integrity of India
(d) **risk to electoral democracy**
(e) security of the State
(f) public order

Note that (c)–(f) are not data protection criteria at all. SDF designation is partly a national-security instrument. Note also that "sensitivity" reappears here — the concept the Act abolished at data level returns at entity level.

### s.10(2) — Additional obligations

- **A Data Protection Officer** who represents the SDF, is **based in India**, is an individual **responsible to the Board of Directors** or equivalent governing body, and is the point of contact for grievance redressal. (This is the only place a DPO is mandatory. Note it must be an *individual* answerable to the board — not an outsourced function, not a shared services role.)
- An **independent data auditor** to evaluate compliance.
- Periodic **Data Protection Impact Assessment** — a process describing Data Principals' rights, the purpose of processing, and the assessment and management of risk to those rights.
- Periodic **audit**.
- Such other measures as prescribed.

### Rule 13 — The prescribed measures

1. **Annually** (every twelve months from designation): a DPIA and an audit.
2. The person conducting them must **furnish a report of significant observations to the Board**. So your DPIA findings go to the regulator, not just into a drawer.
3. **Algorithmic due diligence.** The SDF must verify that technical measures **including algorithmic software** it adopts for hosting, display, uploading, modification, publishing, transmission, storage, updating or sharing of personal data are **not likely to pose a risk to the rights of Data Principals**.
4. **Conditional localisation.** The SDF must ensure that personal data specified by the Central Government — on the recommendation of a committee including MeitY officials and possibly other ministries — **and the traffic data pertaining to its flow** are not transferred outside India.

### Why (3) and (4) matter more than they look

**(3) is India's first binding AI governance obligation on private companies**, and it arrived inside a data protection rule rather than an AI law. If you run recommender systems, ranking algorithms, scoring models, automated moderation, or any ML pipeline over personal data, and you get designated an SDF, you owe a documented, recurring assessment of whether that software risks users' rights. There is no prescribed methodology yet — which means the first movers will define what "due diligence" looks like here.

**(4) is a latent switch.** No categories have been specified. But when they are, it is hard localisation — not just the data but the **traffic data about its flow** — applying to SDFs only, category by category.

### What to do about it now

You almost certainly aren't an SDF yet; the government hasn't notified anyone. But designation is a government decision you don't control, and the obligations bite immediately on notification with a twelve-month cycle. If you're plausibly in scope — large user base, sensitive categories, platform role, or anything touching electoral or public discourse — then:

- Architect for **data residency segregation** now. Retrofitting a localisation boundary into a mature system is brutal; building the seam early costs little.
- Keep model/algorithm documentation in a form that could become a risk assessment.
- Know who your DPO would be and whether they can credibly report to the board.

---

## Part 9 — Rights of Data Principals (ss.11–15, Rule 14)

### s.11 — Right to access information

On request, the Data Principal may obtain from a Fiduciary to whom she has given consent (including s.7(a) processing):

(a) a **summary of the personal data** being processed and the processing activities undertaken;
(b) the **identities of all other Data Fiduciaries and Data Processors** with whom her data has been shared, **plus a description of the data shared**;
(c) any other prescribed information.

**s.11(2) exception:** (b) and (c) don't apply to sharing with another Fiduciary legally authorised to obtain the data, where the sharing is pursuant to a written request for prevention, detection or investigation of offences or cyber incidents, or for prosecution.

Limb (b) is operationally demanding. To answer it you need a live **sharing register** mapping data categories to every downstream recipient — including sub-processors. If you can't generate that on demand, you can't comply.

### s.12 — Right to correction and erasure

Correction, completion, updating and erasure of data processed on her consent (including s.7(a)). On a correction request you **shall** correct inaccurate/misleading data, complete incomplete data, and update it. On an erasure request you **shall** erase, unless retention is necessary for the specified purpose or for legal compliance.

### s.13 — Right to grievance redressal

Readily available grievance redressal from the Fiduciary or Consent Manager, in respect of any act or omission regarding its obligations or her rights. Response within the prescribed period.

**s.13(3): she must exhaust grievance redressal before approaching the Board.** This makes your internal complaints process a legal filter on regulatory exposure — a well-run one genuinely reduces the number of matters that reach the Board.

**Rule 14(3):** every Data Fiduciary and Consent Manager must prominently publish its grievance redressal response period on its website or app — a **reasonable period not exceeding ninety days** — and implement technical and organisational measures to actually meet it. (The drafting of this sub-rule is awkward; the safe reading is that ninety days is the outer limit for responding, and you must publish your period.)

### s.14 — Right to nominate

The Data Principal may nominate another individual to exercise her rights in the event of her death or incapacity ("incapacity" meaning inability to exercise rights due to unsoundness of mind or infirmity of body). **Rule 14(4):** she may nominate **one or more** individuals.

This is unusual — GDPR has nothing equivalent. Practically it means your account model needs a nominee field and a process for validating a nominee's claim.

### Rule 14(1)–(2), (5) — Mechanics

You must publish (a) the means by which a rights request can be made, and (b) the particulars, such as username or other identifier, needed to identify her under your terms of service. Rule 14(5) defines "identifier" broadly: customer ID file number, customer acquisition form number, application reference number, enrolment ID, email address, mobile number, licence number.

### s.15 — Duties of the Data Principal

She must: comply with applicable law when exercising rights; **not impersonate** another person; **not suppress material information** when providing data for any State-issued document, unique identifier, proof of identity or address; **not register a false or frivolous grievance or complaint**; and furnish only **verifiably authentic** information when exercising correction or erasure rights.

Penalty for breach: up to **₹10,000**. And under s.28(12), the Board may issue a warning or impose costs on a complainant if it finds the complaint false or frivolous.

This is genuinely unusual — most data protection laws impose no duties on the individual. The rationale is deterrence of vexatious complaints against businesses. The criticism is that it may chill legitimate complaints, since a person contemplating a complaint faces a possible penalty if the Board disagrees with her.

### The structural limit on rights

Read s.11 and s.12 carefully: the rights attach to processing **for which she has previously given consent**, including s.7(a). They do **not** attach to processing under s.7(b)–(i). So data processed on the employment basis, or the State-function basis, or the legal-obligation basis, is largely outside the access and correction rights. This is a significant narrowing relative to GDPR, where rights follow the data regardless of legal basis.

### What to build

A **data subject request console** with:
- Identity verification against published identifiers
- Automated assembly of the s.11(a) summary from your data map
- Automated assembly of the s.11(b) sharing list from a maintained processor/sub-processor register
- Correction and erasure workflows with retention-exception logic and a documented reason for every refusal
- Nominee registration and validation
- Grievance tracking with an SLA well inside ninety days (ninety days is a legal ceiling; treat thirty as your operational target)
- Your DPO/contact information auto-appended to every response (Rule 9)

---

## Part 10 — Cross-border transfers (s.16, Rule 15, Rule 13(4))

### s.16(1) — A blacklist, not a whitelist

The Central Government may **restrict** transfer to notified countries or territories. Read that as: **transfers are permitted by default**, and become restricted only if the destination is notified. No adequacy decisions, no standard contractual clauses, no transfer impact assessments.

This is the most business-friendly provision in the Act, and a deliberate reversal of the 2019 Bill's localisation-first approach.

### s.16(2) — Sectoral laws prevail

Nothing in s.16 restricts any Indian law providing a **higher** degree of protection or restriction. So RBI's payment-system data localisation directive, IRDAI requirements, telecom licence conditions, and similar sectoral rules survive intact and override the permissive default.

### Rule 15 — The one condition

Transfers are subject to the restriction that the Fiduciary must meet such requirements as the Central Government may specify, by general or special order, **in respect of making personal data available to any foreign State, or to any person or entity under the control of or any agency of such a State**.

Note what this targets: **foreign government access**, not commercial transfer. The concern is a foreign state compelling disclosure (think CLOUD Act-style requests), not you using a US cloud region.

### Rule 13(4) — SDF localisation

As covered above: category-specific hard localisation, SDFs only, categories yet to be specified.

### What this means

Today you can use AWS, GCP, Azure regions anywhere. Your existing architecture is probably fine. But build in the optionality:

- Know which regions each data category lives in, so you can respond to a future negative list.
- Keep the seam for data residency segregation, in case of SDF designation.
- Check your sectoral overlay — if you serve regulated customers, their sectoral rules flow to you contractually regardless of what DPDP says.
- Track whether any foreign-government-access order under Rule 15 lands; if you're subject to foreign compelled-disclosure regimes, that's the provision to watch.

---

## Part 11 — Exemptions (s.17, Rule 16, Second Schedule)

### s.17(1) — Chapter II (mostly), Chapter III and s.16 don't apply where:

(a) processing is necessary for **enforcing any legal right or claim**;
(b) processing by a **court, tribunal, or any body entrusted by law with judicial, quasi-judicial, regulatory or supervisory functions**, where necessary for that function;
(c) processing in the interest of **prevention, detection, investigation or prosecution** of any offence or contravention;
(d) **personal data of Data Principals not in India, processed under a contract with a person outside India, by a person based in India**;
(e) processing necessary for a court-approved **scheme of compromise, arrangement, merger, amalgamation, demerger, reconstruction, or transfer of undertaking**;
(f) processing to ascertain the financial information, assets and liabilities of a **loan defaulter**, per disclosure rules in other law.

**Crucially: s.8(1) and s.8(5) survive every one of these exemptions.** Accountability and reasonable security safeguards are never switched off. That is a deliberate floor, and a good one — it means even exempt processing must be secure and someone must be answerable for it.

**s.17(1)(d) is the single most commercially important provision in the Act for Indian technology services.** If you're an Indian company processing foreign users' data under a contract with a foreign entity — the entire IT services, BPO and GCC model — that processing sits almost entirely outside the Act. No consent, no notice, no rights, no transfer restrictions. Just accountability and security.

**s.17(1)(e)** means M&A due diligence and integration don't require consent, provided the scheme is court/tribunal-approved.

### s.17(2) — Full exemptions

(a) **State instrumentalities notified** in the interests of sovereignty, integrity, security of the State, friendly relations with foreign States, public order, or preventing incitement to a cognisable offence. This is the provision that drew the most criticism during passage: it exempts the State from the Act by executive notification, with the Rules (Second Schedule, via Rule 16) supplying only process standards rather than substantive limits.

(b) **Research, archiving or statistical purposes**, provided the data is not used to take any decision specific to a Data Principal, and the processing follows prescribed standards.

### Rule 16 + Second Schedule — Research/archiving/statistical standards

The Act doesn't apply if processing follows these standards, which require technical and organisational measures ensuring:

(a) lawful processing;
(b) processing only for the specified purposes;
(c) **limited to such personal data as is necessary**;
(d) reasonable efforts at completeness, accuracy and consistency;
(e) retention only as long as required, or for legal compliance;
(f) **reasonable security safeguards**, including for processing by a Processor on your behalf;
(g) (for s.7(b) State processing) an intimation to the Data Principal, a business contact for questions, a link for exercising rights, and consistency with other applicable standards;
(h) **accountability** of whoever determines purpose and means.

So "exempt for research" is not a free pass. It's a substituted regime: purpose limitation, minimisation, accuracy, retention limits, security, and accountability all still apply — you just lose the consent, notice and rights machinery. The critical gate is the s.17(2)(b) condition itself: **the data must not be used to take any decision specific to a Data Principal**. The moment your research output feeds a per-user decision, the exemption evaporates.

For anyone training models: aggregate research and statistical analysis can qualify. Personalisation cannot.

### s.17(3) — The startup exemption

The government may, having regard to volume and nature of data processed, notify certain Fiduciaries or classes **including startups** as exempt from: **s.5 (notice), s.8(3) (accuracy), s.8(7) (erasure), s.10 (SDF obligations) and s.11 (access rights)**.

"Startup" means a private limited company, partnership firm or LLP incorporated in India and recognised as a startup under DPIIT criteria.

**Nothing has been notified.** This is the relief to watch if you're an early-stage Indian company. But plan on the assumption it won't come — and note that even if it does, it leaves consent (s.6), security (s.8(5)), breach notification (s.8(6)), children (s.9), and correction/erasure rights (s.12) fully applicable.

### s.17(4)–(5)

(4) For State processing, s.8(7) (erasure) and s.12(3) don't apply, and s.12(2) doesn't apply where the processing isn't for a decision affecting the person.

(5) A **five-year sunset power**: before five years from commencement, the government may declare that any provision doesn't apply to any Fiduciary or class, for a specified period. A broad transitional discretion.

---

## Part 12 — The Data Protection Board and enforcement (ss.18–32, Rules 17–22)

### Constitution (ss.18–26, Rules 17–21) — already in force

The Board is a body corporate with perpetual succession, headquartered where the government notifies. Chairperson and such number of members as notified, appointed by the Central Government. Rule 17 provides for a **search-cum-selection committee** — chaired by the MeitY Secretary, with the Secretary in charge of the Department of Legal Affairs and eminent experts — recommending candidates for member positions.

**Rule 20: the Board functions as a digital office**, adopting techno-legal measures so that proceedings can run without requiring anyone's physical presence — while retaining its power to summon and examine on oath.

### Functions (s.27)

The Board acts:
(a) on a breach intimation — to **direct urgent remedial or mitigation measures**, inquire, and penalise;
(b) on a Data Principal's complaint about a breach or a Fiduciary's non-compliance, or a reference from the Central or a State Government, or a court direction;
(c) on a complaint about a Consent Manager's obligations;
(d) on an intimation of breach of a Consent Manager's registration conditions *(in force from Nov 2026)*;
(e) on a government reference about an intermediary's non-compliance with a s.37(2) blocking direction.

s.27(2): the Board may, after a hearing and recorded reasons, issue binding directions.

Note (a): the Board's *first* response to a breach is not punishment but direction — it can order you to take specific remedial steps immediately. That is a live operational risk, not just a financial one.

### Inquiry (s.28, Rule 19(9))

- The Board first determines whether there are **sufficient grounds**; if not, it closes the proceedings with recorded reasons.
- Inquiry follows **principles of natural justice**, with reasons recorded throughout.
- Civil-court powers: summoning and examining on oath, receiving affidavit evidence, discovery and production of documents, inspecting data, books, registers, accounts.
- **s.28(8): the Board and its officers shall not prevent access to any premises or take into custody any equipment or item that may adversely affect day-to-day functioning.** No dawn raids, no server seizures. A meaningful protection.
- The Board may requisition police or government officers to assist.
- Interim orders permitted, after a hearing and with recorded reasons.
- **s.28(12):** at any stage, if the Board thinks a complaint is false or frivolous, it may warn the complainant or impose costs.
- **Rule 19(9): the inquiry must be completed within six months** of receiving the intimation, complaint, reference or direction — extendable **once**, by up to three months, for reasons recorded in writing.

### Appeal (s.29, Rule 22)

- Appeal to the **Appellate Tribunal — which is TDSAT** (per s.2(a) and the s.44(1) amendment) — within **60 days**, extendable for sufficient cause.
- Filed **digitally**, in the form the Tribunal decides. Fee equal to that for a TRAI Act appeal, reducible or waivable at the Chairperson's discretion, **payable digitally via UPI** or another RBI-authorised system.
- The Tribunal is **not bound by the Code of Civil Procedure**, is guided by natural justice, and regulates its own procedure. It functions as a **digital office**.
- Endeavour to dispose within six months; reasons recorded if it takes longer.
- **s.30:** Tribunal orders are executable as a decree of a civil court.
- Further appeal from TDSAT lies under s.18 of the TRAI Act — to the Supreme Court.

### Alternative resolution (ss.31, 32)

**s.31 — Mediation.** The Board may direct parties to mediation where it thinks the complaint is amenable to it.

**s.32 — Voluntary undertakings.** The Board may accept a voluntary undertaking at **any stage** of a s.28 proceeding: to take specified action within a specified time, to refrain from action, or to publicise the undertaking. Terms may be varied with the giver's consent. **Acceptance bars further proceedings on the content of the undertaking** — but breaching it is itself a penalisable offence (Schedule item 6), at the level applicable to the underlying breach.

This is your settlement mechanism. If you're in front of the Board and your position is weak, a voluntary undertaking converts an open-ended penalty exposure into a defined remediation commitment. Worth knowing exists before you need it.

### s.39 — Bar of civil jurisdiction

No civil court may entertain any suit or proceeding on a matter the Board is empowered to decide, and no court may grant an injunction on any action taken under the Act.

### s.38 — Overriding effect

The Act is in addition to, not in derogation of, other laws — but **prevails to the extent of any conflict**.

### s.36 — Government information-gathering

The Central Government may require the Board, any Data Fiduciary, or any intermediary to furnish such information as it calls for.

**Rule 23** operationalises this: the Central Government, acting through the authorised person specified in the **Seventh Schedule**, may require any Fiduciary or intermediary to furnish information within a specified period. And **Rule 23(2)**: where disclosure would prejudicially affect the sovereignty and integrity of India or security of the State, the government may require you **not to disclose the request** to affected Data Principals or anyone else without prior written permission.

That is a gag provision. If you receive such a request, you cannot tell your users — and you cannot include it in your transparency report — without permission.

The Seventh Schedule lists three purposes and their authorised persons: State use of personal data in the interests of sovereignty/security (officer designated under s.17(2)(a)); State performance of legal functions or statutory disclosure (person authorised under applicable law); and **carrying out the assessment for notifying a Fiduciary as an SDF** (an officer designated by the MeitY Secretary). That third one is how the government gathers the data to decide who becomes an SDF.

### s.37 — The blocking power

On a written reference from the Board that (a) it has imposed monetary penalties on a Data Fiduciary in **two or more instances**, and (b) it advises, in the interests of the general public, blocking public access to information hosted on a computer resource that enables that Fiduciary to offer goods or services in India — the Central Government may, **after giving the Fiduciary a hearing** and recording reasons, direct any government agency or intermediary to block that information. Every intermediary receiving such a direction is bound to comply (s.37(2)), and non-compliance by the intermediary is itself penalisable (s.27(1)(e)).

**This is the real enforcement escalation.** For a company whose India business runs through an app or website, being blocked is a far more serious sanction than a fine. Two penalties is the trigger.

---

## Part 13 — Penalties (s.33 and the Schedule)

| Breach | Maximum penalty |
|---|---|
| Failure to take reasonable security safeguards — s.8(5) | **₹250 crore** |
| Failure to notify a breach to the Board or affected Data Principals — s.8(6) | **₹200 crore** |
| Failure on children's obligations — s.9 | **₹200 crore** |
| Failure on Significant Data Fiduciary obligations — s.10 | **₹150 crore** |
| Breach of Data Principal duties — s.15 | **₹10,000** |
| Breach of a voluntary undertaking — s.32 | Up to the level applicable to the underlying breach |
| **Any other provision of the Act or Rules** | **₹50 crore** |

### s.33(2) — How the amount is set

The Board must have regard to:

(a) the **nature, gravity and duration** of the breach;
(b) the **type and nature of the personal data** affected;
(c) whether the breach is **repetitive**;
(d) whether the person **realised a gain or avoided a loss** as a result;
(e) whether the person took **mitigating action**, and the **timeliness and effectiveness** of it;
(f) whether the penalty is **proportionate and effective**, having regard to deterrence;
(g) the **likely impact of the penalty on the person**.

Two of these are worth building around. **(b)** brings sensitivity back through the sentencing door even though the Act has no sensitive-data category — a health-data breach will be penalised more heavily than an equivalent email-address breach, even though the obligations were identical. And **(e)** rewards fast, effective incident response directly in the penalty calculation. A well-run breach response is not just good practice; it is a quantifiable mitigation of financial exposure.

**(g)** is the proportionality valve — the Board is expected to consider whether a penalty would destroy the business. Small companies are unlikely to face ₹250 crore.

### The structural points

1. **Penalties are civil only.** No imprisonment anywhere in the Act. The IT Act's s.43A (compensation for negligent handling of sensitive data) is **repealed** by s.44(2).
2. **There is no private right of action and no compensation to individuals.** s.39 bars civil suits on matters within the Board's competence, s.44(2) removes s.43A, and nothing in DPDP creates a damages remedy. An affected individual's only route is a complaint to the Board — from which she personally receives nothing. All penalties go to the Consolidated Fund of India (s.34).
3. **The ordering is telling.** Security (₹250cr) > breach notification (₹200cr) = children (₹200cr) > SDF obligations (₹150cr) > everything else, including all consent and notice failures (₹50cr). If you're prioritising a compliance budget, that ordering is a reasonable proxy for regulatory attention.

---

## Part 14 — What this means for you concretely

If you build software and hold user data, here is the work, roughly in dependency order.

**Foundation (do first — everything else depends on it)**
1. **Data inventory.** Every field, every system, every table. What personal data, where, why, for how long, who can see it, where it goes.
2. **Role mapping.** For each data set: are you Fiduciary or Processor? Most companies are both, and the answer changes your obligations.
3. **Purpose registry.** An enumerated list of processing purposes with a lawful basis assigned to each — consent, s.7(a), or s.7(i). If a purpose can't be mapped, it can't continue.

**Consent layer**
4. **Notice registry** with versioning, per purpose, translated, standalone (Rule 3(a)).
5. **Consent ledger** — append-only, granular, tied to notice version, with withdrawal events. Built to satisfy s.6(10) evidentially.
6. **Withdrawal propagation** to processors and sub-processors, with acknowledgement tracking.
7. **Legacy notice campaign** for pre-commencement consents (s.5(2)).

**Security and incident response**
8. **Rule 6 floor**: encryption/masking/tokenisation, access control, access logging and monitoring, backups, one-year log retention, security flow-down in every processor contract.
9. **Breach runbook** assuming *every* breach is notifiable. 72-hour Board clock, immediate user notification, pre-drafted templates, ability to enumerate and contact affected individuals, and forensics good enough to answer "who caused it" within three days.

**Lifecycle**
10. **Retention engine.** One-year floor for personal data, traffic data and logs (Rule 8(3)). Documented retention schedule per purpose. If you're a large e-commerce, gaming or social platform: the three-year inactivity clock and the 48-hour pre-erasure warning.
11. **Erasure on withdrawal**, propagating to processors.

**Rights**
12. **DSR console**: access summary, downstream sharing list, correction, erasure, nomination.
13. **Processor/sub-processor register**, live, mapped to data categories — this is what makes s.11(b) answerable.
14. **Grievance system** with a published response period under ninety days, and your contact information auto-appended to every response.

**Children**
15. **Decide your posture** — age-gate with parental consent, exclude minors, or qualify for an exemption. Then implement it properly; a checkbox won't survive scrutiny for a product minors plainly use.
16. If minors are in scope: adult verification (DigiLocker/token), parent-child account linkage, and tracking/behavioural monitoring/targeted advertising disabled for under-18s.

**Governance**
17. **DPO or named contact**, published, and included in every rights response.
18. **Processor contracts** — every vendor touching personal data, with security obligations and erasure cooperation.
19. **SDF readiness** if plausibly in scope: DPIA methodology, audit relationship, algorithmic risk assessment process, and a data-residency seam in the architecture.

**The sequencing point.** Items 1–3 are unglamorous and will take longer than you expect, and every other item is unbuildable without them. Companies that skip straight to a consent banner end up rebuilding twice.

---

## Part 15 — How this differs from GDPR (if that's your mental model)

| | GDPR | DPDP |
|---|---|---|
| **Lawful bases** | Six, incl. contract and legitimate interests | Two: consent, or the closed s.7 list |
| **Sensitive data** | Special categories, Art. 9 | None — flat model; risk handled at entity level via SDF |
| **Child age** | 13–16 by member state | **18**, uniform |
| **Breach notification to regulator** | 72h, risk-based threshold | Immediate initial + 72h detailed, **no threshold** |
| **Breach notification to individuals** | Only if high risk | **Always**, without delay |
| **Cross-border transfers** | Prohibited unless adequacy/SCCs/derogation | **Permitted unless the destination is blacklisted** |
| **DPO** | Required in defined circumstances | Only for Significant Data Fiduciaries |
| **Right to data portability** | Yes | **No** (only via a Consent Manager's export duty) |
| **Right to object / restrict processing** | Yes | **No** |
| **Rights against automated decision-making** | Art. 22 | **No** — only the s.8(3) accuracy duty |
| **Right to nominate on death/incapacity** | No | **Yes** (s.14) |
| **Duties on the individual** | None | **Yes** (s.15), penalty ₹10,000 |
| **Compensation to individuals** | Art. 82 damages | **None** — no private right of action |
| **Max penalty** | 4% global turnover | ₹250 crore, fixed cap, no turnover link |
| **Enforcement** | Supervisory authority + courts | Board only; civil courts barred (s.39) |
| **Blocking / service suspension** | No | **Yes** (s.37), after two penalties |

**Net effect:** DPDP is *narrower* than GDPR in the rights it grants and the remedies it provides, and *stricter* in three specific places — the age of majority, the absence of any breach-notification threshold, and the absence of a legitimate-interests basis. If you're already GDPR-compliant you have most of the machinery, but you cannot simply extend it. The three places you will need new work are children, breach notification volume, and re-basing anything you currently run on legitimate interests or contract necessity.

---

## Part 16 — Where the open questions are

Things that are not yet settled, and that you should be watching:

1. **Who gets designated a Significant Data Fiduciary**, and on what criteria in practice. No designations yet.
2. **Which data categories get SDF localisation** under Rule 13(4). No specification yet.
3. **Whether the s.17(3) startup exemption is ever notified**, and to whom.
4. **Whether any s.9(5) age-threshold relaxations are granted**, which would effectively lower 18 for specific platforms.
5. **What "algorithmic due diligence" under Rule 13(3) means in practice** — no methodology prescribed; early SDFs will set the norm.
6. **Whether s.3(b) reaches pure profiling** of Indian users absent an offer of goods or services.
7. **How the Board reads "without delay"** in Rule 7(1) for user notification, against the explicit 72 hours for the Board.
8. **The interaction between Rule 6(1)(e) / Rule 8(3) one-year retention and s.8(7) erasure** where a user demands deletion inside that year. The Rules appear to make retention win, but the drafting invites argument.
9. **Whether the s.17(2)(a) State exemption is challenged** on Puttaswamy proportionality grounds.
10. **What the Board's data protection standards and assurance framework for Consent Managers** (First Schedule Part A, item 9) will require. Not published yet.

---

*This guide is a reading of the documents, not legal advice. Where the drafting is ambiguous I've flagged it rather than resolved it. For anything with real money or real exposure attached, get an opinion from Indian counsel — particularly on the children's provisions and on whether any of your processing can rely on s.17(1)(d).*
