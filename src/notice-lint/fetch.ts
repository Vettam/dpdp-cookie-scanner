import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

/**
 * Load notice text from a URL (http/https) or a local file path. For URLs the
 * raw HTML is fetched and tags stripped to plain text. This is the only
 * outbound call the linter makes, and it is to the target's own notice URL.
 */
export async function loadNoticeText(source: string, cwd = process.cwd()): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source, { redirect: "follow" });
    if (!res.ok) throw new Error(`notice fetch failed: ${res.status} ${source}`);
    const html = await res.text();
    return htmlToText(html);
  }
  const path = isAbsolute(source) ? source : join(cwd, source);
  const raw = readFileSync(path, "utf8");
  return source.endsWith(".html") || source.endsWith(".htm") ? htmlToText(raw) : raw;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
