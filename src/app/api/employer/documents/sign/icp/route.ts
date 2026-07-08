import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { createSignatureSession } from "@/lib/lacuna";
import { parseLacunaError } from "@/lib/lacuna-errors";
import { buildEmployerDocumentPdf } from "@/lib/employer-document-icp";
import { getPublicBase, assertPublicSignBase, buildSignReturnUrl } from "@/lib/sign-helpers";
import { db } from "@/lib/db";

const icpSchema = z.object({
  docType: z.enum(["PGR_INVENTORY", "PCMSO", "ASO", "GRO_CRITERIA"]),
  docRefId: z.string().optional(),
  signedByName: z.string().min(2).max(200),
  signedByRegistro: z.string().max(50).optional(),
  signedByRole: z.enum(["MEDICO_TRABALHO", "SST", "ENG_SEGURANCA", "ADMIN"]),
  signerCpf: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = icpSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const base = getPublicBase(req);
  const baseErr = assertPublicSignBase(base);
  if (baseErr) {
    return NextResponse.json({ error: "SIGN_BASE_INVALID", message: baseErr }, { status: 503 });
  }

  const built = await buildEmployerDocumentPdf(
    ctx.employerCompanyId,
    parsed.data.docType,
    parsed.data.docRefId,
  );
  if (!built) {
    return NextResponse.json({ error: "Document not available for signing" }, { status: 404 });
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
      signatureStatus: "PENDING_ICP",
    },
  });

  const returnUrl = buildSignReturnUrl(base, "/api/employer/documents/sign/callback", {
    signatureId: signature.id,
  });

  try {
    const lacuna = await createSignatureSession({
      pdfBytes: Buffer.from(built.pdfBytes),
      fileName: built.fileName,
      returnUrl,
      cpf: parsed.data.signerCpf,
    });

    await db.employerDocumentSignature.update({
      where: { id: signature.id },
      data: { lacunaSessionId: lacuna.sessionId },
    });

    return NextResponse.json({
      signatureId: signature.id,
      redirectUrl: lacuna.redirectUrl,
    });
  } catch (e) {
    await db.employerDocumentSignature.update({
      where: { id: signature.id },
      data: { signatureStatus: "CANCELLED" },
    });
    const code = parseLacunaError(e);
    return NextResponse.json({ error: code }, { status: 502 });
  }
}
