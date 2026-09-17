/**
 * Request initiator and cookie setter attribution (spec §4.2).
 * Playwright has no request.initiator(); CDP Network.requestWillBeSent does.
 * Referer is a last-resort fallback and is never the scanned page itself.
 */

export interface CdpStack {
  callFrames?: Array<{ url?: string }>;
  parent?: CdpStack;
}

export interface CdpInitiator {
  type?: string;
  url?: string;
  stack?: CdpStack;
}

export function hostFromUrl(raw: string): string {
  if (!raw) return "";
  try {
    return new URL(raw).host;
  } catch {
    return "";
  }
}

export function isPageHost(host: string, pageHost: string): boolean {
  if (!host || !pageHost) return false;
  return host === pageHost || host.endsWith("." + pageHost) || pageHost.endsWith("." + host);
}

function collectStackUrls(stack: CdpStack | undefined, into: string[]): void {
  if (!stack) return;
  for (const frame of stack.callFrames ?? []) {
    if (frame.url) into.push(frame.url);
  }
  collectStackUrls(stack.parent, into);
}

/** First initiator host that is not the scanned page. */
export function hostFromCdpInitiator(
  initiator: CdpInitiator | undefined,
  pageHost: string,
): string {
  if (!initiator) return "";
  const urls: string[] = [];
  if (initiator.url) urls.push(initiator.url);
  collectStackUrls(initiator.stack, urls);
  for (const u of urls) {
    const host = hostFromUrl(u);
    if (host && !isPageHost(host, pageHost)) return host;
  }
  return "";
}

export function initiatorHost(input: {
  pageHost: string;
  referer?: string | undefined;
  cdpInitiator?: CdpInitiator | undefined;
}): string {
  const fromCdp = hostFromCdpInitiator(input.cdpInitiator, input.pageHost);
  if (fromCdp) return fromCdp;
  const fromReferer = hostFromUrl(input.referer ?? "");
  if (fromReferer && !isPageHost(fromReferer, input.pageHost)) return fromReferer;
  return "";
}

const HTTP_URL = /https?:\/\/[^\s)'"]+/g;

/** First third-party host in a JS stack string (document.cookie setter). */
export function hostFromStack(stack: string, pageHost: string): string {
  HTTP_URL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HTTP_URL.exec(stack))) {
    const host = hostFromUrl(m[0]!);
    if (host && !isPageHost(host, pageHost)) return host;
  }
  return "";
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^\./, "").toLowerCase();
}

function cookieKeys(name: string, domain: string): string[] {
  const keys = [name];
  if (domain) keys.unshift(`${name}\t${normalizeDomain(domain)}`);
  return keys;
}

/** Parse one or more Set-Cookie header values and record initiator by cookie name. */
export function recordSetCookieHeaders(
  setters: Map<string, string>,
  header: string,
  initiatorHostValue: string,
): void {
  if (!header || !initiatorHostValue) return;
  const blocks = header.split(/\r?\n/).flatMap((part) => splitSetCookie(part));
  for (const block of blocks) {
    const parsed = parseSetCookie(block);
    if (!parsed) continue;
    for (const key of cookieKeys(parsed.name, parsed.domain)) {
      setters.set(key, initiatorHostValue);
    }
  }
}

export function cookieSetBy(input: {
  name: string;
  domain: string;
  pageHost: string;
  setters: Map<string, string>;
}): string {
  for (const key of cookieKeys(input.name, input.domain)) {
    const host = input.setters.get(key);
    if (host) return host;
  }
  return "";
}

function parseSetCookie(block: string): { name: string; domain: string } | null {
  const trimmed = block.trim();
  if (!trimmed) return null;
  const first = trimmed.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  const name = first.slice(0, eq).trim();
  if (!name) return null;
  let domain = "";
  for (const part of trimmed.split(";").slice(1)) {
    const [k, v] = part.split("=");
    if (k?.trim().toLowerCase() === "domain" && v) domain = v.trim();
  }
  return { name, domain };
}

/**
 * Multiple Set-Cookie values are sometimes joined with commas. Expires dates
 * also contain commas, so only split on comma when the next token looks like
 * a new cookie (token=value, not an attribute).
 */
function splitSetCookie(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (const chunk of header.split(",")) {
    if (!current) {
      current = chunk;
      continue;
    }
    if (/^\s*[A-Za-z0-9_-]+=/.test(chunk) && !/^\s*(expires|Max-Age|path|domain|samesite)/i.test(chunk)) {
      parts.push(current);
      current = chunk;
    } else {
      current += "," + chunk;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export function firstPartyCookie(domain: string, pageHost: string): boolean {
  const d = normalizeDomain(domain);
  const page = normalizeDomain(pageHost);
  return d === page || page.endsWith("." + d) || d.endsWith("." + page);
}

/** Page init script: log document.cookie writes with a stack for set_by. */
export function cookieSetterInitScript(): string {
  return `(() => {
  window.__dpdpCookieSets = [];
  try {
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (!desc || !desc.get || !desc.set) return;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) {
        try {
          const name = String(v).split("=")[0].trim();
          window.__dpdpCookieSets.push({ name: name, stack: new Error().stack || "" });
        } catch (e) {}
        return desc.set.call(this, v);
      }
    });
  } catch (e) {}
})();`;
}
