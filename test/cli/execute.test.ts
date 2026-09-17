import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { execute, type CliArgs, type CliDeps } from "../../src/cli/execute.js";
import { FixtureEngine } from "../../src/engine/fixture.js";

const rulesDir = join(process.cwd(), "rules");
const trackersDir = join(process.cwd(), "trackers");

function makeDeps(): CliDeps {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode = -1;
  const files = new Map<string, string>();
  const deps: CliDeps = {
    stdout: { write: (s: string) => out.push(s) },
    stderr: { write: (s: string) => err.push(s) },
    exit: (c: number) => {
      exitCode = c;
    },
    writeFile: (path: string, data: string) => files.set(path, data),
    mkdir: (_p: string) => {},
    engine: new FixtureEngine(
      new Map<string, unknown[]>([
        [
          "https://staging.acme.in",
          [
            {
              type: "meta", timestamp_ms: 0, before_first_paint: true, before_banner_detected: true,
              url: "https://staging.acme.in", final_url: "https://staging.acme.in/",
              page_language: "en", title: "Acme", scan_started_at: "2026-09-17T09:12:00.000Z",
              engine_version: "0.1.0", rules_version: "0.1.0", trackers_version: "0.1.0",
              geo_source: "DB-IP Lite", geo_date: "2026-09-01",
            },
            {
              type: "request", timestamp_ms: 412, before_first_paint: true, before_banner_detected: true,
              method: "GET", host: "www.facebook.com", path: "/tr",
              initiator_host: "www.googletagmanager.com", resource_type: "image",
              is_third_party: true, destination_country: "US",
            },
            {
              type: "banner", timestamp_ms: 2000, before_first_paint: false, before_banner_detected: false,
              detected: true, has_accept: true, has_reject: false, has_settings: false,
              has_pre_ticked: false, has_language_switcher: false, mentions_legitimate_interest: false,
              implies_consent_by_browsing: false, text_excerpt: "", detection_confidence: "high",
            },
          ],
        ],
      ]) as never,
    ),
    rulesDir,
    trackersDir,
  };
  return { deps, getOut: () => out.join(""), getErr: () => err.join(""), getExit: () => exitCode, getFiles: () => files };
}

function args(over: Partial<CliArgs> = {}): CliArgs {
  return {
    url: "https://staging.acme.in",
    json: false,
    md: false,
    out: "./dpdp-scan",
    ci: false,
    gpc: false,
    includeQuery: false,
    screenshot: false,
    timeout: 15000,
    settle: 3000,
    rulesVersion: false,
    browser: "",
    ...over,
  };
}

describe("execute", () => {
  it("prints the terminal report and exits 0 by default", async () => {
    const { deps, getOut } = makeDeps();
    const code = await execute(args(), deps);
    expect(code).toBe(0);
    expect(getOut()).toContain("SETTLED");
    expect(getOut()).toContain("staging.acme.in");
  });

  it("exits 2 on a usage error (no url)", async () => {
    const { deps, getErr } = makeDeps();
    const code = await execute(args({ url: "" }), deps);
    expect(code).toBe(2);
    expect(getErr()).toContain("usage");
  });

  it("writes findings.json and findings.md in --ci mode and exits 0", async () => {
    const { deps, getFiles } = makeDeps();
    const code = await execute(args({ ci: true, out: "./out" }), deps);
    expect(code).toBe(0);
    expect(getFiles().has(join("./out", "findings.json"))).toBe(true);
    expect(getFiles().has(join("./out", "findings.md"))).toBe(true);
  });

  it("writes findings.json when --json is set", async () => {
    const { deps, getFiles } = makeDeps();
    await execute(args({ json: true, out: "./out2" }), deps);
    expect(getFiles().has(join("./out2", "findings.json"))).toBe(true);
  });

  it("prints the rules version and exits 0 when --rules-version is set", async () => {
    const { deps, getOut } = makeDeps();
    const code = await execute(args({ rulesVersion: true, url: "" }), deps);
    expect(code).toBe(0);
    expect(getOut()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("never prints rupee figures in terminal output", async () => {
    const { deps, getOut } = makeDeps();
    await execute(args(), deps);
    expect(getOut()).not.toMatch(/₹|crore/i);
  });
});
