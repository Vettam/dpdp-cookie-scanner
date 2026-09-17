/**
 * Convert DB-IP Lite country CSV into the packed lookup used at runtime.
 * Maintainer-only: not invoked by users or CI. Run:
 *   npx tsx scripts/build-geo.ts /path/to/dbip-country-lite-YYYY-MM.csv.gz
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { encodeGeoDb, packCc, type GeoDb } from "../src/geo/lookup.js";

function parseV4(ip: string): number | undefined {
  const parts = ip.split(".");
  if (parts.length !== 4) return undefined;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return undefined;
    n = (n * 256 + o) >>> 0;
  }
  return n;
}

function parseV6(ip: string): Uint8Array | undefined {
  const halves = ip.split("::");
  if (halves.length > 2) return undefined;
  const grp = (s: string): number[] => (s.length === 0 ? [] : s.split(":").map((g) => Number.parseInt(g, 16)));
  let head = grp(halves[0] ?? "");
  let tail = halves.length === 2 ? grp(halves[1] ?? "") : [];
  if (head.some((n) => Number.isNaN(n)) || tail.some((n) => Number.isNaN(n))) return undefined;
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return undefined;
  if (halves.length === 2) head = head.concat(new Array(missing).fill(0));
  else if (head.length !== 8) return undefined;
  const words = head.concat(tail);
  if (words.length !== 8) return undefined;
  const out = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    out[i * 2] = (words[i]! >> 8) & 0xff;
    out[i * 2 + 1] = words[i]! & 0xff;
  }
  return out;
}

function add1v4(n: number): number {
  return (n + 1) >>> 0;
}

function add1v6(addr: Uint8Array): Uint8Array {
  const out = Uint8Array.from(addr);
  for (let i = 15; i >= 0; i--) {
    out[i] = (out[i]! + 1) & 0xff;
    if (out[i] !== 0) break;
  }
  return out;
}

function eq16(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false;
  return true;
}

function countryCode(raw: string): number {
  const cc = raw.trim().toUpperCase();
  if (cc.length !== 2 || cc === "ZZ" || cc === "A1" || cc === "A2" || cc === "O1") return 0;
  return packCc(cc);
}

interface V4Run {
  start: number;
  end: number;
  cc: number;
}
interface V6Run {
  start: Uint8Array;
  end: Uint8Array;
  cc: number;
}

async function readCsv(path: string): Promise<{ v4: V4Run[]; v6: V6Run[] }> {
  const rl = createInterface({
    input: path.endsWith(".gz")
      ? createReadStream(path).pipe(createGunzip())
      : createReadStream(path),
    crlfDelay: Infinity,
  });
  const v4: V4Run[] = [];
  const v6: V6Run[] = [];
  for await (const line of rl) {
    if (!line) continue;
    const parts = line.split(",");
    if (parts.length < 3) continue;
    const startS = parts[0]!.replaceAll('"', "");
    const endS = parts[1]!.replaceAll('"', "");
    const cc = countryCode(parts[2]!.replaceAll('"', ""));
    const v4s = parseV4(startS);
    const v4e = parseV4(endS);
    if (v4s !== undefined && v4e !== undefined) {
      v4.push({ start: v4s, end: v4e, cc });
      continue;
    }
    const v6s = parseV6(startS);
    const v6e = parseV6(endS);
    if (v6s && v6e) v6.push({ start: v6s, end: v6e, cc });
  }
  return { v4, v6 };
}

function packV4(runs: V4Run[]): { start: Uint32Array; cc: Uint16Array } {
  const starts: number[] = [];
  const ccs: number[] = [];
  let last: V4Run | undefined;
  const flush = (nextStart?: number) => {
    if (!last) return;
    starts.push(last.start);
    ccs.push(last.cc);
    if (nextStart !== undefined && add1v4(last.end) !== nextStart) {
      starts.push(add1v4(last.end));
      ccs.push(0);
    }
  };
  for (const r of runs) {
    if (last && last.cc === r.cc && add1v4(last.end) === r.start) {
      last.end = r.end;
      continue;
    }
    flush(r.start);
    last = { ...r };
  }
  flush();
  return { start: Uint32Array.from(starts), cc: Uint16Array.from(ccs) };
}

function packV6(runs: V6Run[]): { start: Uint8Array; cc: Uint16Array } {
  const starts: Uint8Array[] = [];
  const ccs: number[] = [];
  let last: V6Run | undefined;
  const flush = (nextStart?: Uint8Array) => {
    if (!last) return;
    starts.push(last.start);
    ccs.push(last.cc);
    if (nextStart && !eq16(add1v6(last.end), nextStart)) {
      starts.push(add1v6(last.end));
      ccs.push(0);
    }
  };
  for (const r of runs) {
    if (last && last.cc === r.cc && eq16(add1v6(last.end), r.start)) {
      last.end = r.end;
      continue;
    }
    flush(r.start);
    last = { start: r.start, end: r.end, cc: r.cc };
  }
  flush();
  const buf = new Uint8Array(starts.length * 16);
  for (let i = 0; i < starts.length; i++) buf.set(starts[i]!, i * 16);
  return { start: buf, cc: Uint16Array.from(ccs) };
}

async function main() {
  const src = process.argv[2];
  if (!src) {
    process.stderr.write("usage: tsx scripts/build-geo.ts <dbip-country-lite-YYYY-MM.csv.gz>\n");
    process.exit(2);
  }
  const ym = src.match(/(\d{4})-(\d{2})/);
  const date = ym ? `${ym[1]}-${ym[2]}-01` : "1970-01-01";
  const { v4, v6 } = await readCsv(src);
  const packed4 = packV4(v4);
  const packed6 = packV6(v6);
  const db: GeoDb = {
    date,
    source: "DB-IP Lite",
    v4Start: packed4.start,
    v4Cc: packed4.cc,
    v6Start: packed6.start,
    v6Cc: packed6.cc,
  };
  const outDir = join(process.cwd(), "data", "geo");
  const bin = encodeGeoDb(db);
  writeFileSync(join(outDir, "dbip-country.bin.gz"), bin);
  writeFileSync(join(outDir, "VERSION"), `${date}\n`);
  process.stdout.write(
    `wrote data/geo/dbip-country.bin.gz (${bin.length} bytes) v4=${packed4.start.length} v6=${packed6.cc.length} date=${date}\n`,
  );
}

await main();
