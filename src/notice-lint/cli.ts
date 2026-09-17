import { defineCommand, runMain } from "citty";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { executeNoticeLint, type NoticeLintArgs } from "./execute.js";
import { loadNoticeText } from "./fetch.js";
import { loadTrackers } from "../trackers/loader.js";
import type { ScanResult } from "../types.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const trackersDir = join(rootDir, "trackers");

async function loadScanResult(path: string): Promise<ScanResult | undefined> {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as ScanResult;
}

const command = defineCommand({
  meta: {
    name: "dpdp-notice-lint",
    version: "0.2.0",
    description: "Check a published privacy notice's content against DPDP Rule 3 (itemisation, withdrawal, grievance, bilingual).",
  },
  args: {
    notice: { type: "positional", required: false, description: "notice URL or local file path" },
    scan: { type: "string", description: "path to a findings.json from dpdp-cookie-scan, to drive itemisation checks" },
    json: { type: "boolean", description: "write notice-lint.json" },
    out: { type: "string", default: "./notice-lint-out", description: "output directory" },
    ci: { type: "boolean", description: "machine mode: no colour, JSON always" },
  },
  run: async ({ args }) => {
    const trackers = await loadTrackers(trackersDir);
    const cliArgs: NoticeLintArgs = {
      notice: (args.notice as string | undefined) ?? "",
      scan: args.scan,
      json: Boolean(args.json),
      out: args.out,
      ci: Boolean(args.ci),
    };
    const code = await executeNoticeLint(cliArgs, {
      stdout: { write: (s) => process.stdout.write(s) },
      stderr: { write: (s) => process.stderr.write(s) },
      exit: (c) => process.exit(c),
      writeFile: (path, data) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, data);
      },
      mkdir: (p) => mkdirSync(p, { recursive: true }),
      loadNotice: (src) => loadNoticeText(src),
      loadScanResult: async (p) => loadScanResult(p),
      trackers,
    });
    process.exit(code);
  },
});

runMain(command);
