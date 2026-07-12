import { db } from "@/lib/db";
import type { EsocialTransmissionStatus } from "@prisma/client";
import { buildS2220Payload, buildS2240Payload } from "@/lib/employer-esocial";
import { s2220PayloadToXml, s2240PayloadToXml } from "@/lib/employer-esocial-xml";
import { isEsocialPartnerConfigured } from "@/lib/employer-integrations";

const PARTNER_NAME = process.env.ESOCIAL_PARTNER_NAME || "Doctor8 Export";
const PARTNER_URL = process.env.ESOCIAL_PARTNER_WEBHOOK_URL || "";
const PARTNER_TOKEN = process.env.ESOCIAL_PARTNER_API_TOKEN || "";

export async function queueEsocialTransmission(input: {
  employerCompanyId: string;
  eventType: "S-2220" | "S-2240";
  eventRefId?: string;
  payloadJson: object;
  payloadXml: string;
}) {
  return db.employerEsocialTransmission.create({
    data: {
      employerCompanyId: input.employerCompanyId,
      eventType: input.eventType,
      eventRefId: input.eventRefId,
      payloadJson: input.payloadJson as object,
      payloadXml: input.payloadXml,
      status: "QUEUED",
      partnerName: PARTNER_NAME,
    },
  });
}

async function sendToPartner(transmission: {
  id: string;
  eventType: string;
  payloadXml: string | null;
  payloadJson: unknown;
}): Promise<{ ok: boolean; partnerRef?: string; response?: unknown; error?: string }> {
  if (!PARTNER_URL) {
    return { ok: false, error: "ESOCIAL_PARTNER_WEBHOOK_URL not configured" };
  }
  if (!transmission.payloadXml) {
    return { ok: false, error: "Missing XML payload" };
  }

  const res = await fetch(PARTNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      Accept: "application/json",
      ...(PARTNER_TOKEN ? { Authorization: `Bearer ${PARTNER_TOKEN}` } : {}),
      "X-Doctor8-Event": transmission.eventType,
      "X-Doctor8-Transmission-Id": transmission.id,
    },
    body: transmission.payloadXml,
  });

  const text = await res.text().catch(() => "");
  let response: unknown = text;
  try {
    response = JSON.parse(text);
  } catch {
    // keep text
  }

  if (!res.ok) {
    return { ok: false, error: `Partner HTTP ${res.status}`, response };
  }

  const partnerRef =
    typeof response === "object" && response && "protocol" in response
      ? String((response as { protocol: string }).protocol)
      : `partner-${Date.now()}`;

  return { ok: true, partnerRef, response };
}

export async function transmitToPartner(transmissionId: string): Promise<{
  status: EsocialTransmissionStatus;
  partnerRef?: string;
  error?: string;
  demo?: boolean;
}> {
  const tx = await db.employerEsocialTransmission.findUnique({
    where: { id: transmissionId },
  });
  if (!tx) return { status: "REJECTED", error: "Not found" };

  if (!isEsocialPartnerConfigured()) {
    const partnerRef = `DEMO-${transmissionId.slice(0, 8).toUpperCase()}`;
    await db.employerEsocialTransmission.update({
      where: { id: transmissionId },
      data: {
        status: "ACCEPTED",
        partnerRef,
        partnerName: "Doctor8 Demo",
        partnerResponse: {
          mode: "demo",
          message: "Simulação local — contrate parceiro eSocial e configure ESOCIAL_PARTNER_WEBHOOK_URL.",
          acceptedAt: new Date().toISOString(),
        } as object,
        sentAt: new Date(),
      },
    });
    return { status: "ACCEPTED", partnerRef, demo: true };
  }

  const result = await sendToPartner(tx);

  if (!result.ok) {
    await db.employerEsocialTransmission.update({
      where: { id: transmissionId },
      data: {
        status: "QUEUED",
        partnerResponse: { error: result.error, response: result.response } as object,
      },
    });
    return { status: "QUEUED", error: result.error };
  }

  await db.employerEsocialTransmission.update({
    where: { id: transmissionId },
    data: {
      status: "SENT_TO_PARTNER",
      partnerRef: result.partnerRef,
      partnerResponse: result.response as object,
      sentAt: new Date(),
    },
  });

  return { status: "SENT_TO_PARTNER", partnerRef: result.partnerRef };
}

