// SMS via Twilio ? account verification codes.

import { normalizeSmsPhone } from "@/lib/phone";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim(),
  );
}

const SMS_BODY: Record<string, (code: string) => string> = {
  pt: (code) => `Doctor8: seu c?digo de verifica??o ? ${code}. V?lido por 10 minutos.`,
  en: (code) => `Doctor8: your verification code is ${code}. Valid for 10 minutes.`,
  es: (code) => `Doctor8: su c?digo de verificaci?n es ${code}. V?lido por 10 minutos.`,
};

export async function sendVerificationSms(opts: {
  toPhone: string;
  code: string;
  language?: string | null;
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!isSmsConfigured()) {
    return { ok: false, skipped: true, error: "SMS not configured" };
  }

  const to = normalizeSmsPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const lang =
    opts.language === "pt" || opts.language === "es" ? opts.language : "en";
  const body = (SMS_BODY[lang] ?? SMS_BODY.en)(opts.code);

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_SMS_FROM!.trim();

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
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
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
