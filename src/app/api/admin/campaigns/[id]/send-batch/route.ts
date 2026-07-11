// src/app/api/admin/campaigns/[id]/send-batch/route.ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { processCampaignBatch } from "@/lib/admin/email-campaigns";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (campaign.status === "PAUSED") {
      return NextResponse.json({ error: "Campaign is paused" }, { status: 409 });
    }

    const pending = await db.emailCampaignRecipient.count({
      where: {
        campaignId: params.id,
        status: { in: ["PENDING", "SEND_FAILED"] },
      },
    });

    if (pending === 0 && campaign.status === "DONE") {
      return NextResponse.json({ error: "No pending recipients" }, { status: 409 });
    }

    void processCampaignBatch(params.id).catch((err) => {
      console.error("[CAMPAIGN BATCH]", err);
    });

    return NextResponse.json(
      { ok: true, message: "Batch started" },
      { status: 202 },
    );
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/send-batch]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
