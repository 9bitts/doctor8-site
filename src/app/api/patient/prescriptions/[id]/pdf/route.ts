import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const target = new URL(`/api/professional/prescriptions/${params.id}/pdf`, req.url);
  const lang = req.nextUrl.searchParams.get("lang");
  if (lang) target.searchParams.set("lang", lang);
  return NextResponse.redirect(target);
}
