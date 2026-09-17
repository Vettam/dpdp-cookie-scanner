import { describe, expect, it } from "vitest";
import { NavigationError, gotoUrl } from "../../src/engine/navigate.js";

function page(over: {
  goto?: () => Promise<void>;
  waitForLoadState?: () => Promise<void>;
}) {
  return {
    goto: over.goto ?? (async () => {}),
    waitForLoadState: over.waitForLoadState ?? (async () => {}),
  };
}

describe("gotoUrl", () => {
  it("throws NavigationError when page.goto fails (dead host / timeout)", async () => {
    await expect(
      gotoUrl(
        page({
          goto: async () => {
            throw new Error("net::ERR_NAME_NOT_RESOLVED");
          },
        }),
        "https://dead.invalid",
        1000,
      ),
    ).rejects.toSatisfy((e: unknown) => {
      expect(e).toBeInstanceOf(NavigationError);
      expect((e as Error).message).toMatch(/dead\.invalid/);
      expect((e as Error).message).toMatch(/ERR_NAME_NOT_RESOLVED/);
      return true;
    });
  });

  it("continues when the page loaded but networkidle times out (spec §4.1)", async () => {
    await expect(
      gotoUrl(
        page({
          goto: async () => {},
          waitForLoadState: async () => {
            throw new Error("Timeout 1000ms exceeded");
          },
        }),
        "https://example.com",
        1000,
      ),
    ).resolves.toBeUndefined();
  });
});
