import { NextRequest, NextResponse } from "next/server";
import { logWhatsAppDelivery } from "@/lib/integration-logs";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "";

/** Meta WhatsApp Cloud API webhook ? verification + delivery status updates. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entry = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entry)) {
    return NextResponse.json({ received: true });
  }

  for (const e of entry) {
    const changes = (e as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: { statuses?: unknown[]; messages?: unknown[] } })?.value;
      const statuses = value?.statuses;
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          const row = st as { id?: string; status?: string; recipient_id?: string; errors?: { title?: string }[] };
          await logWhatsAppDelivery({
            messageId: row.id,
            phone: row.recipient_id,
            status: row.status || "unknown",
            detail: row.errors?.[0]?.title,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
