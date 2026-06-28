// Shared helpers for clinical record file attachments.

import { decrypt } from "@/lib/encryption";
import { parseRecordContent } from "@/lib/record-content";

export function safeDecryptFileKey(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export function fileNameFromKey(key: string): string {
  const base = key.split("/").pop() || key;
  return base.replace(/^[a-f0-9-]{20,}-/i, "");
}

export function fileKind(key: string, name?: string): "image" | "pdf" | "video" | "other" {
  const fromName = (name?.split(".").pop() || "").toLowerCase();
  const fromKey = (key.split(".").pop() || "").toLowerCase();
  const ext = fromName || fromKey;
  const blob = `${key} ${name || ""}`.toLowerCase();
  if (ext === "pdf" || blob.includes(".pdf")) return "pdf";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"].includes(ext)) return "image";
  return "other";
}

export function collectFileKeys(fileUrl: string | null, content: string | null): string[] {
  const keys: string[] = [];
  const primary = fileUrl ? safeDecryptFileKey(fileUrl) : "";
  if (primary) keys.push(primary);

  const parsed = parseRecordContent(content ? safeDecryptFileKey(content) : null);
  for (const k of parsed.attachments || []) {
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}
