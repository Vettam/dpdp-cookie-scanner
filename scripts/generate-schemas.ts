/**
 * Build-time generator: emits JSON Schemas from the Zod schemas so they can be
 * published in the repo (spec §3.2). Run via `npm run gen:schemas`.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ruleJsonSchema } from "../src/rules/schema.js";
import { trackerJsonSchema } from "../src/trackers/schema.js";
import { scanResultJsonSchema, scanResultDiffJsonSchema } from "../src/types.js";

mkdirSync("rules", { recursive: true });
mkdirSync("trackers", { recursive: true });
mkdirSync("schema", { recursive: true });

writeFileSync("rules/schema.json", JSON.stringify(ruleJsonSchema(), null, 2) + "\n");
writeFileSync(
  "trackers/schema.json",
  JSON.stringify(trackerJsonSchema(), null, 2) + "\n",
);
writeFileSync(
  "schema/scanresult.schema.json",
  JSON.stringify(scanResultJsonSchema(), null, 2) + "\n",
);
writeFileSync(
  "schema/scanresult-diff.schema.json",
  JSON.stringify(scanResultDiffJsonSchema(), null, 2) + "\n",
);

console.log(
  "schemas written: rules/schema.json, trackers/schema.json, schema/scanresult.schema.json, schema/scanresult-diff.schema.json",
);
