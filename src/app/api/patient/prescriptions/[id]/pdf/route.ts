import { NextRequest } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { servePrescriptionPdf } from "@/lib/serve-prescription-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  return servePrescriptionPdf(req, params.id, ctx.session);
}
