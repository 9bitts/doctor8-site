// src/app/api/admin/campaigns/[id]/send-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendCampaignTestEmail } from "@/lib/admin/email-campaigns";

const schema = z.object({
  email: z.string().email(),
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

    await sendCampaignTestEmail({
      campaignId: params.id,
      to: parsed.data.email.toLowerCase(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/send-test]", error);
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
