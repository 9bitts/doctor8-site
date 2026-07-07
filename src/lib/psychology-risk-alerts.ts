import { decrypt } from "@/lib/encryption";
import { parsePsychologyContent } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import type { RiskAlertItem } from "@/components/psychologist/PsychologyRiskAlertsBanner";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function getPsychologyRiskAlerts(professionalId: string): Promise<RiskAlertItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId,
      patientRecordId: { not: null },
      createdAt: { gte: since },
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

  return alerts;
}
