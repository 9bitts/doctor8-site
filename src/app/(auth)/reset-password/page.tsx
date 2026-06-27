// Server-rendered password reset — validates token before loading client form.

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { Lang, normalizeLang } from "@/lib/i18n/translations";
import ResetPasswordForm, {
  ResetPasswordMessage,
  ResetPasswordShell,
} from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

async function tokenStatus(token: string): Promise<"ok" | "invalid" | "expired"> {
  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith("reset:")) return "invalid";
  if (record.expires < new Date()) return "expired";
  return "ok";
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const lang = detectLang();
  const token = searchParams.token?.trim() || "";

  if (!token) {
    return <ResetPasswordMessage lang={lang} variant="missing" />;
  }

  const status = await tokenStatus(token);
  if (status !== "ok") {
    return <ResetPasswordMessage lang={lang} variant={status} />;
  }

  return (
    <ResetPasswordShell lang={lang}>
      <ResetPasswordForm token={token} lang={lang} />
    </ResetPasswordShell>
  );
}
