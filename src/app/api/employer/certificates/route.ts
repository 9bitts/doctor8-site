import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { isMentalCid, referralFromCidFCertificate } from "@/lib/employer-care-referrals";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const certificates = await db.employerMedicalCertificate.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      workforceMember: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { startDate: "desc" },
    take: 100,
  });

  return NextResponse.json({ certificates });
}

const createSchema = z.object({
  workforceMemberId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  days: z.number().int().min(1).max(3650).optional(),
  cidCode: z.string().max(20).optional(),
  workRelatedMental: z.boolean().optional(),
  physicianName: z.string().max(200).optional(),
  physicianCrm: z.string().max(40).optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await db.employerWorkforceMember.findFirst({
    where: { id: parsed.data.workforceMemberId, employerCompanyId: ctx.employerCompanyId },
  });
  if (!member) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });

  const workRelatedMental =
    parsed.data.workRelatedMental ?? isMentalCid(parsed.data.cidCode);

  const certificate = await db.employerMedicalCertificate.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      workforceMemberId: parsed.data.workforceMemberId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      days: parsed.data.days,
      cidCode: parsed.data.cidCode,
      workRelatedMental,
      physicianName: parsed.data.physicianName,
      physicianCrm: parsed.data.physicianCrm,
      notes: parsed.data.notes,
      esocialQueuedAt: new Date(),
    },
  });

  await db.employerEsocialTransmission.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      eventType: "S-2230",
      eventRefId: certificate.id,
      status: "QUEUED",
      payloadJson: {
        certificateId: certificate.id,
        workforceMemberId: certificate.workforceMemberId,
        startDate: certificate.startDate.toISOString(),
        cidCode: certificate.cidCode,
        workRelatedMental,
        note: "Preparação eSocial S-2230 (afastamento) — revisar com profissional / parceiro",
      },
    },
  });

  if (workRelatedMental) {
    await referralFromCidFCertificate({
      employerCompanyId: ctx.employerCompanyId,
      workforceMemberId: certificate.workforceMemberId,
      certificateId: certificate.id,
      cidCode: certificate.cidCode,
      workRelatedMental: true,
    });
  }

  return NextResponse.json({ certificate }, { status: 201 });
}
