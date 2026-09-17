/**
 * Spec §4.4: banner text_excerpt is passed through a redactor that masks
 * email-like, phone-like, and long-numeric tokens before storage.
 */
export function redactBannerText(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted]")
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, "[redacted]")
    .replace(/\b\d{8,}\b/g, "[redacted]");
}
