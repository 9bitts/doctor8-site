import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const signSchema = z.object({
  docType: z.enum(["PGR_INVENTORY", "PCMSO", "ASO", "GRO_CRITERIA"]),
  docRefId: z.string().optional(),
  signedByName: z.string().min(2).max(200),
  signedByRegistro: z.string().max(50).optional(),
  signedByRole: z.enum(["MEDICO_TRABALHO", "SST", "ENG_SEGURANCA", "ADMIN"]),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const signatures = await db.employerDocumentSignature.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { signedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ signatures });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = signSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const signature = await db.employerDocumentSignature.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      docType: parsed.data.docType,
      docRefId: parsed.data.docRefId,
      signedByName: parsed.data.signedByName,
      signedByRegistro: parsed.data.signedByRegistro,
      signedByRole: parsed.data.signedByRole,
      notes: parsed.data.notes,
    },
  });

  if (parsed.data.docType === "PCMSO") {
    await db.employerPcmsoConfig.upsert({
      where: { employerCompanyId: ctx.employerCompanyId },
      create: {
        employerCompanyId: ctx.employerCompanyId,
        coordinatorName: parsed.data.signedByName,
        coordinatorCrm: parsed.data.signedByRegistro,
        lastReviewAt: new Date(),
      },
      update: {
        lastReviewAt: new Date(),
        coordinatorName: parsed.data.signedByName,
        coordinatorCrm: parsed.data.signedByRegistro,
      },
    });
  }

  return NextResponse.json({ signature }, { status: 201 });
}
