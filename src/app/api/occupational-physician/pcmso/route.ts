import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOccupationalPhysicianApi } from "@/lib/api-auth";
import { userHasCompanyAccess } from "@/lib/occupational-physician-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";

const patchSchema = z.object({
  employerCompanyId: z.string(),
  checklist: z.array(z.object({
    id: z.string(),
    label: z.string(),
    done: z.boolean(),
  })).optional(),
  notes: z.string().max(5000).optional(),
  signOff: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireOccupationalPhysicianApi();
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { employerCompanyId } = parsed.data;
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    const allowed = await userHasCompanyAccess(ctx.userId, employerCompanyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const existing = await db.employerPcmsoConfig.findUnique({
    where: { employerCompanyId },
  });

  const physician = await db.employerOccupationalPhysician.findFirst({
    where: { employerCompanyId, userId: ctx.userId, status: "ACTIVE" },
    select: { fullName: true, crm: true, email: true },
  });

  const signOffNote = parsed.data.signOff && physician
    ? `\n[Revisão médica ${new Date().toLocaleDateString("pt-BR")} — ${physician.fullName ?? physician.email}${physician.crm ? ` CRM ${physician.crm}` : ""}]`
    : "";

  const config = await db.employerPcmsoConfig.upsert({
    where: { employerCompanyId },
    create: {
      employerCompanyId,
      checklistJson: parsed.data.checklist ?? undefined,
      notes: (parsed.data.notes ?? "") + signOffNote || null,
      lastReviewAt: parsed.data.signOff ? new Date() : null,
      coordinatorName: physician?.fullName ?? undefined,
      coordinatorEmail: physician?.email ?? undefined,
      coordinatorCrm: physician?.crm ?? undefined,
    },
    update: {
      checklistJson: parsed.data.checklist ?? undefined,
      notes: parsed.data.notes !== undefined
        ? parsed.data.notes + signOffNote
        : signOffNote
          ? (existing?.notes ?? "") + signOffNote
          : undefined,
      lastReviewAt: parsed.data.signOff ? new Date() : undefined,
    },
  });

  await refreshEmployerNr1Compliance(employerCompanyId);

  const checklist = parsePcmsoChecklist(config.checklistJson);

  return NextResponse.json({
    checklist,
    completionPercent: pcmsoCompletionPercent(checklist),
    lastReviewAt: config.lastReviewAt?.toISOString() ?? null,
    notes: config.notes,
  });
}