export async function buildAndQueueS2220FromExam(
  examId: string,
  employerCompanyId: string,
  options?: { isRetification?: boolean },
) {
  const exam = await db.employerOccupationalExam.findFirst({
    where: { id: examId, employerCompanyId, status: "COMPLETED" },
    include: {
      workforceMember: true,
      employerCompany: { select: { cnpj: true } },
    },
  });
  if (!exam) return null;

  const isRetification = options?.isRetification ?? false;
  const eventRefId = isRetification
    ? `${examId}:retify:${exam.asoRetifiedAt?.getTime() ?? Date.now()}`
    : examId;

  if (!isRetification) {
    if (exam.esocialS2220QueuedAt) {
      const existing = await db.employerEsocialTransmission.findFirst({
        where: {
          employerCompanyId,
          eventType: "S-2220",
          eventRefId: examId,
        },
      });
      if (existing) return existing;
    }

    const existing = await db.employerEsocialTransmission.findFirst({
      where: {
        employerCompanyId,
        eventType: "S-2220",
        eventRefId: examId,
      },
    });
    if (existing) {
      if (!exam.esocialS2220QueuedAt) {
        await db.employerOccupationalExam.update({
          where: { id: examId },
          data: { esocialS2220QueuedAt: existing.createdAt },
        });
      }
      return existing;
    }
  }

  const payload = buildS2220Payload({
    company: { cnpj: exam.employerCompany.cnpj },
    employee: {
      firstName: exam.workforceMember.firstName,
      lastName: exam.workforceMember.lastName,
      email: exam.workforceMember.email,
      cpf: exam.workforceMember.cpf ?? undefined,
      matricula: exam.workforceMember.matriculaEsocial ?? undefined,
    } as { firstName: string; lastName: string; email: string; cpf?: string; matricula?: string },
    exam: {
      examType: exam.examType,
      completedAt: exam.completedAt,
      asoResult: exam.asoResult,
      physicianName: exam.physicianName,
      physicianCrm: exam.physicianCrm,
      asoRestrictions: exam.asoRestrictions,
    },
  });
  if (!payload) return null;

  if (exam.workforceMember.cpf) payload.trabalhador.cpf = exam.workforceMember.cpf;
  if (exam.workforceMember.matriculaEsocial) {
    payload.trabalhador.matricula = exam.workforceMember.matriculaEsocial;
  }

  const xml = s2220PayloadToXml(payload);
  try {
    const transmission = await queueEsocialTransmission({
      employerCompanyId,
      eventType: "S-2220",
      eventRefId,
      payloadJson: payload,
      payloadXml: xml,
    });

    if (!isRetification) {
      await db.employerOccupationalExam.update({
        where: { id: examId },
        data: { esocialS2220QueuedAt: new Date() },
      });
    }

    return transmission;
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "P2002" && !isRetification) {
      const existing = await db.employerEsocialTransmission.findFirst({
        where: {
          employerCompanyId,
          eventType: "S-2220",
          eventRefId: examId,
        },
      });
      if (existing) {
        await db.employerOccupationalExam.update({
          where: { id: examId },
          data: { esocialS2220QueuedAt: existing.createdAt },
        });
        return existing;
      }
    }
    throw err;
  }
}

export async function buildAndQueueS2240ForMember(
  workforceMemberId: string,
  employerCompanyId: string,
) {
  const member = await db.employerWorkforceMember.findFirst({
    where: { id: workforceMemberId, employerCompanyId },
  });
  if (!member) return null;

  const company = await db.employerCompany.findUnique({
    where: { id: employerCompanyId },
    select: { cnpj: true },
  });
  if (!company) return null;

  const risks = await db.employerRiskEntry.findMany({
    where: { employerCompanyId },
    take: 20,
  });

  const payload = buildS2240Payload({
    company: { cnpj: company.cnpj },
    employee: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    },
    risks: risks.map((r) => ({
      hazardCode: r.hazardCode,
      hazardLabel: r.hazardLabel,
      riskLevel: r.riskLevel,
    })),
  });

  if (member.cpf) payload.trabalhador.cpf = member.cpf;
  if (member.matriculaEsocial) payload.trabalhador.matricula = member.matriculaEsocial;

  const xml = s2240PayloadToXml(payload);
  return queueEsocialTransmission({
    employerCompanyId,
    eventType: "S-2240",
    eventRefId: workforceMemberId,
    payloadJson: payload,
    payloadXml: xml,
  });
}

export async function listTransmissions(employerCompanyId: string, limit = 50) {
  return db.employerEsocialTransmission.findMany({
    where: { employerCompanyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
