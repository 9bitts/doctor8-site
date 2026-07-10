// Linkify message bodies and extract in-app paths for notifications.

const URL_RE = /(https?:\/\/[^\s]+|\/(?:professional|patient|psychologist|video)[^\s]*)/g;

export function splitMessageLinks(content: string): Array<{ type: "text" | "link"; value: string }> {
  const parts: Array<{ type: "text" | "link"; value: string }> = [];
  let last = 0;
  for (const match of content.matchAll(URL_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) {
      parts.push({ type: "text", value: content.slice(last, idx) });
    }
    parts.push({ type: "link", value: match[0] });
    last = idx + match[0].length;
  }
  if (last < content.length) {
    parts.push({ type: "text", value: content.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: content }];
}

export function hrefForMessageLink(raw: string): string {
  if (raw.startsWith("/")) return raw;
  try {
    const u = new URL(raw);
    if (u.pathname.startsWith("/")) return `${u.pathname}${u.search}${u.hash}`;
    return raw;
  } catch {
    return raw;
  }
}

export function extractNotificationLinkFromMessage(content: string): string | null {
  for (const part of splitMessageLinks(content)) {
    if (part.type !== "link") continue;
    const href = hrefForMessageLink(part.value);
    if (href.startsWith("/")) return href;
  }
  return null;
}

export function extractDocumentIdFromText(content: string): string | null {
  const m = content.match(/documentId=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}
