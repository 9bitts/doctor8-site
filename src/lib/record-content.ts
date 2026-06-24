// Helpers for clinical record content (CID, exam items, plain text, psychology notes).

import { formatSessionNoteBody, type SessionFormat } from "@/lib/psychology-templates";
import { getScale, type ScaleId } from "@/lib/psychology-scales";

export interface RecordContent {
  cid?: string;
  cidLabel?: string;
  body?: string;
  items?: string[];
  notes?: string;
}

export function isPsychologyStructuredContent(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return !!(parsed && typeof parsed === "object" && (parsed.psychologyNote || parsed.psychologyScale));
  } catch {
    return false;
  }
}

function psychologyBodyFromParsed(parsed: Record<string, unknown>): string {
  if (parsed.psychologyNote) {
    if (typeof parsed.renderedBody === "string" && parsed.renderedBody.trim()) {
      return parsed.renderedBody;
    }
    return formatSessionNoteBody(
      parsed.format as SessionFormat,
      (parsed.fields as Record<string, string>) || {},
      typeof parsed.sessionDurationMins === "number" ? parsed.sessionDurationMins : undefined,
    );
  }

  if (parsed.psychologyScale) {
    const scaleId = String(parsed.scaleId || "");
    const score = typeof parsed.score === "number" ? parsed.score : 0;
    const interp = parsed.interpretation as { levelPt?: string } | undefined;
    const scale = getScale(scaleId as ScaleId);
    const name = scale?.namePt || scaleId;
    const level = interp?.levelPt ? ` — ${interp.levelPt}` : "";
    return `${name}\nPontuação: ${score}${level}`;
  }

  return "";
}

export function parseRecordContent(raw: string | null): RecordContent {
  if (!raw) return { body: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.psychologyNote || parsed.psychologyScale) {
        return { body: psychologyBodyFromParsed(parsed as Record<string, unknown>) };
      }
      if (Array.isArray(parsed.items)) {
        return {
          items: parsed.items.filter((i: unknown) => typeof i === "string" && i.trim()),
          notes: parsed.notes || "",
          cid: parsed.cid || "",
          cidLabel: parsed.cidLabel || "",
        };
      }
      if (parsed.cid || parsed.body || parsed.cidLabel) {
        return {
          cid: parsed.cid || "",
          cidLabel: parsed.cidLabel || "",
          body: parsed.body || "",
        };
      }
    }
  } catch { /* plain text */ }
  return { body: raw };
}

export function serializeRecordContent(data: RecordContent): string {
  if (data.items && data.items.length > 0) {
    return JSON.stringify({
      items: data.items,
      notes: data.notes || "",
      cid: data.cid || "",
      cidLabel: data.cidLabel || "",
    });
  }
  if (data.cid || data.cidLabel) {
    return JSON.stringify({
      cid: data.cid || "",
      cidLabel: data.cidLabel || "",
      body: data.body || "",
    });
  }
  return data.body || "";
}

export function formatRecordContentForDisplay(raw: string | null): string {
  const parsed = parseRecordContent(raw);
  const lines: string[] = [];

  if (parsed.cid) {
    const label = parsed.cidLabel ? ` — ${parsed.cidLabel}` : "";
    lines.push(`CID: ${parsed.cid}${label}`);
  }
  if (parsed.items && parsed.items.length > 0) {
    lines.push(...parsed.items.map((item, i) => `${i + 1}. ${item}`));
    if (parsed.notes) lines.push(parsed.notes);
  } else if (parsed.body) {
    lines.push(parsed.body);
  }

  return lines.join("\n");
}

export function buildRecordCopyText(opts: {
  categoryLabel: string;
  title: string;
  content: string | null;
  createdAt: string;
  patientName: string;
  locale?: string;
}): string {
  const { categoryLabel, title, content, createdAt, patientName, locale = "pt-BR" } = opts;
  const dateStr = new Date(createdAt).toLocaleString(locale, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const body = formatRecordContentForDisplay(content);
  return [
    `Paciente: ${patientName}`,
    `Categoria: ${categoryLabel}`,
    `Título: ${title}`,
    `Data: ${dateStr}`,
    "",
    body,
  ].filter((l, i, arr) => !(i === arr.length - 1 && l === "")).join("\n");
}
