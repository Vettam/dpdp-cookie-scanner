import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "docs", "legal-sources");

/** Spec §0.4 / §12: the Gazette instruments that ground every rule. */
const GAZETTES: Array<{ file: string; citation: string }> = [
  { file: "DPDP Act 2023.pdf", citation: "Act 22 of 2023" },
  { file: "DPDP Rules 2025.pdf", citation: "G.S.R. 846(E)" },
  { file: "DPDP Rules 2025 Corrigendum.pdf", citation: "G.S.R. 892(E)" },
  { file: "DPDP Enforcement Timeline.pdf", citation: "G.S.R. 843(E)" },
];

describe("primary legal texts (spec §0.4)", () => {
  it("ships the Act, Rules, corrigendum and commencement notification as PDFs", () => {
    for (const g of GAZETTES) {
      const path = join(dir, g.file);
      expect(existsSync(path), `missing ${g.file}`).toBe(true);
      const header = readFileSync(path).subarray(0, 5).toString("latin1");
      expect(header, `${g.file} is not a PDF`).toBe("%PDF-");
    }
  });

  it("indexes those Gazettes in docs/legal-sources/README.md", () => {
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    for (const g of GAZETTES) {
      expect(readme).toContain(g.file);
      expect(readme).toContain(g.citation);
    }
    expect(readme).toMatch(/Gazette wins/i);
  });
});
