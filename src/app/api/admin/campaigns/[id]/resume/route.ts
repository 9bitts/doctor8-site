// src/app/api/admin/campaigns/[id]/resume/route.ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { resumeCampaign } from "@/lib/admin/email-campaigns";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await resumeCampaign(params.id);
    if (!result.ok) {
      const status = result.error === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, status: result.newStatus });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/resume]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
