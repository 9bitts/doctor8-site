// QStash worker — processes one email campaign batch
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyQStashSignature } from "@/lib/qstash";
import { processCampaignBatch } from "@/lib/admin/email-campaigns";

const schema = z.object({
  campaignId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const isValid = await verifyQStashSignature(req, rawBody);
  if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await processCampaignBatch(parsed.data.campaignId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/campaigns/process-batch]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
