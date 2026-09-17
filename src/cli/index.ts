import { defineCommand, runMain } from "citty";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execute, type CliArgs } from "./execute.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDir = join(rootDir, "rules");
const trackersDir = join(rootDir, "trackers");

const command = defineCommand({
  meta: {
    name: "dpdp-cookie-scan",
    version: "0.1.0",
    description:
      "Scan a page for tracking and map each observation to the DPDP Act 2023 / Rules 2025 provisions it engages.",
  },
  args: {
    url: { type: "positional", required: false, description: "URL to scan" },
    json: { type: "boolean", description: "write findings.json (default in --ci)" },
    md: { type: "boolean", description: "write findings.md" },
    out: { type: "string", default: "./dpdp-scan", description: "output directory" },
    ci: { type: "boolean", description: "machine mode: no colour, JSON always, exit 0" },
    gpc: { type: "boolean", description: "send Sec-GPC: 1 and evaluate DPDP-C-050" },
    includeQuery: { type: "boolean", description: "keep query strings in request evidence" },
    screenshot: { type: "boolean", description: "save a viewport screenshot" },
    timeout: { type: "string", default: "15000", description: "navigation timeout (ms)" },
    settle: { type: "string", default: "3000", description: "post-load settle wait (ms)" },
    rulesVersion: { type: "boolean", description: "print catalogue version and exit" },
    browser: { type: "string", default: "", description: "Chrome/Edge/Chromium binary path" },
  },
  run: async ({ args }) => {
    const cliArgs: CliArgs = {
      url: (args.url as string | undefined) ?? "",
      json: Boolean(args.json),
      md: Boolean(args.md),
      out: args.out,
      ci: Boolean(args.ci),
      gpc: Boolean(args.gpc),
      includeQuery: Boolean(args.includeQuery),
      screenshot: Boolean(args.screenshot),
      timeout: Number(args.timeout),
      settle: Number(args.settle),
      rulesVersion: Boolean(args.rulesVersion),
      browser: args.browser,
    };
    const code = await execute(cliArgs, {
      stdout: { write: (s) => process.stdout.write(s) },
      stderr: { write: (s) => process.stderr.write(s) },
      exit: (c) => process.exit(c),
      writeFile: (path, data) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, data);
      },
      mkdir: (p) => mkdirSync(p, { recursive: true }),
      rulesDir,
      trackersDir,
    });
    process.exit(code);
  },
});

runMain(command);
