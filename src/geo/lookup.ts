/**
 * Offline IP-to-country lookup against a bundled DB-IP Lite extract.
 * No network call at runtime (spec §3.2, §4.2).
 */

import { gunzipSync, gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const GEO_SOURCE = "DB-IP Lite";

export interface GeoDb {
  date: string;
  source: string;
  v4Start: Uint32Array;
  v4Cc: Uint16Array;
  v6Start: Uint8Array;
  v6Cc: Uint16Array;
}

const MAGIC = Buffer.from("DPG1");
const DATE_LEN = 10;
let bundled: GeoDb | undefined;

function packCc(cc: string): number {
  if (!cc || cc.length < 2) return 0;
  return ((cc.charCodeAt(0) & 0xff) << 8) | (cc.charCodeAt(1) & 0xff);
}

function unpackCc(n: number): string {
  if (n === 0) return "";
  return String.fromCharCode((n >> 8) & 0xff, n & 0xff);
}

export function encodeGeoDb(db: GeoDb): Buffer {
  const date = db.date.slice(0, DATE_LEN).padEnd(DATE_LEN, " ");
  const v4Count = db.v4Start.length;
  const v6Count = db.v6Cc.length;
  const header = 4 + DATE_LEN + 4 + 4;
  const buf = Buffer.alloc(header + v4Count * 6 + v6Count * 18);
  MAGIC.copy(buf, 0);
  buf.write(date, 4, DATE_LEN, "ascii");
  buf.writeUInt32LE(v4Count, 14);
  buf.writeUInt32LE(v6Count, 18);
  let off = 22;
  for (let i = 0; i < v4Count; i++) {
    buf.writeUInt32BE(db.v4Start[i]!, off);
    buf.writeUInt16BE(db.v4Cc[i]!, off + 4);
    off += 6;
  }
  for (let i = 0; i < v6Count; i++) {
    Buffer.from(db.v6Start.buffer, db.v6Start.byteOffset + i * 16, 16).copy(buf, off);
    buf.writeUInt16BE(db.v6Cc[i]!, off + 16);
    off += 18;
  }
  return gzipSync(buf);
}

export function decodeGeoDb(packed: Buffer): GeoDb {
  const raw = packed[0] === 0x1f && packed[1] === 0x8b ? gunzipSync(packed) : packed;
  if (raw.subarray(0, 4).toString("ascii") !== "DPG1") {
    throw new Error("geo db: bad magic");
  }
  const date = raw.subarray(4, 14).toString("ascii").trim();
  const v4Count = raw.readUInt32LE(14);
  const v6Count = raw.readUInt32LE(18);
  const v4Start = new Uint32Array(v4Count);
  const v4Cc = new Uint16Array(v4Count);
  let off = 22;
  for (let i = 0; i < v4Count; i++) {
    v4Start[i] = raw.readUInt32BE(off);
    v4Cc[i] = raw.readUInt16BE(off + 4);
    off += 6;
  }
  const v6Start = new Uint8Array(v6Count * 16);
  const v6Cc = new Uint16Array(v6Count);
  for (let i = 0; i < v6Count; i++) {
    raw.copy(v6Start, i * 16, off, off + 16);
    v6Cc[i] = raw.readUInt16BE(off + 16);
    off += 18;
  }
  return { date, source: GEO_SOURCE, v4Start, v4Cc, v6Start, v6Cc };
}

export function defaultGeoPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "..", "data", "geo", "dbip-country.bin.gz"), // dist/cli.js
    join(here, "..", "..", "data", "geo", "dbip-country.bin.gz"), // src/geo/
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0]!;
}

export function loadGeoDb(path = defaultGeoPath()): GeoDb {
  return decodeGeoDb(readFileSync(path));
}

export function loadBundledGeo(): GeoDb {
  if (!bundled) bundled = loadGeoDb();
  return bundled;
}

export function geoMeta(db?: GeoDb): { source: string; date: string } {
  const d = db ?? bundled;
  return { source: GEO_SOURCE, date: d?.date ?? "" };
}

function isPrivateV4(n: number): boolean {
  if (n >>> 24 === 10) return true;
  if (n >>> 24 === 127) return true;
  if (n >>> 24 === 0) return true;
  if (n >>> 24 === 224) return true; // multicast+
  if ((n >>> 16) === 0xc0a8) return true; // 192.168/16
  if ((n >>> 16) === 0xa9fe) return true; // 169.254/16
  if ((n >>> 20) === 0xac1) return true; // 172.16/12
  return false;
}

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
  if (ip.includes(".")) {
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return undefined; // handled as v4 by caller
  }
  const halves = ip.split("::");
  if (halves.length > 2) return undefined;
  const parseGroup = (s: string): number[] => {
    if (s.length === 0) return [];
    return s.split(":").map((g) => {
      const n = Number.parseInt(g, 16);
      return Number.isFinite(n) ? n : NaN;
    });
  };
  let head = parseGroup(halves[0] ?? "");
  let tail = halves.length === 2 ? parseGroup(halves[1] ?? "") : [];
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

function cmp16(a: Uint8Array, aOff: number, b: Uint8Array): number {
  for (let i = 0; i < 16; i++) {
    const d = a[aOff + i]! - b[i]!;
    if (d !== 0) return d;
  }
  return 0;
}

function searchV4(n: number, db: GeoDb): string {
  const starts = db.v4Start;
  let lo = 0;
  let hi = starts.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (starts[mid]! <= n) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) return "";
  return unpackCc(db.v4Cc[idx]!);
}

function searchV6(addr: Uint8Array, db: GeoDb): string {
  const n = db.v6Cc.length;
  if (n === 0) return "";
  let lo = 0;
  let hi = n - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const c = cmp16(db.v6Start, mid * 16, addr);
    if (c <= 0) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) return "";
  return unpackCc(db.v6Cc[idx]!);
}

export function lookupCountry(ip: string, db: GeoDb): string {
  const trimmed = ip.trim();
  if (!trimmed) return "";
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const v4src = mapped ? mapped[1]! : trimmed;
  const v4 = parseV4(v4src);
  if (v4 !== undefined) {
    if (isPrivateV4(v4)) return "";
    return searchV4(v4, db);
  }
  const v6 = parseV6(trimmed);
  if (!v6) return "";
  const isLoopback = v6.every((b, i) => (i === 15 ? b === 1 : b === 0));
  const isUnspecified = v6.every((b) => b === 0);
  const isLinkLocal = v6[0] === 0xfe && (v6[1]! & 0xc0) === 0x80;
  const isUla = (v6[0]! & 0xfe) === 0xfc;
  if (isLoopback || isUnspecified || isLinkLocal || isUla) return "";
  return searchV6(v6, db);
}

/** Encode a 2-letter country code the way the packed db stores it. Exported for the builder. */
export { packCc, unpackCc };
