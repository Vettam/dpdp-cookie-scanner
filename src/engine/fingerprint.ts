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
  try {
    if (window.WebGLRenderingContext) {
      const rp = WebGLRenderingContext.prototype.readPixels;
      WebGLRenderingContext.prototype.readPixels = function () { log("WebGLRenderingContext.readPixels"); return rp.apply(this, arguments); };
      const gp = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (p) { log("WebGLRenderingContext.getParameter"); return gp.apply(this, arguments); };
    }
  } catch (e) {}
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
  wrap(Screen.prototype, "width", "window.screen.width");
  wrap(Screen.prototype, "height", "window.screen.height");
  wrap(Screen.prototype, "colorDepth", "window.screen.colorDepth");
  try {
    if (document.fonts && document.fonts.check) {
      const orig = document.fonts.check.bind(document.fonts);
      document.fonts.check = function () { log("document.fonts.check"); return orig.apply(document.fonts, arguments); };
    }
  } catch (e) {}
})();`;
}
