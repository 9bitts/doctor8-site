// Read-only integration health for admin dashboards (no secrets exposed).

import { getWhatsAppReadiness } from "@/lib/whatsapp";
import { isWebPushEnabled } from "@/lib/web-push";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";
import { isSentryEnabled } from "../../sentry.shared.config";

export type IntegrationHealth = "ok" | "partial" | "missing" | "fallback";

export type IntegrationRow = {
  id: string;
  health: IntegrationHealth;
  configured: boolean;
  detail: string;
};

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function getIntegrationStatuses(): IntegrationRow[] {
  const wa = getWhatsAppReadiness();
  const stripeOk = has(process.env.STRIPE_SECRET_KEY);
  const stripeWebhook = has(process.env.STRIPE_WEBHOOK_SECRET);
  const dailyOk = has(process.env.DAILY_API_KEY) || process.env.E2E_MOCK_DAILY === "1";
  const lacunaOk = has(process.env.LACUNA_API_KEY);
  const resendOk = has(process.env.RESEND_API_KEY);
  const qstashOk = has(process.env.QSTASH_TOKEN);
  const qstashVerify = has(process.env.QSTASH_CURRENT_SIGNING_KEY);
  const s3Ok = has(process.env.AWS_ACCESS_KEY_ID) && has(process.env.AWS_S3_BUCKET);
  const anthropicOk = has(process.env.ANTHROPIC_API_KEY);

  return [
    {
      id: "whatsapp",
      health: wa.configured ? "partial" : "fallback",
      configured: wa.configured,
      detail: wa.note,
    },
    {
      id: "stripe",
      health: stripeOk && stripeWebhook ? "ok" : stripeOk ? "partial" : "missing",
      configured: stripeOk,
      detail: stripeOk
        ? stripeWebhook
          ? "Secret key and webhook secret configured."
          : "Secret key set; webhook secret missing."
        : "Stripe not configured.",
    },
    {
      id: "daily",
      health: dailyOk ? "ok" : "missing",
      configured: dailyOk,
      detail: dailyOk
        ? process.env.E2E_MOCK_DAILY === "1"
          ? "Mock mode (E2E_MOCK_DAILY)."
          : isDailyCloudRecordingEnabled()
            ? "Daily.co API key configured; cloud recording enabled."
            : "Daily.co API key configured."
        : "Video calls need DAILY_API_KEY.",
    },
    {
      id: "lacuna",
      health: lacunaOk ? "partial" : "missing",
      configured: lacunaOk,
      detail: lacunaOk
        ? "ICP-Brasil signing API key set; certificate flow depends on Lacuna + user CPF."
        : "Digital signatures disabled without LACUNA_API_KEY.",
    },
    {
      id: "resend",
      health: resendOk ? "ok" : "missing",
      configured: resendOk,
      detail: resendOk ? "Transactional email via Resend." : "Email delivery needs RESEND_API_KEY.",
    },
    {
      id: "qstash",
      health: qstashOk && qstashVerify ? "ok" : qstashOk ? "partial" : "missing",
      configured: qstashOk,
      detail: qstashOk
        ? qstashVerify
          ? "Scheduled reminders via QStash."
          : "QStash token set; signing keys missing for webhooks."
        : "Reminder scheduling falls back to inline/cron without QSTASH_TOKEN.",
    },
    {
      id: "sentry",
      health: isSentryEnabled() ? "ok" : "missing",
      configured: isSentryEnabled(),
      detail: isSentryEnabled()
        ? "Error monitoring active (SENTRY_DSN)."
        : "Optional ? set SENTRY_DSN to capture production errors.",
    },
    {
      id: "s3",
      health: s3Ok ? "ok" : "missing",
      configured: s3Ok,
      detail: s3Ok ? "File storage (AWS S3) configured." : "Document uploads need AWS credentials.",
    },
    {
      id: "anthropic",
      health: anthropicOk ? "ok" : "missing",
      configured: anthropicOk,
      detail: anthropicOk
        ? "AI consult notes assistant available."
        : "AI notes disabled without ANTHROPIC_API_KEY.",
    },
    {
      id: "webpush",
      health: isWebPushEnabled() ? "ok" : "missing",
      configured: isWebPushEnabled(),
      detail: isWebPushEnabled()
        ? "Browser push via VAPID keys (in-app + push)."
        : "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable browser push.",
    },
  ];
}
