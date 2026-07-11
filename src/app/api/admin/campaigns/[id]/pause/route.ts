// src/app/api/admin/campaigns/[id]/pause/route.ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.emailCampaign.update({
      where: { id: params.id },
      data: { status: "PAUSED", batchLockAt: null },
    });

    return NextResponse.json({ ok: true, status: "PAUSED" });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/pause]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
