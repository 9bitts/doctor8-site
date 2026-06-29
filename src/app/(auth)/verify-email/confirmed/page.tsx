// Server-rendered confirmation after email verification — no client JS required.

import { cookies, headers } from "next/headers";
import { Lang, normalizeLang } from "@/lib/i18n/translations";
import { sanitizeLoginFrom } from "@/lib/auth-portals";
import VerifyConfirmedClient from "./VerifyConfirmedClient";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

type ErrorCode = "invalid" | "failed";

export default function VerifyEmailConfirmedPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  const lang = detectLang();
  const error = searchParams.error as ErrorCode | undefined;
  const isSuccess = !error;

  return (
    <VerifyConfirmedClient
      lang={lang}
      isSuccess={isSuccess}
      error={error}
      from={sanitizeLoginFrom(searchParams.from)}
    />
  );
}
