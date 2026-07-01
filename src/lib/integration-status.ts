// Read-only integration health for admin dashboards (no secrets exposed).

import { getWhatsAppReadiness } from "@/lib/whatsapp";
import { isWebPushEnabled, getVapidPublicKey } from "@/lib/web-push";
import { isSmsConfigured, usesTwilioVerify, isAwsSnsConfigured } from "@/lib/sms";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";
import { isGoogleMeetEnabled, isCalendarMeetConfigured } from "@/lib/google-meet";
import { getPharmacyIntegrationMode } from "@/lib/pharmacy-marketplace/config";
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
  const smsOk = isSmsConfigured();
  const twilioVerify = usesTwilioVerify();
  const awsSms = isAwsSnsConfigured();
  const vapidPublic = getVapidPublicKey();
  const vapidClient = has(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const dailyOk = has(process.env.DAILY_API_KEY) || process.env.E2E_MOCK_DAILY === "1";
  const lacunaOk = has(process.env.LACUNA_API_KEY);
  const resendOk = has(process.env.RESEND_API_KEY);
  const qstashOk = has(process.env.QSTASH_TOKEN);
  const qstashVerify = has(process.env.QSTASH_CURRENT_SIGNING_KEY);
  const s3Ok = has(process.env.AWS_ACCESS_KEY_ID) && has(process.env.AWS_S3_BUCKET);
  const anthropicOk = has(process.env.ANTHROPIC_API_KEY);
  const cronOk = has(process.env.CRON_SECRET);
  const meetEnabled = isGoogleMeetEnabled();
  const meetCalendar = isCalendarMeetConfigured();
  const pharmacyMode = getPharmacyIntegrationMode();

  return [
    {
      id: "whatsapp",
      health: wa.productionReady ? "ok" : wa.configured ? "partial" : "fallback",
      configured: wa.configured,
      detail: wa.note,
    },
    {
      id: "twilio",
      health: smsOk ? "ok" : "missing",
      configured: smsOk,
      detail: smsOk
        ? awsSms
          ? "AWS SNS SMS (AWS_SNS_SMS_ENABLED=1). Requires production SMS access in AWS."
          : twilioVerify
            ? "Twilio Verify OTP (TWILIO_VERIFY_SERVICE_SID) + SMS fallback."
            : "Twilio SMS (TWILIO_SMS_FROM) for verification codes."
        : "SMS OTP needs AWS_SNS_SMS_ENABLED=1 (+ AWS keys) or Twilio credentials.",
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
            ? "Daily.co configured; cloud recording ON (~$0.013/min). Webhook: POST /api/webhooks/daily."
            : "Daily.co configured; video calls active. Cloud recording OFF (default ? no extra Daily recording fees)."
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
          ? "Scheduled reminders + post-consult notes via QStash. Cron: /api/cron/reminders and /api/cron/post-consult-notes (x-cron-secret)."
          : "QStash token set; signing keys missing for webhooks."
        : "Set QSTASH_TOKEN for scheduled reminders; use /api/cron/reminders as backup.",
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
      health: isWebPushEnabled() ? (vapidClient ? "ok" : "partial") : "missing",
      configured: isWebPushEnabled(),
      detail: isWebPushEnabled()
        ? vapidClient
          ? "Browser push active (VAPID keys + NEXT_PUBLIC_VAPID_PUBLIC_KEY)."
          : `VAPID server keys set. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidPublic ? "(same as VAPID_PUBLIC_KEY)" : ""} for client subscription.`
        : "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable browser push.",
    },
    {
      id: "googlemeet",
      health: meetEnabled && meetCalendar ? "ok" : meetEnabled ? "partial" : "missing",
      configured: meetEnabled,
      detail: meetEnabled
        ? meetCalendar
          ? "Google Meet enabled with service account + calendar user (humanitarian + appointments)."
          : "GOOGLE_MEET_ENABLED=1 but missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_USER."
        : "Optional — set GOOGLE_MEET_ENABLED=1 + service account (see .env.example).",
    },
    {
      id: "pharmacy",
      health: pharmacyMode === "api" ? "ok" : pharmacyMode === "deeplink" ? "partial" : "missing",
      configured: pharmacyMode !== "disabled",
      detail:
        pharmacyMode === "api"
          ? "Pharmacy marketplace API mode (PHARMACY_MARKETPLACE_ENABLED + API keys)."
          : pharmacyMode === "deeplink"
            ? "Partner deeplink active (Consulta Remédios). Set PHARMACY_UTM_ENABLED when whitelisted."
            : "Set PHARMACY_MARKETPLACE_ENABLED=true for Compare and buy links.",
    },
    {
      id: "cron",
      health: cronOk ? "ok" : qstashOk ? "partial" : "missing",
      configured: cronOk,
      detail: cronOk
        ? "CRON_SECRET set — schedule POST /api/cron/reminders and /api/cron/post-consult-notes (header x-cron-secret)."
        : "Generate CRON_SECRET for backup cron; QStash is primary when configured.",
    },
    {
      id: "smart",
      health: process.env.SMART_OAUTH_REDIRECT_URIS?.trim() ? "ok" : "partial",
      configured: true,
      detail: process.env.SMART_OAUTH_REDIRECT_URIS?.trim()
        ? "SMART on FHIR OAuth with patient consent. Register third-party apps in Admin ? Integrations."
        : "SMART OAuth active; set SMART_OAUTH_REDIRECT_URIS or register apps in Admin ? Integrations.",
    },
  ];
}
