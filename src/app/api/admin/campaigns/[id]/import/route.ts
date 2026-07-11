// src/app/api/admin/campaigns/[id]/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { importCampaignRecipients, parseCampaignCsv } from "@/lib/admin/email-campaigns";

const jsonSchema = z.object({
  csv: z.string().min(1),
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

    let csvText: string;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const parsed = jsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      csvText = parsed.data.csv;
    } else {
      csvText = await req.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
    }

    const { rows, invalid } = parseCampaignCsv(csvText);
    const result = await importCampaignRecipients(params.id, rows);

    return NextResponse.json({
      ...result,
      invalid: result.invalid + invalid,
      parsed: rows.length,
    });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/[id]/import]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
