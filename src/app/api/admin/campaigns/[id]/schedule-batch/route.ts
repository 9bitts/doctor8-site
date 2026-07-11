// src/app/api/admin/campaigns/[id]/schedule-batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { scheduleCampaignBatch } from "@/lib/admin/email-campaigns";

const schema = z.object({
  delayMinutes: z.number().int().min(1).max(60 * 24 * 7),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const pending = await db.emailCampaignRecipient.count({
      where: {
        campaignId: params.id,
        status: { in: ["PENDING", "SEND_FAILED"] },
      },
    });
    if (pending === 0) {
      return NextResponse.json({ error: "No pending recipients" }, { status: 409 });
    }

    const result = await scheduleCampaignBatch(params.id, parsed.data.delayMinutes);
    if (!result.ok) {
      const status = result.error === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      scheduledAt: result.scheduledAt?.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/schedule-batch]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
