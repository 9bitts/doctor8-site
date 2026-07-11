// src/app/api/admin/campaigns/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recipientsToCsv } from "@/lib/admin/email-campaigns";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const statusFilter = req.nextUrl.searchParams.get("status") || undefined;

    const recipients = await db.emailCampaignRecipient.findMany({
      where: {
        campaignId: params.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        email: true,
        name: true,
        status: true,
        batchNumber: true,
        sentAt: true,
        registeredAt: true,
        errorMessage: true,
      },
    });

    const csv = recipientsToCsv(recipients);
    const slug = campaign.name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-${slug}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/campaigns/[id]/export]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
