import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { parsePcmsoChecklist, pcmsoCompletionPercent } from "@/lib/employer-pcmso-checklist";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR", "VIEWER"]);
  if ("error" in ctx) return ctx.error;

  const config = await db.employerPcmsoConfig.findUnique({
    where: { employerCompanyId: ctx.employerCompanyId },
  });

  const checklist = parsePcmsoChecklist(config?.checklistJson);

  return NextResponse.json({
    config: config
      ? {
          coordinatorName: config.coordinatorName,
          coordinatorEmail: config.coordinatorEmail,
          coordinatorCrm: config.coordinatorCrm,
          lastReviewAt: config.lastReviewAt?.toISOString() ?? null,
          notes: config.notes,
        }
      : null,
    checklist,
    completionPercent: pcmsoCompletionPercent(checklist),
  });
}

const saveSchema = z.object({
  coordinatorName: z.string().max(200).optional(),
  coordinatorEmail: z.string().email().optional().or(z.literal("")),
  coordinatorCrm: z.string().max(30).optional(),
  lastReviewAt: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  checklist: z.array(z.object({
    id: z.string(),
    label: z.string(),
    done: z.boolean(),
  })).optional(),
});

export async function PUT(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const config = await db.employerPcmsoConfig.upsert({
    where: { employerCompanyId: ctx.employerCompanyId },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      coordinatorName: parsed.data.coordinatorName,
      coordinatorEmail: parsed.data.coordinatorEmail || null,
      coordinatorCrm: parsed.data.coordinatorCrm,
      lastReviewAt: parsed.data.lastReviewAt ? new Date(parsed.data.lastReviewAt) : null,
      notes: parsed.data.notes,
      checklistJson: parsed.data.checklist ?? undefined,
    },
    update: {
      coordinatorName: parsed.data.coordinatorName,
      coordinatorEmail: parsed.data.coordinatorEmail || null,
      coordinatorCrm: parsed.data.coordinatorCrm,
      lastReviewAt: parsed.data.lastReviewAt ? new Date(parsed.data.lastReviewAt) : undefined,
      notes: parsed.data.notes,
      checklistJson: parsed.data.checklist ?? undefined,
    },
  });

  const checklist = parsePcmsoChecklist(config.checklistJson);

  return NextResponse.json({
    config,
    checklist,
    completionPercent: pcmsoCompletionPercent(checklist),
  });
}
