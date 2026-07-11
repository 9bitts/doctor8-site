// src/app/api/admin/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getCampaignStats, deleteCampaign } from "@/lib/admin/email-campaigns";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(300).optional(),
  bodyHtml: z.string().min(1).max(50000).optional(),
  batchSize: z.number().int().min(1).max(1000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({
      where: { id: params.id },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const stats = await getCampaignStats(params.id);

    const { searchParams } = req.nextUrl;
    const statusFilter = searchParams.get("status") || undefined;
    const q = searchParams.get("q")?.trim().toLowerCase() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      campaignId: params.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q ? { email: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [recipients, recipientTotal] = await Promise.all([
      db.emailCampaignRecipient.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          batchNumber: true,
          sentAt: true,
          registeredAt: true,
          errorMessage: true,
          userId: true,
          createdAt: true,
        },
      }),
      db.emailCampaignRecipient.count({ where }),
    ]);

    return NextResponse.json({
      campaign,
      stats,
      recipients,
      pagination: {
        page,
        limit,
        total: recipientTotal,
        pages: Math.ceil(recipientTotal / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/campaigns/[id]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaign = await db.emailCampaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["DRAFT", "PAUSED"].includes(campaign.status)) {
      return NextResponse.json({ error: "Cannot edit campaign in current status" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.emailCampaign.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject.trim() } : {}),
        ...(parsed.data.bodyHtml !== undefined ? { bodyHtml: parsed.data.bodyHtml } : {}),
        ...(parsed.data.batchSize !== undefined ? { batchSize: parsed.data.batchSize } : {}),
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/campaigns/[id]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await deleteCampaign(params.id);
    if (!result.ok) {
      const status = result.error === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/campaigns/[id]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
