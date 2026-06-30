// Safe platform capabilities for the support AI ? NO user/patient data, ever.

import { isGoogleMeetEnabled } from "@/lib/google-meet";
import { getPharmacyIntegrationMode } from "@/lib/pharmacy-marketplace/config";
import { isWebPushEnabled } from "@/lib/web-push";

export type SupportPlatformCapabilities = {
  /** Support chat AI (this assistant) */
  supportAiAvailable: boolean;
  /** Clinical consult notes draft generation */
  consultNotesAiAvailable: boolean;
  /** Whisper audio transcription for consult notes */
  consultTranscriptionAvailable: boolean;
  /** Document/resource summarize for professionals */
  documentSummarizeAiAvailable: boolean;
  /** Freud educational assistant (psychoanalyst portal) */
  freudAssistantAvailable: boolean;
  /** Daily.co video consultations */
  videoCallsAvailable: boolean;
  /** Google Meet handoff option */
  googleMeetEnabled: boolean;
  /** Pharmacy compare/buy: disabled | deeplink | api */
  pharmacyMarketplace: "disabled" | "deeplink" | "api";
  /** ICP-Brasil digital prescription signing (Lacuna) */
  digitalSignatureAvailable: boolean;
  /** Stripe online payments */
  stripePaymentsAvailable: boolean;
  /** Browser push notifications */
  webPushAvailable: boolean;
};

function envSet(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

/** Read-only deployment capabilities ? safe to expose to support AI context. */
export function getSupportPlatformCapabilities(): SupportPlatformCapabilities {
  const anthropicOk = envSet("ANTHROPIC_API_KEY");
  const dailyOk = envSet("DAILY_API_KEY") || process.env.E2E_MOCK_DAILY === "1";

  return {
    supportAiAvailable: anthropicOk,
    consultNotesAiAvailable: anthropicOk,
    consultTranscriptionAvailable: envSet("OPENAI_API_KEY"),
    documentSummarizeAiAvailable: anthropicOk,
    freudAssistantAvailable: anthropicOk,
    videoCallsAvailable: dailyOk,
    googleMeetEnabled: isGoogleMeetEnabled(),
    pharmacyMarketplace: getPharmacyIntegrationMode(),
    digitalSignatureAvailable: envSet("LACUNA_API_KEY"),
    stripePaymentsAvailable: envSet("STRIPE_SECRET_KEY"),
    webPushAvailable: isWebPushEnabled(),
  };
}

/** Text block injected into support AI system prompt (server-side only). */
export function buildCapabilitiesContextBlock(caps: SupportPlatformCapabilities): string {
  const lines = [
    "DEPLOYMENT CAPABILITIES (this server instance ? use to answer \"is X available?\"; NOT user-specific):",
    `- Support AI chat: ${caps.supportAiAvailable ? "available" : "unavailable (ANTHROPIC_API_KEY missing)"}`,
    `- AI consult notes: ${caps.consultNotesAiAvailable ? "available" : "unavailable"}`,
    `- Audio transcription (consult notes): ${caps.consultTranscriptionAvailable ? "available" : "unavailable ? paste transcript manually"}`,
    `- AI document summarize: ${caps.documentSummarizeAiAvailable ? "available" : "unavailable"}`,
    `- Freud educational assistant: ${caps.freudAssistantAvailable ? "available" : "unavailable"}`,
    `- Video calls (Daily): ${caps.videoCallsAvailable ? "available" : "unavailable"}`,
    `- Google Meet handoff: ${caps.googleMeetEnabled ? "enabled" : "disabled in this deployment"}`,
    `- Pharmacy marketplace: ${caps.pharmacyMarketplace}`,
    `- Digital prescription signing (ICP-Brasil): ${caps.digitalSignatureAvailable ? "available" : "unavailable"}`,
    `- Online payments (Stripe): ${caps.stripePaymentsAvailable ? "available" : "unavailable"}`,
    `- Browser push notifications: ${caps.webPushAvailable ? "available" : "unavailable"}`,
  ];
  return lines.join("\n");
}

/** JSON-safe payload for GET /api/support/context ? no PII fields allowed. */
export type SupportContextApiResponse = {
  capabilities: SupportPlatformCapabilities;
  session: {
    isLoggedIn: boolean;
    /** Role enum only ? never id, name, email, or counts */
    role: string | null;
  };
};

const ALLOWED_CAPABILITY_KEYS = new Set(Object.keys(getSupportPlatformCapabilities()));

const ALLOWED_ROLES = new Set([
  "PATIENT",
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
  "ORGANIZATION",
  "ADMIN",
]);

/** Strip any unexpected fields ? defense in depth against accidental PII leakage. */
export function sanitizeSupportContextResponse(
  raw: SupportContextApiResponse,
): SupportContextApiResponse {
  const caps: Record<string, unknown> = {};
  for (const key of ALLOWED_CAPABILITY_KEYS) {
    if (key in raw.capabilities) {
      caps[key] = raw.capabilities[key as keyof SupportPlatformCapabilities];
    }
  }

  const session: SupportContextApiResponse["session"] = {
    isLoggedIn: raw.session.isLoggedIn === true,
    role:
      typeof raw.session.role === "string" &&
      raw.session.role.length <= 32 &&
      ALLOWED_ROLES.has(raw.session.role)
        ? raw.session.role
        : null,
  };

  return {
    capabilities: caps as SupportPlatformCapabilities,
    session,
  };
}

/** Assert response contains no forbidden PII keys (for tests/scripts). */
export function assertNoPiiInSupportContext(payload: unknown): void {
  const forbiddenExact = new Set([
    "email",
    "name",
    "phone",
    "cpf",
    "userid",
    "patientid",
    "firstname",
    "lastname",
    "address",
    "password",
    "token",
    "prescription",
    "appointment",
    "messages",
    "diagnosis",
  ]);

  function walk(obj: unknown, path: string): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (forbiddenExact.has(lower)) {
        throw new Error(`PII key forbidden in support context: ${path}.${key}`);
      }
      walk(value, `${path}.${key}`);
    }
  }

  walk(payload, "root");
}
