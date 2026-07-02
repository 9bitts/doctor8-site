import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { searchPharmacyCatalog } from "@/lib/pharmacy-marketplace";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const filters = {
    name: searchParams.get("name") || searchParams.get("q") || undefined,
    manufacturer: searchParams.get("manufacturer") || undefined,
    activeIngredient: searchParams.get("activeIngredient") || undefined,
    presentation: searchParams.get("presentation") || undefined,
  };
  const cep = (searchParams.get("cep") || "").trim() || undefined;

  const data = await searchPharmacyCatalog(filters, cep);
  return NextResponse.json(data);
}
