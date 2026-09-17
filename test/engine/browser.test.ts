import { describe, expect, it } from "vitest";
import {
  CHROMIUM_FALLBACK_MESSAGE,
  detectSystemBrowser,
  ensureChromium,
  launchOptions,
  playwrightChromiumInstalled,
  playwrightCoreCliPath,
} from "../../src/engine/browser.js";

describe("detectSystemBrowser", () => {
  it("returns an existing --browser path", () => {
    const path = detectSystemBrowser("/opt/custom-chrome", {
      existsSync: (p) => p === "/opt/custom-chrome",
      platform: "linux",
    });
    expect(path).toBe("/opt/custom-chrome");
  });

  it("returns undefined when no system Chrome/Edge exists", () => {
    const path = detectSystemBrowser(undefined, {
      existsSync: () => false,
      platform: "linux",
    });
    expect(path).toBeUndefined();
  });

  it("finds google-chrome-stable on linux CI images", () => {
    const path = detectSystemBrowser(undefined, {
      existsSync: (p) => p === "/usr/bin/google-chrome-stable",
      platform: "linux",
    });
    expect(path).toBe("/usr/bin/google-chrome-stable");
  });
});

describe("launchOptions", () => {
  it("uses a system binary path when one was found", () => {
    expect(launchOptions("/usr/bin/google-chrome")).toEqual({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
    });
  });

  it("does not set channel chromium (playwright-core has no such channel)", () => {
    const opts = launchOptions(undefined);
    expect(opts).toEqual({ headless: true });
    expect("channel" in opts).toBe(false);
  });
});

describe("playwrightCoreCliPath", () => {
  it("resolves playwright-core's install CLI", () => {
    expect(playwrightCoreCliPath()).toMatch(/playwright-core[/\\]cli\.js$/);
  });
});

describe("playwrightChromiumInstalled", () => {
  it("is true only when the playwright Chromium binary exists on disk", () => {
    expect(playwrightChromiumInstalled("/pw/chromium", (p) => p === "/pw/chromium")).toBe(true);
    expect(playwrightChromiumInstalled("/pw/chromium", () => false)).toBe(false);
    expect(playwrightChromiumInstalled("", () => true)).toBe(false);
  });
});

describe("ensureChromium", () => {
  it("downloads Chromium once, with the spec §3.2 message, when it is not installed", async () => {
    const writes: string[] = [];
    let installs = 0;
    await ensureChromium({
      installed: false,
      write: (s) => writes.push(s),
      install: async () => {
        installs += 1;
      },
    });
    expect(writes).toEqual([CHROMIUM_FALLBACK_MESSAGE]);
    expect(installs).toBe(1);
  });

  it("does not print or download when Playwright Chromium is already on disk", async () => {
    const writes: string[] = [];
    let installs = 0;
    await ensureChromium({
      installed: true,
      write: (s) => writes.push(s),
      install: async () => {
        installs += 1;
      },
    });
    expect(writes).toEqual([]);
    expect(installs).toBe(0);
  });
});
