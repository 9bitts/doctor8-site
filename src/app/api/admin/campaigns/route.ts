// src/app/api/admin/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getCampaignStats } from "@/lib/admin/email-campaigns";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1).max(50000),
  batchSize: z.number().int().min(1).max(1000).optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const campaigns = await db.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        batchSize: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items = await Promise.all(
      campaigns.map(async (c) => {
        const stats = await getCampaignStats(c.id);
        return { ...c, stats };
      }),
    );

    return NextResponse.json({ campaigns: items });
  } catch (error) {
    console.error("[GET /api/admin/campaigns]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const campaign = await db.emailCampaign.create({
      data: {
        name: parsed.data.name.trim(),
        subject: parsed.data.subject.trim(),
        bodyHtml: parsed.data.bodyHtml,
        batchSize: parsed.data.batchSize ?? 300,
        createdBy: session.user.id!,
      },
    });

    return NextResponse.json({ id: campaign.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/campaigns]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
