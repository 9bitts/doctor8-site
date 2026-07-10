// SMS ? AWS SNS (primary) or Twilio Verify / Messages (fallback).

import { normalizeSmsPhone } from "@/lib/phone";
import { isAwsSnsConfigured, sendSnsOtp, isAwsSnsProductionReady, type SmsErrorCode } from "@/lib/sms-sns";

export type { SmsErrorCode };

type TwilioErrorBody = {
  status?: string;
  message?: string;
  code?: number;
};

function twilioAuthHeader(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export function usesDatabaseOtp(): boolean {
  return isAwsSnsConfigured() || !usesTwilioVerify();
}

export function usesTwilioVerify(): boolean {
  if (isAwsSnsConfigured()) return false;
  return Boolean(
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() &&
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

export function isSmsConfigured(): boolean {
  if (isAwsSnsConfigured()) return true;
  if (usesTwilioVerify()) return true;
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim(),
  );
}

/** User-facing SMS (OTP / password reset). AWS SNS stays off until production quota is approved. */
export function isSmsUserFacingEnabled(): boolean {
  if (!isSmsConfigured()) return false;
  if (isAwsSnsConfigured()) return isAwsSnsProductionReady();
  return true;
}

export { isAwsSnsConfigured, isAwsSnsProductionReady };

const SMS_BODY: Record<string, (code: string) => string> = {
  pt: (code) => `Doctor8: seu codigo de verificacao e ${code}. Valido por 10 minutos.`,
  en: (code) => `Doctor8: your verification code is ${code}. Valid for 10 minutes.`,
  es: (code) => `Doctor8: su codigo de verificacion es ${code}. Valido por 10 minutos.`,
};

export function mapTwilioErrorCode(data: TwilioErrorBody): SmsErrorCode {
  const code = data.code;
  const msg = (data.message || "").toLowerCase();

  if (code === 21608 || code === 21408 || msg.includes("unverified")) {
    return "TRIAL_UNVERIFIED";
  }
  if (code === 60605 || code === 60223 || msg.includes("geo-permissions")) {
    return "GEO_BLOCKED";
  }
  if (code === 60410 || msg.includes("fraud guard")) {
    return "FRAUD_BLOCKED";
  }
  if (code === 60203 || msg.includes("max send attempts")) {
    return "RATE_LIMITED";
  }
  if (code === 60200 || code === 60205 || code === 60612) {
    return "INVALID_PHONE";
  }
  return "SEND_FAILED";
}

export async function sendOtpSms(opts: {
  toPhone: string;
  code: string;
  language?: string | null;
}): Promise<{ ok: boolean; error?: SmsErrorCode; skipped?: boolean; detail?: string }> {
  if (isAwsSnsConfigured()) {
    return sendSnsOtp(opts);
  }

  const auth = twilioAuthHeader();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!auth || !sid || !from) {
    return { ok: false, skipped: true, error: "SMS_UNAVAILABLE" };
  }

  const to = normalizeSmsPhone(opts.toPhone);
  if (!to) return { ok: false, error: "INVALID_PHONE" };

  const lang =
    opts.language === "pt" || opts.language === "es" ? opts.language : "en";
  const body = (SMS_BODY[lang] ?? SMS_BODY.en)(opts.code);

  const params = new URLSearchParams({
    To: `+${to}`,
    From: from.startsWith("+") ? from : `+${from}`,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    console.error("[TWILIO SMS] Send failed:", data.message || `HTTP ${res.status}`);
    return { ok: false, error: "SEND_FAILED", detail: data.message };
  }
  return { ok: true };
}

export async function sendAppointmentReminderSms(opts: {
  toPhone: string;
  body: string;
}): Promise<{ ok: boolean; error?: SmsErrorCode; skipped?: boolean; detail?: string }> {
  if (!isSmsConfigured()) {
    return { ok: false, skipped: true, error: "SMS_UNAVAILABLE" };
  }

  if (isAwsSnsConfigured()) {
    const to = normalizeSmsPhone(opts.toPhone);
    if (!to) return { ok: false, error: "INVALID_PHONE" };
    const { PublishCommand, SNSClient } = await import("@aws-sdk/client-sns");
    const client = new SNSClient({
      region: process.env.AWS_REGION || "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    try {
      await client.send(new PublishCommand({
        PhoneNumber: `+${to}`,
        Message: opts.body,
      }));
      return { ok: true };
    } catch (e) {
      console.error("[SNS SMS] Reminder failed:", e);
      return { ok: false, error: "SEND_FAILED" };
    }
  }

  const auth = twilioAuthHeader();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!auth || !sid || !from) {
    return { ok: false, skipped: true, error: "SMS_UNAVAILABLE" };
  }

  const to = normalizeSmsPhone(opts.toPhone);
  if (!to) return { ok: false, error: "INVALID_PHONE" };

  const params = new URLSearchParams({
    To: `+${to}`,
    From: from.startsWith("+") ? from : `+${from}`,
    Body: opts.body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    console.error("[TWILIO SMS] Reminder failed:", data.message || `HTTP ${res.status}`);
    return { ok: false, error: "SEND_FAILED", detail: data.message };
  }
  return { ok: true };
}

export async function startTwilioVerification(
  toPhone: string,
): Promise<{ ok: boolean; error?: SmsErrorCode; skipped?: boolean; detail?: string }> {
  const auth = twilioAuthHeader();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!auth || !serviceSid) {
    return { ok: false, skipped: true, error: "SMS_UNAVAILABLE" };
  }

  const to = normalizeSmsPhone(toPhone);
  if (!to) return { ok: false, error: "INVALID_PHONE" };

  const params = new URLSearchParams({ To: `+${to}`, Channel: "sms" });

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json().catch(() => ({}))) as TwilioErrorBody;
  if (!res.ok) {
    const error = mapTwilioErrorCode(data);
    console.error("[TWILIO VERIFY] Start failed:", data.message || `HTTP ${res.status}`);
    return { ok: false, error, detail: data.message };
  }
  return { ok: true };
}

export async function checkTwilioVerification(
  toPhone: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = twilioAuthHeader();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!auth || !serviceSid) {
    return { ok: false, error: "SMS not configured" };
  }

  const to = normalizeSmsPhone(toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const params = new URLSearchParams({
    To: `+${to}`,
    Code: code.replace(/\D/g, ""),
  });

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
  };

  if (!res.ok) {
    console.error("[TWILIO VERIFY] Check failed:", data.message || `HTTP ${res.status}`);
    return { ok: false, error: data.message || `HTTP ${res.status}` };
  }
  if (data.status === "approved") return { ok: true };
  if (data.status === "max_attempts_reached") {
    return { ok: false, error: "max_attempts" };
  }
  return { ok: false, error: "invalid_code" };
}
