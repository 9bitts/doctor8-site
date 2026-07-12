import { NextRequest, NextResponse } from "next/server";
import { forwardWhatsAppWebhookToChatwoot } from "@/lib/chatwoot-whatsapp-forward";
import { verifyWhatsAppWebhookSignature } from "@/lib/whatsapp-webhook";
import { processWhatsAppWebhookEvents } from "@/lib/whatsapp-webhook-events";

export const dynamic = "force-dynamic";

/** Meta WhatsApp Cloud API webhook — verification, delivery logs, Chatwoot relay. */
export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "";
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token")?.trim();
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await processWhatsAppWebhookEvents(body);

  const forward = await forwardWhatsAppWebhookToChatwoot(rawBody, signature);
  if (!forward.ok && forward.error !== "disabled") {
    console.error("[WHATSAPP WEBHOOK] Chatwoot forward failed:", forward.error);
  }

  return NextResponse.json({
    received: true,
    chatwootForward: forward.ok ? "ok" : forward.error === "disabled" ? "disabled" : "failed",
  });
}
