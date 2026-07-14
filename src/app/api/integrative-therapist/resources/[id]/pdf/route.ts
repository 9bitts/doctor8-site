import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normLang } from "@/lib/sign-helpers";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { buildResourcePdfBytes, pdfResponse } from "@/lib/professional-library/resource-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.integrativeTherapistId !== therapist.id || !resource.active) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = normLang(user?.language);
  const bytes = await buildResourcePdfBytes(resource, lang);
  return pdfResponse(bytes, params.id);
}
