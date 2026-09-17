import type { ScanEngine, ScanOptions } from "./types.js";
import { applyDestinationCountries } from "./geo.js";
import { geoMeta, loadBundledGeo, type GeoDb } from "../geo/lookup.js";
import { redactBannerText } from "./redact.js";
import { applyBeforeFirstPaint, redirectChain } from "./timing.js";
import { detectSystemBrowser, ensureChromium, launchOptions, playwrightChromiumInstalled } from "./browser.js";
import { gotoUrl } from "./navigate.js";
import {
  BANNER_VOCAB,
  BUTTON_SCORE_PATTERNS,
  LANG_SWITCHER_TERMS,
  consentButtonSelectors,
  interpretBanner,
  type ButtonScorePattern,
  type CmpSignature,
} from "./banner.js";
import { fingerprintInitScript } from "./fingerprint.js";
import {
  cookieSetBy,
  cookieSetterInitScript,
  firstPartyCookie,
  hostFromStack,
  initiatorHost,
  recordSetCookieHeaders,
  type CdpInitiator,
} from "./initiator.js";
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

export const defaultEngine: ScanEngine = {
  async scan(url, options = {}) {
    const { chromium } = await import("playwright-core");
    const detected = detectSystemBrowser(options.browserPath);
    if (!detected) {
      let bundled = "";
      try {
        bundled = chromium.executablePath();
      } catch {
        bundled = "";
      }
      await ensureChromium({ installed: playwrightChromiumInstalled(bundled) });
    }
    const browser = await chromium.launch(launchOptions(detected));
    try {
      return await collectObservations(browser, url, options);
    } finally {
      await browser.close().catch(() => {
        /* already closing */
      });
    }
  },
};

async function collectObservations(
  browser: import("playwright-core").Browser,
  url: string,
  options: ScanOptions,
): Promise<Observation[]> {
    const contextOptions: Record<string, unknown> = {};
    if (options.gpc) contextOptions["extraHTTPHeaders"] = { "Sec-GPC": "1" };
    const context = await browser.newContext(contextOptions);
    // Instrument fingerprinting APIs before any page script runs (C-060).
    await context.addInitScript(fingerprintInitScript());
    await context.addInitScript(cookieSetterInitScript());
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
    const cdpInitiatorByUrl = new Map<string, CdpInitiator>();
    const cdpInitiatorByRequestId = new Map<string, CdpInitiator>();
    const cookieSetters = new Map<string, string>();
    let geo: GeoDb | undefined;
    try {
      geo = loadBundledGeo();
    } catch {
      geo = undefined;
    }
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Debugger.enable").catch(() => undefined);
      await cdp.send("Debugger.setSkipAllPauses", { skip: true }).catch(() => undefined);
      await cdp.send("Debugger.setAsyncCallStackDepth", { maxDepth: 32 }).catch(() => undefined);
      cdp.on(
        "Network.requestWillBeSent",
        (ev: { requestId?: string; request?: { url?: string }; initiator?: CdpInitiator }) => {
          const rawUrl = ev.request?.url;
          if (!rawUrl || !ev.initiator) return;
          cdpInitiatorByUrl.set(rawUrl, ev.initiator);
          if (ev.requestId) cdpInitiatorByRequestId.set(ev.requestId, ev.initiator);
        },
      );
      cdp.on(
        "Network.responseReceivedExtraInfo",
        (ev: { requestId?: string; headers?: Record<string, string> }) => {
          const header = ev.headers?.["set-cookie"] ?? ev.headers?.["Set-Cookie"] ?? "";
          if (!header) return;
          const setter = initiatorHost({
            pageHost: targetHost,
            cdpInitiator: ev.requestId ? cdpInitiatorByRequestId.get(ev.requestId) : undefined,
          });
          recordSetCookieHeaders(cookieSetters, header, setter);
        },
      );
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
        const initiator = initiatorHost({
          pageHost: targetHost,
          referer: req.headers()["referer"] ?? "",
          cdpInitiator: cdpInitiatorByUrl.get(req.url()),
        });
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
    page.on("response", (res) => {
      try {
        const header = res.headers()["set-cookie"] ?? "";
        if (!header) return;
        const setter = initiatorHost({
          pageHost: targetHost,
          referer: res.request().headers()["referer"] ?? "",
          cdpInitiator: cdpInitiatorByUrl.get(res.url()),
        });
        recordSetCookieHeaders(cookieSetters, header, setter);
      } catch {
        /* ignore */
      }
    });

    await gotoUrl(page, url, options.timeout ?? 15000);
    await page.waitForTimeout(options.settle ?? 3000);

    const banner = await detectBanner(page, options.cmpSignatures ?? []);
    if (banner) {
      observations.push({
        type: "banner",
        timestamp_ms: Date.now() - navStart,
        before_first_paint: false,
        before_banner_detected: false,
        ...banner,
      } as BannerObservation);
    }

    let bannerActionClicked = false;
    if (options.bannerAction) {
      bannerActionClicked = await clickConsentButton(page, options.bannerAction, options.cmpSignatures ?? []);
      await page.waitForTimeout(options.settle ?? 3000);
    }

    const jsSets = await page.evaluate(() => {
      return ((window as unknown as { __dpdpCookieSets?: Array<{ name: string; stack: string }> }).__dpdpCookieSets ??
        []) as Array<{ name: string; stack: string }>;
    }).catch(() => [] as Array<{ name: string; stack: string }>);
    for (const s of jsSets) {
      if (!s.name || cookieSetters.has(s.name)) continue;
      const setter = hostFromStack(s.stack, targetHost);
      if (setter) cookieSetters.set(s.name, setter);
    }

    const cookies = await context.cookies();
    for (const c of cookies) {
      const firstParty = firstPartyCookie(c.domain, targetHost);
      const setBy = cookieSetBy({
        name: c.name,
        domain: c.domain,
        pageHost: targetHost,
        setters: cookieSetters,
      });
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
        first_party: firstParty,
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
      banner_action: options.bannerAction ?? "",
      banner_action_clicked: bannerActionClicked,
    } as MetaObservation);

    if (geo) applyDestinationCountries(observations, ipByHost, geo);
    applyBeforeFirstPaint(observations, firstPaintMs || null);

    const bannerTime = observations.find((o) => o.type === "banner")?.timestamp_ms ?? Infinity;
    for (const o of observations) {
      if (o.type === "request") {
        (o as RequestObservation).before_banner_detected = o.timestamp_ms < bannerTime;
      }
    }
    return observations;
}

