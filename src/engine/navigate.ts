/**
 * Navigation is a hard failure (spec §8.1 exit 3). networkidle after a
 * successful load is best-effort (spec §4.1: wait for networkidle or timeout).
 */

export class NavigationError extends Error {
  constructor(url: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`navigation failed: ${url}: ${detail}`);
    this.name = "NavigationError";
  }
}

export interface GotoPage {
  goto: (url: string, options: { waitUntil: "load"; timeout: number }) => Promise<unknown>;
  waitForLoadState: (state: "networkidle", options: { timeout: number }) => Promise<unknown>;
}

export async function gotoUrl(page: GotoPage, url: string, timeout: number): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "load", timeout });
  } catch (e) {
    throw new NavigationError(url, e);
  }
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {
    /* page loaded; late requests are not a navigation failure */
  });
}
