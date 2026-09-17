/**
 * Fingerprinting init-script payload (spec §4.2 api_call). Runs in the page.
 * Keep the logged `api` strings aligned with DPDP-C-060's `where.api` regex.
 */
export function fingerprintInitScript(): string {
  return `(() => {
  window.__dpdpFp = [];
  const log = (api) => { try { window.__dpdpFp.push(api); } catch (e) {} };
  const wrap = (obj, key, name) => {
    try {
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      if (!desc) return;
      if (typeof desc.value === "function") {
        const orig = desc.value;
        obj[key] = function () { log(name); return orig.apply(this, arguments); };
      } else if (desc.get) {
        Object.defineProperty(obj, key, {
          get: function () { log(name); return desc.get.call(this); },
          configurable: true,
        });
      }
    } catch (e) {}
  };
  try {
    const c = HTMLCanvasElement && HTMLCanvasElement.prototype;
    if (c) {
      const origTo = c.toDataURL;
      c.toDataURL = function () { log("canvas.toDataURL"); return origTo.apply(this, arguments); };
      const origCtx = c.getContext;
      c.getContext = function (type) {
        if (type === "2d" || type === "webgl" || type === "webgl2") log("canvas.getContext:" + type);
        return origCtx.apply(this, arguments);
      };
    }
  } catch (e) {}
  try {
    if (window.AudioContext) {
      const o = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () { log("AudioContext.createOscillator"); return o.apply(this, arguments); };
    }
  } catch (e) {}
  try {
    if (window.OfflineAudioContext) {
      const o = OfflineAudioContext.prototype.createOscillator;
      OfflineAudioContext.prototype.createOscillator = function () { log("AudioContext.createOscillator"); return o.apply(this, arguments); };
    }
  } catch (e) {}
  const hookWebGL = (proto) => {
    try {
      if (!proto) return;
      const rp = proto.readPixels;
      proto.readPixels = function () { log("WebGLRenderingContext.readPixels"); return rp.apply(this, arguments); };
      const gp = proto.getParameter;
      proto.getParameter = function (p) {
        log("WebGLRenderingContext.getParameter");
        if (p === 0x9245 || p === 0x9246) log("WebGLRenderingContext.renderer");
        return gp.apply(this, arguments);
      };
      const ge = proto.getExtension;
      proto.getExtension = function (name) {
        if (String(name).toLowerCase() === "webgl_debug_renderer_info") log("WebGLRenderingContext.renderer");
        return ge.apply(this, arguments);
      };
    } catch (e) {}
  };
  hookWebGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  hookWebGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  try {
    if (window.RTCPeerConnection) {
      const Orig = window.RTCPeerConnection;
      window.RTCPeerConnection = function () { log("RTCPeerConnection"); return new Orig(...arguments); };
      window.RTCPeerConnection.prototype = Orig.prototype;
    }
  } catch (e) {}
  wrap(Navigator.prototype, "plugins", "navigator.plugins");
  wrap(Navigator.prototype, "languages", "navigator.languages");
  wrap(Navigator.prototype, "hardwareConcurrency", "navigator.hardwareConcurrency");
  wrap(Navigator.prototype, "deviceMemory", "navigator.deviceMemory");
  try {
    let seenW = false, seenH = false;
    const markDim = (prop, name) => {
      const desc = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
      if (!desc || !desc.get) return;
      Object.defineProperty(Screen.prototype, prop, {
        get: function () {
          log(name);
          if (prop === "width" || prop === "availWidth") seenW = true;
          if (prop === "height" || prop === "availHeight") seenH = true;
          if (seenW && seenH) log("window.screen.dimensions");
          return desc.get.call(this);
        },
        configurable: true,
      });
    };
    markDim("width", "window.screen.width");
    markDim("height", "window.screen.height");
    markDim("availWidth", "window.screen.availWidth");
    markDim("availHeight", "window.screen.availHeight");
  } catch (e) {}
  wrap(Screen.prototype, "colorDepth", "window.screen.colorDepth");
  try {
    const fonts = document.fonts;
    if (fonts) {
      if (fonts.check) {
        const orig = fonts.check.bind(fonts);
        fonts.check = function () { log("document.fonts.check"); return orig.apply(fonts, arguments); };
      }
      const enumMethods = ["forEach", "values", "entries", "keys"];
      for (const m of enumMethods) {
        if (typeof fonts[m] !== "function") continue;
        const orig = fonts[m].bind(fonts);
        fonts[m] = function () { log("document.fonts"); return orig.apply(fonts, arguments); };
      }
    }
  } catch (e) {}
})();`;
}
