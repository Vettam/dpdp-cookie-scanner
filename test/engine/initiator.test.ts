import { describe, expect, it } from "vitest";
import {
  cookieSetBy,
  firstPartyCookie,
  hostFromCdpInitiator,
  hostFromStack,
  initiatorHost,
  recordSetCookieHeaders,
} from "../../src/engine/initiator.js";

const PAGE = "www.acme.in";

describe("initiatorHost (spec §4.2 request.initiator_host)", () => {
  it("uses the CDP script initiator, not the page Referer", () => {
    expect(
      initiatorHost({
        pageHost: PAGE,
        referer: "https://www.acme.in/home",
        cdpInitiator: {
          type: "script",
          stack: {
            callFrames: [{ url: "https://www.googletagmanager.com/gtm.js?id=GTM-TEST" }],
          },
        },
      }),
    ).toBe("www.googletagmanager.com");
  });

  it("attributes a tag-manager load with no Referer to the container host", () => {
    expect(
      initiatorHost({
        pageHost: PAGE,
        referer: "",
        cdpInitiator: {
          type: "script",
          url: "https://www.googletagmanager.com/gtm.js",
        },
      }),
    ).toBe("www.googletagmanager.com");
  });

  it("walks a parent stack when the inner frame is the page itself", () => {
    expect(
      hostFromCdpInitiator(
        {
          type: "script",
          stack: {
            callFrames: [{ url: "https://www.acme.in/app.js" }],
            parent: {
              callFrames: [{ url: "https://www.googletagmanager.com/gtm.js" }],
            },
          },
        },
        PAGE,
      ),
    ).toBe("www.googletagmanager.com");
  });

  it("does not treat the page Referer as an initiator", () => {
    expect(
      initiatorHost({
        pageHost: PAGE,
        referer: "https://www.acme.in/",
      }),
    ).toBe("");
  });

  it("falls back to a third-party Referer only when CDP initiator is unknown", () => {
    expect(
      initiatorHost({
        pageHost: PAGE,
        referer: "https://cdn.vendor.com/tag.js",
      }),
    ).toBe("cdn.vendor.com");
  });
});

describe("cookie set_by (spec §4.2 cookie.set_by)", () => {
  it("records the initiator host from Set-Cookie, not the cookie's own domain", () => {
    const setters = new Map<string, string>();
    recordSetCookieHeaders(
      setters,
      "_fbp=fb.1.x; Domain=.facebook.com; Path=/; Secure",
      "www.googletagmanager.com",
    );
    expect(
      cookieSetBy({
        name: "_fbp",
        domain: ".facebook.com",
        pageHost: PAGE,
        setters,
      }),
    ).toBe("www.googletagmanager.com");
  });

  it("leaves set_by empty when the initiator is unknown rather than using the cookie domain", () => {
    expect(
      cookieSetBy({
        name: "_ga",
        domain: ".google-analytics.com",
        pageHost: PAGE,
        setters: new Map(),
      }),
    ).toBe("");
  });

  it("reads a third-party setter out of a document.cookie stack", () => {
    const stack = [
      "Error",
      "    at HTMLDocument.set (eval at <anonymous> (https://www.acme.in/:1:1))",
      "    at https://www.googletagmanager.com/gtm.js:214:9",
      "    at https://www.acme.in/app.js:10:2",
    ].join("\n");
    expect(hostFromStack(stack, PAGE)).toBe("www.googletagmanager.com");
  });

  it("treats a parent-domain cookie as first-party without using the domain as set_by", () => {
    expect(firstPartyCookie(".acme.in", PAGE)).toBe(true);
    expect(firstPartyCookie(".facebook.com", PAGE)).toBe(false);
  });
});