async function detectBanner(
  page: import("playwright-core").Page,
  signatures: CmpSignature[],
): Promise<Omit<BannerObservation, "type" | "timestamp_ms" | "before_first_paint" | "before_banner_detected"> | null> {
  const raw = await page.evaluate(
    ({
      signatures,
      vocab,
      langTerms,
    }: {
      signatures: { id: string; selectors: string[] }[];
      vocab: string[];
      langTerms: string[];
    }) => {
      const extract = (el: Element, cmpId: string | null) => {
        const text = (el.textContent ?? "").trim();
        const buttons = Array.from(el.querySelectorAll("button, a, input[type='submit']"));
        const btnText = buttons.map((b) => (b.textContent ?? "").trim()).join(" ");
        const toggles = Array.from(el.querySelectorAll("input[type='checkbox'], [role='switch']"));
        const hasPreTicked = toggles.some((t) => (t as HTMLInputElement).checked);
        const btnLower = btnText.toLowerCase();
        const hasLangSwitcher =
          !!el.querySelector("select, [data-lang], [aria-label*='language' i], [aria-label*='भाषा']") ||
          langTerms.some((t) => btnLower.includes(t.toLowerCase()) || btnText.includes(t));
        const links = Array.from(el.querySelectorAll("a[href]")).map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: (a.textContent ?? "").trim(),
        }));
        return { text, btnText, hasPreTicked, hasLangSwitcher, cmpId, links };
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
    { signatures, vocab: BANNER_VOCAB, langTerms: LANG_SWITCHER_TERMS },
  );
  if (!raw) return null;
  const fields = interpretBanner(raw);
  fields.text_excerpt = redactBannerText(fields.text_excerpt);
  return fields;
}

async function clickConsentButton(
  page: import("playwright-core").Page,
  intent: "accept" | "reject",
  signatures: CmpSignature[],
): Promise<boolean> {
  const selectors = consentButtonSelectors(intent, signatures);
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
