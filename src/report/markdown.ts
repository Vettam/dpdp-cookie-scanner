import type { Finding, FindingPresence, Question, ScanResult } from "../types.js";

/** Markdown renderer for PR comments and issues (spec §7.3). */
export function renderMarkdown(sr: ScanResult): string {
  const out: string[] = [];
  out.push(`# dpdp-cookie-scan — ${hostOf(sr.target.url)}`);
  out.push("");
  out.push(`> Interpretation as of ${sr.interpretation_as_of}. Indicative, not legal advice. Not a compliance verdict.`);
  out.push("");
  out.push(
    `**${sr.summary.third_parties} third parties · ${sr.summary.third_parties_outside_india} outside India · ${sr.summary.fired_before_banner} fired before the banner.**`,
  );
  out.push("");

  const byTier = groupByTier(sr.findings);
  for (const tier of ["settled", "arguable", "open"] as const) {
    const fs = byTier[tier];
    if (fs.length === 0) continue;
    out.push(`## ${tier.toUpperCase()} (${fs.length}) — enforceable ${earliestEnforceable(fs)}`);
    out.push("");
    for (const f of fs) out.push(renderFindingBlock(f));
  }

  if (sr.interaction.performed) {
    out.push(`## INTERACTION — load vs accept-all vs reject-all`);
    out.push("");
    const acceptLine = sr.interaction.accept_clicked
      ? `Accept-all findings: ${sr.interaction.accept_findings}.`
      : "Accept-all control was not found; accept comparison was not performed.";
    const rejectLine = sr.interaction.reject_clicked
      ? `Reject-all findings: ${sr.interaction.reject_findings}.`
      : "Reject-all control was not found; reject comparison was not performed.";
    out.push(`${acceptLine} ${rejectLine} The findings above are the load pass.`);
    out.push("");
    out.push(renderPresenceList("Survived reject-all", sr.interaction.survived_reject));
    out.push(renderPresenceList("Cleared on reject-all", sr.interaction.cleared_on_reject));
    out.push(renderPresenceList("Appeared on accept-all", sr.interaction.appeared_on_accept));
    out.push("");
  }

  if (sr.questions.length > 0) {
    out.push(`## QUESTIONS (${sr.questions.length})`);
    out.push("");
    for (const q of sr.questions) {
      out.push(`### ${q.rule_id} — ${q.consequence_if_true}`);
      out.push("");
      out.push(`- **Provisions:** ${q.provisions.join(", ")}`);
      out.push(`- **If true:** ${q.consequence_if_true}`);
      out.push(`- **Rationale:** ${q.rationale_plain}`);
      out.push(`- **Explainer:** ${q.explainer_url}`);
      out.push("");
    }
  }

  out.push(`## Limits`);
  out.push("");
  for (const l of sr.limits) out.push(`- ${l}`);
  out.push("");
  return out.join("\n");
}

function renderPresenceList(label: string, rows: FindingPresence[]): string {
  if (rows.length === 0) return `- **${label}:** none`;
  const items = rows.map((f) => `${f.rule_id} ${f.title}`).join("; ");
  return `- **${label}:** ${items}`;
}

function renderFindingBlock(f: Finding): string {
  const out: string[] = [];
  out.push(`<details><summary><b>${f.rule_id}</b> — ${f.tracker ? `${f.tracker.vendor} (${f.tracker.id})` : f.title}</summary>`);
  out.push("");
  out.push(`- **Certainty:** ${f.certainty} (enforceable ${f.enforceable_from})`);
  out.push(`- **Provisions:** ${f.provisions.join(", ")}`);
  out.push(`- **Owner:** ${f.owner}`);
  out.push(`- **Attributed to:** ${f.attributed_to}`);
  out.push(`- **Rationale:** ${f.rationale_dev}`);
  out.push(`- **Remediation:** ${f.remediation_summary}`);
  out.push(`- **Explainer:** ${f.explainer_url}`);
  if (f.evidence.length > 0) {
    const reqs = f.evidence.filter((e) => e.type === "request");
    const cookies = f.evidence.filter((e) => e.type === "cookie");
    if (reqs.length > 0) {
      out.push("");
      out.push(`| host | path | before banner | country |`);
      out.push(`|---|---|---|---|`);
      for (const e of reqs) {
        out.push(`| ${e.host} | ${e.path} | ${e.before_banner_detected} | ${e.destination_country} |`);
      }
    }
    if (cookies.length > 0) {
      out.push("");
      out.push(`| cookie | domain | secure | httpOnly | sameSite |`);
      out.push(`|---|---|---|---|---|`);
      for (const e of cookies) {
        out.push(`| ${e.name} | ${e.domain} | ${e.secure} | ${e.httpOnly} | ${e.sameSite} |`);
      }
    }
  }
  out.push("");
  out.push(`</details>`);
  out.push("");
  return out.join("\n");
}

function shortTitle(f: Finding): string {
  return f.title;
}

function earliestEnforceable(fs: Finding[]): string {
  return fs.map((f) => f.enforceable_from).sort()[0] ?? "";
}

function groupByTier(fs: Finding[]) {
  return {
    settled: fs.filter((f) => f.certainty === "settled"),
    arguable: fs.filter((f) => f.certainty === "arguable"),
    open: fs.filter((f) => f.certainty === "open"),
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
