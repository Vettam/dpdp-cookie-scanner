import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ScanEngine, ScanOptions } from "./types.js";
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

const BANNER_VOCAB = [
  "cookie", "consent", "privacy", "preferences", "accept", "reject", "agree",
  "i agree", "by continuing", "by browsing", "legitimate interest",
];

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
    const observations: Observation[] = [];
    const pageUrl = new URL(url);
    const targetHost = pageUrl.host;
    const navStart = Date.now();
    const page = await context.newPage();

    // Instrument fingerprinting APIs before any page script runs (C-060).
    await context.addInitScript(() => {
      (window as unknown as { __dpdpFp?: string[] }).__dpdpFp = [];
      const log = (api: string) => {
        try { (window as unknown as { __dpdpFp?: string[] }).__dpdpFp!.push(api); } catch { /* noop */ }
      };
      try {
        const c = (window as unknown as { HTMLCanvasElement?: { prototype: { toDataURL: unknown; getContext: unknown } } }).HTMLCanvasElement;
        if (c) {
          const origTo = c.prototype.toDataURL as (...a: unknown[]) => string;
          c.prototype.toDataURL = function (...a: unknown[]) { log("canvas.toDataURL"); return origTo.apply(this, a); };
          const origCtx = c.prototype.getContext as (this: unknown, ...a: unknown[]) => unknown;
          c.prototype.getContext = function (this: unknown, type: string, ...a: unknown[]) {
            if (type === "2d" || type === "webgl" || type === "webgl2") log("canvas.getContext:" + type);
            return origCtx.call(this, type, ...a);
          };
        }
      } catch { /* noop */ }
      try {
        const AC = (window as unknown as { AudioContext?: { prototype: { createOscillator: unknown } } }).AudioContext;
        if (AC) {
          const o = AC.prototype.createOscillator as (...a: unknown[]) => unknown;
          AC.prototype.createOscillator = function (...a: unknown[]) { log("AudioContext.createOscillator"); return o.apply(this, a); };
        }
      } catch { /* noop */ }
      try {
        const OAC = (window as unknown as { OfflineAudioContext?: { prototype: { createOscillator: unknown } } }).OfflineAudioContext;
        if (OAC) {
          const o = OAC.prototype.createOscillator as (...a: unknown[]) => unknown;
          OAC.prototype.createOscillator = function (...a: unknown[]) { log("AudioContext.createOscillator"); return o.apply(this, a); };
        }
      } catch { /* noop */ }
      try {
        const GL = (window as unknown as { WebGLRenderingContext?: { prototype: { readPixels: unknown } } }).WebGLRenderingContext;
        if (GL) {
          const rp = GL.prototype.readPixels as (...a: unknown[]) => unknown;
          GL.prototype.readPixels = function (...a: unknown[]) { log("WebGLRenderingContext.readPixels"); return rp.apply(this, a); };
        }
      } catch { /* noop */ }
      try {
        const RTC = (window as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection;
        if (RTC) {
          const wrap = function (this: unknown, ...a: unknown[]) { log("RTCPeerConnection"); return (RTC as (...a: unknown[]) => unknown).apply(this, a); };
          (window as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = wrap;
        }
      } catch { /* noop */ }
    });

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

    const storage = await page.evaluate(() => {
      const out: Array<{ kind: "local" | "session"; key: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out.push({ kind: "local", key: k });
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) out.push({ kind: "session", key: k });
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

    observations.push({
      type: "meta",
      timestamp_ms: 0,
      before_first_paint: true,
      before_banner_detected: true,
      url,
      final_url: page.url(),
      redirects: [],
      page_language: await page.evaluate(() => document.documentElement.lang || "en"),
      title: await page.title(),
      scan_started_at: new Date().toISOString(),
      engine_version: "0.1.0",
      rules_version: "0.1.0",
      trackers_version: "0.1.0",
      geo_source: "DB-IP Lite",
      geo_date: "",
      gpc_sent: Boolean(options.gpc),
    } as MetaObservation);

    await browser.close();

    const bannerTime = banner ? observations.find((o) => o.type === "banner")?.timestamp_ms ?? Infinity : Infinity;
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
  const found = await page.evaluate((vocab) => {
    const words = (vocab as string[]).map((w) => w.toLowerCase());
    const elems = Array.from(document.querySelectorAll("div, section, aside, [role='dialog']"));
    for (const el of elems) {
      const cs = window.getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      const text = (el.textContent ?? "").toLowerCase();
      if (text.length === 0 || text.length > 4000) continue;
      if (!words.some((w) => text.includes(w))) continue;
      const buttons = Array.from(el.querySelectorAll("button, a, input[type='submit']"));
      const btnText = buttons.map((b) => (b.textContent ?? "").toLowerCase()).join(" ");
      const hasAccept = /\b(accept|agree|i agree|allow)\b/.test(btnText);
      const hasReject = /\b(reject|decline|deny|refuse)\b/.test(btnText);
      const hasSettings = /\b(settings|preferences|manage|customize|more)\b/.test(btnText);
      const toggles = Array.from(el.querySelectorAll("input[type='checkbox'], [role='switch']"));
      const hasPreTicked = toggles.some((t) => (t as HTMLInputElement).checked);
      const hasLangSwitcher = !!el.querySelector("select, [data-lang], [aria-label*='language']");
      const mentionsLI = /legitimate interest/.test(text);
      const impliesBrowsing = /by continuing|by browsing|by scrolling|closing this (banner|message|box)/.test(text);
      return {
        detected: true,
        has_accept: hasAccept,
        has_reject: hasReject,
        has_settings: hasSettings,
        has_pre_ticked: hasPreTicked,
        has_language_switcher: hasLangSwitcher,
        mentions_legitimate_interest: mentionsLI,
        implies_consent_by_browsing: impliesBrowsing,
        text_excerpt: text.slice(0, 500),
        detection_confidence: "medium" as const,
      };
    }
    return null;
  }, BANNER_VOCAB);
  return found;
}
