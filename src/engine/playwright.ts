import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ScanEngine, ScanOptions } from "./types.js";
import { applyDestinationCountries } from "./geo.js";
import { geoMeta, loadBundledGeo, type GeoDb } from "../geo/lookup.js";
import { redactBannerText } from "./redact.js";
import { applyBeforeFirstPaint, redirectChain } from "./timing.js";
import {
  ACCEPT_BUTTON_SELECTORS,
  BANNER_VOCAB,
  BUTTON_SCORE_PATTERNS,
  CMP_SIGNATURES,
  REJECT_BUTTON_SELECTORS,
  interpretBanner,
  type ButtonScorePattern,
} from "./banner.js";
import { fingerprintInitScript } from "./fingerprint.js";
import type {
  ApiCallObservation,
  BannerObservation,
  CookieObservation,
  EmbedObservation,
  MetaObservation,
  Observation,
  RequestObservation,
  StorageObservation,
} from "../types.js";

/**
 * Real engine using playwright-core (not playwright). Detects an existing
 * system Chrome/Edge and uses it; downloads Chromium only as a fallback, with
 * a one-time message (spec §3.2). No outbound calls other than the target
 * URL and its subresources.
 */

interface BrowserPath {
  executablePath: string;
  channel: "chrome" | "msedge" | "chromium";
}

