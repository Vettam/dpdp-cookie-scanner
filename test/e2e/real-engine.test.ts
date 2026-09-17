import { describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/index.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "test", "fixtures");

function startServer(): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const file = req.url === "/" ? "/dod.html" : req.url ?? "/dod.html";
      try {
        const body = await readFile(join(fixturesDir, file));
        res.writeHead(200, { "content-type": "text/html" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ url: `http://localhost:${port}/dod.html`, close: () => server.close() });
    });
  });
}

const enabled = process.env["DPDP_E2E"] === "1";

describe.skipIf(!enabled)("real engine end-to-end (opt-in: DPDP_E2E=1)", () => {
  it("scans the fixture page and finds the expected settled rules + the C-040 question", async () => {
    const server = await startServer();
    try {
      const sr = await scan(server.url, { timeout: 15000, settle: 2000 });
      const ids = sr.findings.map((f) => f.rule_id);
      expect(ids).toContain("DPDP-C-001");
      expect(ids).toContain("DPDP-C-004");
      expect(ids).toContain("DPDP-C-007");
      expect(sr.questions.map((q) => q.rule_id)).toContain("DPDP-C-040");
    } finally {
      server.close();
    }
  }, 60000);
});
