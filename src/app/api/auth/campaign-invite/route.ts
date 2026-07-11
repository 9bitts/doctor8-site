// Public lookup for campaign invite tokens — prefill professional signup email.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  try {
    const recipient = await db.emailCampaignRecipient.findUnique({
      where: { token },
      select: { email: true, name: true, status: true },
    });

    if (
      !recipient
      || recipient.status === "OPTED_OUT"
      || recipient.status === "REGISTERED"
    ) {
      return NextResponse.json({ error: "INVALID_OR_USED" }, { status: 404 });
    }

    return NextResponse.json({
      email: recipient.email,
      name: recipient.name,
    });
  } catch (error) {
    console.error("[GET /api/auth/campaign-invite]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
