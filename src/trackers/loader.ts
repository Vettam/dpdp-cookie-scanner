import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { validateTracker, type Tracker } from "./schema.js";

export interface TrackerFailure {
  file: string;
  error: string;
}

export class TrackerLoadError extends Error {
  failures: TrackerFailure[];
  constructor(failures: TrackerFailure[]) {
    super(`tracker dataset failed to load (${failures.length} failure(s))`);
    this.name = "TrackerLoadError";
    this.failures = failures;
  }
}

export async function loadTrackers(dir: string): Promise<Tracker[]> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();
  const failures: TrackerFailure[] = [];
  const trackers: Tracker[] = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), "utf8");
    const doc = parseYaml(text);
    const result = validateTracker(doc);
    if (result.ok) {
      trackers.push(result.value);
    } else {
      failures.push({ file, error: result.error.message });
    }
  }
  if (failures.length > 0) throw new TrackerLoadError(failures);
  return trackers;
}

export function readTrackersVersion(dir: string): string {
  return readFileSync(join(dir, "VERSION"), "utf8").trim();
}
