import { describe, expect, it } from "vitest";
import { fingerprintInitScript } from "../../src/engine/fingerprint.js";
import { loadRules } from "../../src/rules/loader.js";
import { join } from "node:path";

describe("fingerprint instrumentation", () => {
  it("logs the api names DPDP-C-060 detects", async () => {
    const src = fingerprintInitScript();
    for (const name of [
      "canvas.toDataURL",
      "AudioContext.createOscillator",
      "WebGLRenderingContext.getParameter",
      "RTCPeerConnection",
      "navigator.plugins",
      "navigator.languages",
      "navigator.hardwareConcurrency",
      "navigator.deviceMemory",
      "window.screen.width",
      "window.screen.dimensions",
      "document.fonts.check",
      "document.fonts",
      "WebGLRenderingContext.renderer",
    ]) {
      expect(src).toContain(name);
    }
    const rules = await loadRules(join(process.cwd(), "rules"));
    const rule = rules.find((r) => r.id === "DPDP-C-060");
    expect(rule?.detection.where.api).toBeDefined();
    const re = new RegExp(rule!.detection.where.api!, "i");
    expect(re.test("navigator.plugins")).toBe(true);
    expect(re.test("window.screen.width")).toBe(true);
    expect(re.test("window.screen.dimensions")).toBe(true);
    expect(re.test("document.fonts.check")).toBe(true);
    expect(re.test("document.fonts")).toBe(true);
    expect(re.test("WebGLRenderingContext.renderer")).toBe(true);
    expect(re.test("fetch")).toBe(false);
  });
});