function detectSystemBrowser(browserPath?: string): BrowserPath {
  if (browserPath && existsSync(browserPath)) {
    return { executablePath: browserPath, channel: "chromium" };
  }
  const platform = process.platform;
  const candidates: BrowserPath[] = [];
  if (platform === "darwin") {
    candidates.push(
      { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", channel: "chrome" },
      { executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", channel: "chromium" },
      { executablePath: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", channel: "msedge" },
      { executablePath: "/Applications/Chromium.app/Contents/MacOS/Chromium", channel: "chromium" },
    );
  } else if (platform === "win32") {
    const pf = process.env["PROGRAMFILES"] ?? "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    candidates.push(
      { executablePath: join(pf, "Google", "Chrome", "Application", "chrome.exe"), channel: "chrome" },
      { executablePath: join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"), channel: "msedge" },
    );
  } else {
    candidates.push(
      { executablePath: "/usr/bin/google-chrome", channel: "chrome" },
      { executablePath: "/usr/bin/chromium", channel: "chromium" },
      { executablePath: "/usr/bin/microsoft-edge", channel: "msedge" },
    );
  }
  for (const c of candidates) {
    if (existsSync(c.executablePath)) return c;
  }
  process.stderr.write(
    "dpdp-cookie-scan: no system Chrome/Edge found; downloading Chromium as a fallback (one-time).\n",
  );
  return { executablePath: "", channel: "chromium" };
}

export const defaultEngine: ScanEngine = {
  async scan(url, options = {}) {
    const { chromium } = await import("playwright-core");
    const detected = detectSystemBrowser(options.browserPath);
    const launchOptions: Record<string, unknown> = { headless: true };
    if (detected.executablePath) launchOptions["executablePath"] = detected.executablePath;
    else launchOptions["channel"] = "chromium";

    const browser = await chromium.launch(launchOptions);
    const contextOptions: Record<string, unknown> = {};
    if (options.gpc) contextOptions["extraHTTPHeaders"] = { "Sec-GPC": "1" };
    const context = await browser.newContext(contextOptions);
    // Instrument fingerprinting APIs before any page script runs (C-060).
    await context.addInitScript(fingerprintInitScript());
    const observations: Observation[] = [];
    const pageUrl = new URL(url);
    const targetHost = pageUrl.host;
    const navStart = Date.now();
    const page = await context.newPage();
    const hops: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) hops.push(frame.url());
    });
    const ipByHost = new Map<string, string>();
    let geo: GeoDb | undefined;
    try {
      geo = loadBundledGeo();
    } catch {
      geo = undefined;
    }
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      cdp.on("Network.responseReceived", (ev: { response?: { url?: string; remoteIPAddress?: string } }) => {
        const ip = ev.response?.remoteIPAddress;
        const rawUrl = ev.response?.url;
        if (!ip || !rawUrl) return;
        try {
          const host = new URL(rawUrl).host;
          if (!ipByHost.has(host)) ipByHost.set(host, ip);
        } catch {
          /* ignore malformed */
        }
      });
    } catch {
      /* CDP unavailable — destination_country stays empty; mapper falls back to the tracker dataset */
    }

    page.on("request", (req) => {
      try {
        const u = new URL(req.url());
        const referer = req.headers()["referer"] ?? "";
        const initiator = referer ? new URL(referer).host : "";
        const isThirdParty = u.host !== targetHost && !u.host.endsWith("." + targetHost);
        observations.push({
          type: "request",
          timestamp_ms: Date.now() - navStart,
          before_first_paint: false,
          before_banner_detected: false,
          method: req.method(),
          host: u.host,
          path: options.includeQuery ? u.pathname + u.search : u.pathname,
          initiator_host: initiator,
          resource_type: req.resourceType(),
          is_third_party: isThirdParty,
          destination_country: "",
        } as RequestObservation);
      } catch {
        /* ignore malformed */
      }
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: options.timeout ?? 15000 }).catch(() => {
      /* navigation failure surfaced by the CLI as exit code 3 */
    });
    await page.waitForTimeout(options.settle ?? 3000);

    const banner = await detectBanner(page);
    if (banner) {
      observations.push({
        type: "banner",
        timestamp_ms: Date.now() - navStart,
        before_first_paint: false,
        before_banner_detected: false,
        ...banner,
      } as BannerObservation);
    }

    if (options.bannerAction) {
      await clickConsentButton(page, options.bannerAction);
      await page.waitForTimeout(options.settle ?? 3000);
    }

    const cookies = await context.cookies();
    for (const c of cookies) {
      const setBy = c.domain === targetHost || c.domain.endsWith("." + targetHost) ? "" : c.domain;
      observations.push({
        type: "cookie",
        timestamp_ms: 0,
        before_first_paint: false,
        before_banner_detected: false,
        name: c.name,
        domain: c.domain,
        path: c.path,
        expires: c.expires === -1 ? null : c.expires,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite ?? "",
        first_party: !setBy,
        set_by: setBy,
      } as CookieObservation);
    }

    const storage = await page.evaluate(async () => {
      const out: Array<{ kind: "local" | "session" | "indexeddb"; key: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out.push({ kind: "local", key: k });
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) out.push({ kind: "session", key: k });
      }
      try {
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          for (const d of dbs) {
            if (d.name) out.push({ kind: "indexeddb", key: d.name });
          }
        }
      } catch {
        /* Safari-old / blocked */
      }
      return out;
    });
    for (const s of storage) {
      observations.push({
        type: "storage",
        timestamp_ms: 0,
        before_first_paint: false,
        before_banner_detected: false,
        kind: s.kind,
        key: s.key,
        first_party: true,
      } as StorageObservation);
    }

    // Collect fingerprinting API calls observed during the load (C-060).
    const fpCalls = await page.evaluate(() => {
      const arr = (window as unknown as { __dpdpFp?: string[] }).__dpdpFp ?? [];
      return Array.from(new Set(arr));
    });
    for (const api of fpCalls) {
      observations.push({
        type: "api_call",
        timestamp_ms: 0,
        before_first_paint: false,
        before_banner_detected: false,
        first_party: true,
        api,
      } as ApiCallObservation);
    }

    // Collect third-party <script> embeds and whether they carry SRI (C-062).
    const embeds = await page.evaluate(() => {
      const out: Array<{ src: string; integrity: boolean; kind: "script" | "iframe" | "img" | "font" }> = [];
      for (const s of Array.from(document.scripts)) {
        if (s.src) out.push({ src: s.src, integrity: !!s.integrity, kind: "script" });
      }
      for (const f of Array.from(document.querySelectorAll("iframe"))) {
        if (f.src) out.push({ src: f.src, integrity: false, kind: "iframe" });
      }
      for (const img of Array.from(document.querySelectorAll("img"))) {
        if (img.src) out.push({ src: img.src, integrity: false, kind: "img" });
      }
      for (const link of Array.from(document.querySelectorAll("link"))) {
        const rel = (link.rel || "").toLowerCase();
        const as = (link.getAttribute("as") || "").toLowerCase();
        const type = (link.type || "").toLowerCase();
        if (as === "font" || type.includes("font") || (rel === "preload" && as === "font")) {
          if (link.href) out.push({ src: link.href, integrity: !!link.integrity, kind: "font" });
        }
      }
      return out;
    });
    for (const e of embeds) {
      try {
        const u = new URL(e.src);
        const isThirdParty = u.host !== targetHost && !u.host.endsWith("." + targetHost);
        observations.push({
          type: "embed",
          timestamp_ms: 0,
          before_first_paint: false,
          before_banner_detected: false,
          first_party: !isThirdParty,
          host: u.host,
          kind: e.kind,
          sri: e.integrity,
          is_third_party: isThirdParty,
        } as EmbedObservation);
      } catch {
        /* ignore malformed src */
      }
    }

    if (options.screenshotPath) {
      await page.screenshot({ path: options.screenshotPath, fullPage: false }).catch(() => {
        /* screenshot is best-effort; never fail the scan */
      });
    }

    const firstPaintMs = await page.evaluate(() => {
      const paints = performance.getEntriesByType("paint");
      const fp = paints.find((e) => e.name === "first-paint" || e.name === "first-contentful-paint");
      return fp ? fp.startTime : 0;
    }).catch(() => 0);

    observations.push({
      type: "meta",
      timestamp_ms: 0,
      before_first_paint: true,
      before_banner_detected: true,
      url,
      final_url: page.url(),
      redirects: redirectChain(url, page.url(), hops),
      page_language: await page.evaluate(() => document.documentElement.lang || "en"),
      title: await page.title(),
      scan_started_at: new Date().toISOString(),
      engine_version: "1.0.0",
      rules_version: "0.1.0",
      trackers_version: "0.1.0",
      geo_source: "DB-IP Lite",
      geo_date: geo ? geoMeta(geo).date : "",
      gpc_sent: Boolean(options.gpc),
    } as MetaObservation);

    await browser.close();

    if (geo) applyDestinationCountries(observations, ipByHost, geo);
    applyBeforeFirstPaint(observations, firstPaintMs || null);

    const bannerTime = observations.find((o) => o.type === "banner")?.timestamp_ms ?? Infinity;
    for (const o of observations) {
      if (o.type === "request") {
        (o as RequestObservation).before_banner_detected = o.timestamp_ms < bannerTime;
      }
    }
    return observations;
  },
};

