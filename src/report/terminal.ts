import pc from "picocolors";
import type { Finding, Question, ScanResult } from "../types.js";

export interface TerminalOptions {
  /** When false, strip all colour (used for --ci). Defaults to true. */
  color?: boolean;
}

const TOOL_NAME = "dpdp-cookie-scan";

export function renderTerminal(sr: ScanResult, opts: TerminalOptions = {}): string {
  const useColor = opts.color ?? true;
  const c = useColor ? pc : noColor;
  const lines: string[] = [];

  const host = hostOf(sr.target.url);
  lines.push(
    `${c.bold(TOOL_NAME)}  ${host}     interpretation as of ${sr.interpretation_as_of}`,
  );
  lines.push("");

  const byTier = groupByTier(sr.findings);
  for (const tier of ["settled", "arguable", "open"] as const) {
    const fs = byTier[tier];
    if (fs.length === 0) continue;
    lines.push(
      `${c.bold(tier.toUpperCase())} (${fs.length})`.padEnd(48) +
        `enforceable ${earliestEnforceable(fs)}`,
    );
    for (const f of fs) {
      lines.push(renderFindingLine(f, c));
    }
    lines.push("");
  }

  if (sr.questions.length > 0) {
    lines.push(`${c.bold("QUESTIONS")} (${sr.questions.length})`);
    for (const q of sr.questions) {
      lines.push(renderQuestionLine(q, c));
    }
    lines.push("");
  }

  lines.push(
    `${sr.summary.third_parties} third parties · ${sr.summary.third_parties_outside_india} outside India · ${sr.summary.fired_before_banner} fired before the banner`,
  );
  lines.push(`Rationale for each rule: https://sentinel.vettam.ai/rules/<id>`);
  lines.push(`Notice content checks: run dpdp-notice-lint against your published notice.`);
  lines.push("");
  lines.push("Indicative, not legal advice. Not a compliance verdict.");

  return lines.join("\n");
}

function renderFindingLine(f: Finding, c: PicocolorsLike): string {
  const title = f.tracker ? `${f.tracker.vendor} (${f.tracker.id})` : f.title;
  const left = `  ${f.rule_id}  ${title}`;
  const provisions = f.provisions.join(" ");
  const gap = Math.max(2, 60 - left.length);
  return `${left}${" ".repeat(gap)}${provisions}`;
}

function renderQuestionLine(q: Question, c: PicocolorsLike): string {
  const left = `  ${q.rule_id}  ${q.prompt}`;
  const provisions = q.provisions.join(" ");
  const gap = Math.max(2, 60 - left.length);
  return `${left}${" ".repeat(gap)}${provisions}`;
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

interface PicocolorsLike {
  bold: (s: string) => string;
}
const noColor: PicocolorsLike = { bold: (s) => s };
