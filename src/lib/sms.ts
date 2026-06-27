// SMS account verification ? Twilio Verify (preferred) or direct Messages API.

import { normalizeSmsPhone } from "@/lib/phone";

function twilioAuthHeader(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export function usesTwilioVerify(): boolean {
  return Boolean(
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() &&
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

export function isSmsConfigured(): boolean {
  if (usesTwilioVerify()) return true;
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim(),
  );
}

const SMS_BODY: Record<string, (code: string) => string> = {
  pt: (code) => `Doctor8: seu codigo de verificacao e ${code}. Valido por 10 minutos.`,
  en: (code) => `Doctor8: your verification code is ${code}. Valid for 10 minutes.`,
  es: (code) => `Doctor8: su codigo de verificacion es ${code}. Valido por 10 minutos.`,
};

/** Twilio Verify ? sends OTP via Twilio (no phone number purchase required). */
export async function startTwilioVerification(
  toPhone: string,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const auth = twilioAuthHeader();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!auth || !serviceSid) {
    return { ok: false, skipped: true, error: "SMS not configured" };
  }

  const to = normalizeSmsPhone(toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const params = new URLSearchParams({
    To: `+${to}`,
    Channel: "sms",
  });

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

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
  };

  if (!res.ok) {
    console.error("[TWILIO VERIFY] Start failed:", JSON.stringify(data));
    return { ok: false, error: data.message || `HTTP ${res.status}` };
  }

  return { ok: true };
}

/** Twilio Verify ? checks OTP entered by the user. */
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
    console.error("[TWILIO VERIFY] Check failed:", JSON.stringify(data));
    return { ok: false, error: data.message || `HTTP ${res.status}` };
  }

  if (data.status === "approved") return { ok: true };
  if (data.status === "max_attempts_reached") {
    return { ok: false, error: "max_attempts" };
  }
  return { ok: false, error: "invalid_code" };
}

/** Direct SMS via Twilio Messages API (requires TWILIO_SMS_FROM number). */
export async function sendVerificationSms(opts: {
  toPhone: string;
  code: string;
  language?: string | null;
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const auth = twilioAuthHeader();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!auth || !sid || !from) {
    return { ok: false, skipped: true, error: "SMS not configured" };
  }

  const to = normalizeSmsPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

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

  const data = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };

  if (!res.ok) {
    console.error("[SMS] Send failed:", JSON.stringify(data));
    return { ok: false, error: data.message || `HTTP ${res.status}` };
  }

  return { ok: true };
}
