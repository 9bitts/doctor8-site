import { decrypt } from "@/lib/encryption";
import { parsePsychologyContent, psychologyRecordKindWhere } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import type { RiskAlertItem } from "@/components/psychologist/PsychologyRiskAlertsBanner";

const CACHE_TTL_MS = 5 * 60 * 1000;
const alertCache = new Map<string, { at: number; data: RiskAlertItem[] }>();

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function getPsychologyRiskAlerts(professionalId: string): Promise<RiskAlertItem[]> {
  const cached = alertCache.get(professionalId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId,
      patientRecordId: { not: null },
      createdAt: { gte: since },
      ...psychologyRecordKindWhere("SCALE"),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const alerts: RiskAlertItem[] = [];

  for (const d of docs) {
    const content = parsePsychologyContent(safeDecrypt(d.content));
    const risk = content?.risk as {
      level?: string;
      messagePt?: string;
      messageEn?: string;
      messageEs?: string;
    } | undefined;
    if (!risk?.level || risk.level === "none" || risk.level === "low") continue;

    const patientName = d.patientRecord
      ? `${safeDecrypt(d.patientRecord.firstName)} ${safeDecrypt(d.patientRecord.lastName)}`.trim()
      : "—";

    alerts.push({
      id: d.id,
      patientRecordId: d.patientRecordId,
      patientName,
      scaleId: String(content?.scaleId || ""),
      level: risk.level,
      messagePt: risk.messagePt || "",
      messageEn: risk.messageEn || "",
      messageEs: risk.messageEs || "",
      createdAt: d.createdAt.toISOString(),
    });
    if (alerts.length >= 8) break;
  }

  alertCache.set(professionalId, { at: Date.now(), data: alerts });
  return alerts;
}

/** Clear cached alerts after a new scale with risk is saved (optional hook). */
export function invalidatePsychologyRiskAlertCache(professionalId: string): void {
  alertCache.delete(professionalId);
}
