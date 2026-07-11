// Resend webhook — updates campaign recipient engagement statuses
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { handleResendCampaignWebhook } from "@/lib/admin/resend-campaign-webhook";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const rawBody = await req.text();

  let payload: Parameters<typeof handleResendCampaignWebhook>[0];

  if (secret) {
    try {
      const wh = new Webhook(secret);
      payload = wh.verify(rawBody, {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      }) as typeof payload;
    } catch (err) {
      console.error("[RESEND WEBHOOK] Verify failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[RESEND WEBHOOK] RESEND_WEBHOOK_SECRET missing in production");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  } else {
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  try {
    const result = await handleResendCampaignWebhook(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[POST /api/webhooks/resend]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
