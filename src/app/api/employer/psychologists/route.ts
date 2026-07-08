import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireEmployerApi } from "@/lib/api-auth";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { sendEmployerPsychologistNetworkLinked } from "@/lib/email";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const links = await db.employerLinkedPsychologist.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { invitedAt: "desc" },
    include: {
      professional: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          licenseNumber: true,
          verified: true,
        },
      },
    },
  });

  return NextResponse.json({
    psychologists: links.map((l) => ({
      id: l.id,
      professionalId: l.professionalId,
      name: `${l.professional.firstName} ${l.professional.lastName}`,
      specialty: l.professional.specialty,
      licenseNumber: l.professional.licenseNumber,
      verified: l.professional.verified,
      repassePercent: l.repassePercent,
      status: l.status,
      joinedAt: l.joinedAt?.toISOString() ?? l.invitedAt.toISOString(),
    })),
  });
}

const addSchema = z.object({
  professionalId: z.string(),
  repassePercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pro = await db.professionalProfile.findUnique({
    where: { id: parsed.data.professionalId, verified: true },
    select: { specialty: true, firstName: true, lastName: true },
  });
  if (!pro || !isPsychologistSpecialty(pro.specialty)) {
    return NextResponse.json({ error: "Profissional deve ser psicólogo verificado." }, { status: 400 });
  }

  const existing = await db.employerLinkedPsychologist.findUnique({
    where: {
      employerCompanyId_professionalId: {
        employerCompanyId: ctx.employerCompanyId,
        professionalId: parsed.data.professionalId,
      },
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const keepActive = existing?.status === "ACTIVE";

  const link = await db.employerLinkedPsychologist.upsert({
    where: {
      employerCompanyId_professionalId: {
        employerCompanyId: ctx.employerCompanyId,
        professionalId: parsed.data.professionalId,
      },
    },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      professionalId: parsed.data.professionalId,
      repassePercent: parsed.data.repassePercent ?? 70,
      notes: parsed.data.notes,
      status: "INVITED",
      inviteToken: token,
      expiresAt,
    },
    update: {
      repassePercent: parsed.data.repassePercent,
      notes: parsed.data.notes,
      ...(keepActive
        ? {}
        : {
            status: "INVITED",
            inviteToken: token,
            expiresAt,
            invitedAt: new Date(),
            joinedAt: null,
          }),
    },
  });

  if (!keepActive) {
    try {
      const [company, proUser] = await Promise.all([
        db.employerCompany.findUnique({
          where: { id: ctx.employerCompanyId },
          select: { nomeFantasia: true },
        }),
        db.user.findFirst({
          where: { professionalProfile: { id: parsed.data.professionalId } },
          select: { email: true, language: true },
        }),
      ]);
      if (proUser?.email && company) {
        await sendEmployerPsychologistNetworkLinked({
          email: proUser.email,
          psychologistName: `${pro.firstName} ${pro.lastName}`.trim(),
          companyName: company.nomeFantasia,
          repassePercent: link.repassePercent,
          inviteToken: token,
          language: proUser.language ?? undefined,
        });
      }
    } catch (e) {
      console.error("[EMPLOYER] Psychologist network email failed:", e);
    }
  }

  return NextResponse.json({ link, invited: !keepActive }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  repassePercent: z.number().min(0).max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerLinkedPsychologist.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "INVITED" && parsed.data.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Aguarde o psicólogo aceitar o convite." },
      { status: 400 },
    );
  }

  const link = await db.employerLinkedPsychologist.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      repassePercent: parsed.data.repassePercent,
    },
  });

  return NextResponse.json({ link });
}
