// Shared Resend helpers — deliverability + consistent sender identity

import { Resend } from "resend";

export type EmailLang = "en" | "pt" | "es";

export const EMAIL_LOCALE: Record<EmailLang, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  }
  return resendInstance;
}

export function normEmailLang(v: string | null | undefined): EmailLang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
}

function getFrom(): string {
  const raw = process.env.EMAIL_FROM || "noreply@doctor8.org";
  if (raw.includes("<")) return raw;
  return `Doctor8 <${raw}>`;
}

function getReplyTo(): string | undefined {
  const replyTo = process.env.EMAIL_REPLY_TO || process.env.DPO_EMAIL;
  return replyTo?.trim() || undefined;
}

/** Strip tags and collapse whitespace for multipart/alternative plain-text part. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  tag,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tag?: string;
}) {
  const replyTo = getReplyTo();
  const plainText = text ?? htmlToPlainText(html);

  await getResend().emails.send({
    from: getFrom(),
    to,
    subject,
    html,
    text: plainText,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
      "X-Entity-Ref-ID": tag ?? "transactional",
    },
    ...(tag ? { tags: [{ name: "category", value: tag }] } : {}),
  });
}

export function emailFooter(lang: EmailLang): string {
  const privacy =
    lang === "pt" ? "Política de Privacidade" :
    lang === "es" ? "Política de Privacidad" :
    "Privacy Policy";
  const appUrl = getAppUrl();
  return `
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
      Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot;
      <a href="${appUrl}/privacy" style="color:#9ca3af;">${privacy}</a>
    </p>`;
}

export function emailHeader(heading: string): string {
  return `
    <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
      <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">${heading}</p>
    </div>`;
}

export function emailShell(heading: string, body: string, lang: EmailLang): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
      <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
        ${emailHeader(heading)}
        <div style="padding:32px;">
          ${body}
        </div>
      </div>
      ${emailFooter(lang)}
    </div>`;
}
