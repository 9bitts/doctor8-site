import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { listActiveClinics } from "@/lib/occupational-clinics";

export async function GET(req: NextRequest) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const state = req.nextUrl.searchParams.get("state") ?? undefined;
  const clinics = await listActiveClinics(state);

  return NextResponse.json({
    clinics: clinics.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      email: c.email,
      phone: c.phone,
      addressLine: c.addressLine,
      services: c.servicesJson,
    })),
  });
}
