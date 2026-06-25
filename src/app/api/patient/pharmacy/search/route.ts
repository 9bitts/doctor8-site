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
  const q = (searchParams.get("q") || "").trim();
  const cep = (searchParams.get("cep") || "").trim() || undefined;

  if (q.length < 2) {
    return NextResponse.json({
      provider: "consulta-remedios",
      mode: "disabled",
      query: q,
      cep,
      results: [],
    });
  }

  const data = await searchPharmacyCatalog(q, cep);
  return NextResponse.json(data);
}
