// Relay Meta WhatsApp webhook POSTs to Chatwoot while Doctor8 keeps the primary callback URL.

export type ChatwootForwardStatus = {
  enabled: boolean;
  url: string | null;
  note: string;
};

export function getChatwootForwardStatus(): ChatwootForwardStatus {
  const url = process.env.CHATWOOT_WHATSAPP_FORWARD_URL?.trim() || null;
  const enabled = process.env.CHATWOOT_WHATSAPP_FORWARD_ENABLED === "1" && Boolean(url);

  let note: string;
  if (!url) {
    note = "Set CHATWOOT_WHATSAPP_FORWARD_URL (from Chatwoot inbox settings) to enable relay.";
  } else if (!enabled) {
    note = "URL set — enable with CHATWOOT_WHATSAPP_FORWARD_ENABLED=1.";
  } else {
    note = "Inbound WhatsApp POSTs relay to Chatwoot after Doctor8 processes delivery statuses.";
  }

  return { enabled, url, note };
}

export function isChatwootForwardEnabled(): boolean {
  return getChatwootForwardStatus().enabled;
}

/** Forwards the raw Meta payload so Chatwoot can verify X-Hub-Signature-256 with the same app secret. */
export async function forwardWhatsAppWebhookToChatwoot(
  rawBody: string,
  signatureHeader: string | null,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = process.env.CHATWOOT_WHATSAPP_FORWARD_URL?.trim();
  if (!isChatwootForwardEnabled() || !url) {
    return { ok: false, error: "disabled" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signatureHeader ? { "x-hub-signature-256": signatureHeader } : {}),
      },
      body: rawBody,
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text.slice(0, 300) || `HTTP ${res.status}` };
    }

    return { ok: true, status: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : "forward failed";
    console.error("[CHATWOOT WHATSAPP FORWARD]", message);
    return { ok: false, error: message };
  }
}
