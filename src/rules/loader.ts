import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { validateRule, type Rule } from "./schema.js";

export interface RuleFailure {
  file: string;
  error: string;
}

export class RuleLoadError extends Error {
  failures: RuleFailure[];
  constructor(failures: RuleFailure[]) {
    super(`rule catalogue failed to load (${failures.length} failure(s))`);
    this.name = "RuleLoadError";
    this.failures = failures;
  }
}

/**
 * Load and validate every `*.yaml` / `*.yml` rule file in `dir`. Validation runs
 * at load time, not only at build (spec §3.2). Any invalid file causes a
 * RuleLoadError carrying every failure so the operator sees them all at once.
 */
export async function loadRules(dir: string): Promise<Rule[]> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();
  const failures: RuleFailure[] = [];
  const rules: Rule[] = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), "utf8");
    const doc = parseYaml(text);
    const result = validateRule(doc);
    if (result.ok) {
      rules.push(result.value);
    } else {
      failures.push({ file, error: result.error.message });
    }
  }
  if (failures.length > 0) throw new RuleLoadError(failures);
  return rules;
}

export function readRulesVersion(dir: string): string {
  return readFileSync(join(dir, "VERSION"), "utf8").trim();
}
