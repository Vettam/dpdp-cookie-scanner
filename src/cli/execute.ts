import { join } from "node:path";
import { scan, type ScanRunOptions } from "../index.js";
import { renderTerminal } from "../report/terminal.js";
import { renderJson } from "../report/json.js";
import { renderMarkdown } from "../report/markdown.js";
import type { ScanEngine } from "../engine/types.js";
import { readRulesVersion } from "../rules/loader.js";
import { readTrackersVersion } from "../trackers/loader.js";

export interface CliArgs {
  url: string;
  json: boolean;
  md: boolean;
  out: string;
  ci: boolean;
  gpc: boolean;
  includeQuery: boolean;
  screenshot: boolean;
  timeout: number;
  settle: number;
  rulesVersion: boolean;
  browser: string;
}

export interface CliDeps {
  stdout: { write: (s: string) => void };
  stderr: { write: (s: string) => void };
  exit: (code: number) => void;
  writeFile: (path: string, data: string) => void;
  mkdir: (path: string) => void;
  engine?: ScanEngine;
  rulesDir: string;
  trackersDir: string;
}

export async function execute(args: CliArgs, deps: CliDeps): Promise<number> {
  if (args.rulesVersion) {
    deps.stdout.write(readRulesVersion(deps.rulesDir) + "\n");
    return 0;
  }

  if (!args.url) {
    deps.stderr.write("usage: dpdp-cookie-scan <url> [options]\n");
    deps.exit(2);
    return 2;
  }

  try {
    const scanOpts: ScanRunOptions = {
      rulesDir: deps.rulesDir,
      trackersDir: deps.trackersDir,
      gpc: args.gpc,
      includeQuery: args.includeQuery,
      screenshot: args.screenshot,
      timeout: args.timeout,
      settle: args.settle,
    };
    if (deps.engine) scanOpts.engine = deps.engine;
    if (args.browser) scanOpts.browserPath = args.browser;
    if (args.screenshot) {
      deps.mkdir(args.out);
      scanOpts.screenshotPath = join(args.out, "screenshot.png");
    }
    const sr = await scan(args.url, scanOpts);

    const useColor = !args.ci;
    const terminal = renderTerminal(sr, { color: useColor });

    if (args.ci || args.json) {
      deps.mkdir(args.out);
      deps.writeFile(join(args.out, "findings.json"), renderJson(sr));
    }
    if (args.ci || args.md) {
      deps.mkdir(args.out);
      deps.writeFile(join(args.out, "findings.md"), renderMarkdown(sr));
    }

    if (args.ci) {
      deps.stdout.write(`${sr.summary.third_parties} third parties · ${sr.summary.fired_before_banner} fired before the banner\n`);
    } else {
      deps.stdout.write(terminal + "\n");
    }

    if (args.includeQuery && !args.ci) {
      deps.stderr.write("warning: --include-query keeps query strings in evidence; do not share this output.\n");
    }

    return 0;
  } catch (e) {
    deps.stderr.write(`error: ${(e as Error).message}\n`);
    deps.exit(3);
    return 3;
  }
}

// Keep these imported so the bundle includes the version readers for --rules-version.
void readTrackersVersion;
