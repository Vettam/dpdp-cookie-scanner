import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as {
  name: string;
  bin: Record<string, string>;
};
const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
const actionReadme = readFileSync(join(process.cwd(), "action", "README.md"), "utf8");
const skill = readFileSync(join(process.cwd(), "skill", "SKILL.md"), "utf8");

const NPX_SCAN = "npx --package=dpdp-cookie-scanner dpdp-cookie-scan";
const NPX_LINT = "npx --package=dpdp-cookie-scanner dpdp-notice-lint";

describe("npx install contract", () => {
  it("registers the package name as an alias of the scan command", () => {
    expect(pkg.bin["dpdp-cookie-scan"]).toBe("./dist/cli.js");
    expect(pkg.bin["dpdp-notice-lint"]).toBe("./dist/notice-cli.js");
    expect(pkg.bin[pkg.name]).toBe(pkg.bin["dpdp-cookie-scan"]);
  });

  it("documents package vs command in the public READMEs and skill", () => {
    expect(readme).toContain(NPX_SCAN);
    expect(readme).toContain(NPX_LINT);
    expect(readme).toMatch(/package.*command/i);
    expect(actionReadme).toContain(NPX_SCAN);
    expect(skill).toContain(NPX_SCAN);
  });
});