async function detectBanner(
  page: import("playwright-core").Page,
): Promise<Omit<BannerObservation, "type" | "timestamp_ms" | "before_first_paint" | "before_banner_detected"> | null> {
  const raw = await page.evaluate(
    ({ signatures, vocab }: { signatures: { id: string; selectors: string[] }[]; vocab: string[] }) => {
      const extract = (el: Element, cmpId: string | null) => {
        const text = (el.textContent ?? "").trim();
        const buttons = Array.from(el.querySelectorAll("button, a, input[type='submit']"));
        const btnText = buttons.map((b) => (b.textContent ?? "").trim()).join(" ");
        const toggles = Array.from(el.querySelectorAll("input[type='checkbox'], [role='switch']"));
        const hasPreTicked = toggles.some((t) => (t as HTMLInputElement).checked);
        const hasLangSwitcher =
          !!el.querySelector("select, [data-lang], [aria-label*='language' i], [aria-label*='भाषा']") ||
          /हिंदी|english|भाषा/i.test(btnText);
        return { text, btnText, hasPreTicked, hasLangSwitcher, cmpId };
      };

      for (const sig of signatures) {
        for (const sel of sig.selectors) {
          const el = document.querySelector(sel);
          if (el) return extract(el, sig.id);
        }
      }

      const words = vocab.map((w) => w.toLowerCase());
      const elems = Array.from(document.querySelectorAll("div, section, aside, [role='dialog']"));
      for (const el of elems) {
        const cs = window.getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        const text = (el.textContent ?? "").trim();
        if (text.length === 0 || text.length > 4000) continue;
        const lower = text.toLowerCase();
        if (!words.some((w) => lower.includes(w) || text.includes(w))) continue;
        return extract(el, null);
      }
      return null;
    },
    { signatures: CMP_SIGNATURES, vocab: BANNER_VOCAB },
  );
  if (!raw) return null;
  const fields = interpretBanner(raw);
  fields.text_excerpt = redactBannerText(fields.text_excerpt);
  return fields;
}

async function clickConsentButton(
  page: import("playwright-core").Page,
  intent: "accept" | "reject",
): Promise<boolean> {
  const selectors = intent === "accept" ? ACCEPT_BUTTON_SELECTORS : REJECT_BUTTON_SELECTORS;
  const patterns = BUTTON_SCORE_PATTERNS[intent];
  return page.evaluate(
    ({
      selectors,
      patterns,
    }: {
      selectors: string[];
      patterns: ButtonScorePattern[];
    }) => {
      const clickEl = (el: Element): boolean => {
        if (el instanceof HTMLElement) {
          el.click();
          return true;
        }
        return false;
      };
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && clickEl(el)) return true;
      }
      const nodes = Array.from(
        document.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']"),
      );
      let best: { el: Element; score: number } | null = null;
      for (const n of nodes) {
        const raw =
          n instanceof HTMLInputElement ? n.value : ((n as HTMLElement).textContent ?? "");
        const text = raw.replace(/\s+/g, " ").trim();
        if (!text) continue;
        if (/\b(settings|preferences|manage|customize|subscribe|सेटिंग|वरीयता)\b/i.test(text)) continue;
        let score = 0;
        for (const p of patterns) {
          if (new RegExp(p.re, p.flags).test(text)) score = Math.max(score, p.score);
        }
        if (score > 0 && (!best || score > best.score)) best = { el: n, score };
      }
      return best ? clickEl(best.el) : false;
    },
    { selectors, patterns },
  );
}
