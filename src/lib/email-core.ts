// Shared Resend helpers — deliverability + consistent sender identity

import { Resend } from "resend";
import { emailBrandLogoImg } from "./brand";

export type EmailLang = "en" | "pt" | "es";

export const EMAIL_LOCALE: Record<EmailLang, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey && process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    resendInstance = new Resend(apiKey || "re_placeholder");
  }
  return resendInstance;
}

export function normEmailLang(v: string | null | undefined): EmailLang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

const PRODUCTION_APP_URL = "https://app.doctor8.org";

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return true;
  }
}

/** Public base URL for links in emails, redirects, and webhooks. Never localhost in production. */
export function getAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map(normalizeBaseUrl)
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === "production";

  for (const url of candidates) {
    if (isProd && isLocalhostUrl(url)) continue;
    return url;
  }

  if (isProd) {
    return PRODUCTION_APP_URL;
  }

  return candidates[0] || "http://localhost:3000";
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
}): Promise<{ id: string | null }> {
  const replyTo = getReplyTo();
  const plainText = text ?? htmlToPlainText(html);

  const result = await getResend().emails.send({
    from: getFrom(),
    to,
    subject,
    html,
    text: plainText,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      "X-Auto-Response-Suppress": "OOF, AutoReply",
      "X-Entity-Ref-ID": tag ?? "transactional",
    },
    ...(tag ? { tags: [{ name: "category", value: tag }] } : {}),
  });

  return { id: result.data?.id ?? null };
}

export function emailFooter(lang: EmailLang): string {
  const privacy =
    lang === "pt" ? "Política de Privacidade" :
    lang === "es" ? "Política de Privacidad" :
    "Privacy Policy";
  const tagline =
    lang === "pt" ? "Arquitetura alinhada aos princ\u00edpios LGPD e GDPR" :
    lang === "es" ? "Arquitectura alineada a los principios LGPD y GDPR" :
    "Architecture aligned with LGPD and GDPR principles";
  const appUrl = getAppUrl();
  return `
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
      Doctor8 &middot; ${tagline} &middot;
      <a href="${appUrl}/privacy" style="color:#9ca3af;">${privacy}</a>
    </p>`;
}

export function emailHeader(heading: string): string {
  return `
    <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
      ${emailBrandLogoImg(getAppUrl())}
      <p style="color:rgba(255,255,255,.85);margin:12px 0 0;font-size:15px;">${heading}</p>
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
