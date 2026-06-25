import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPharmacyCatalog } from "@/lib/pharmacy-marketplace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
