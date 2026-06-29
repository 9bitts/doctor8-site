// Choose verification method after registration — server-rendered.

import { cookies, headers } from "next/headers";
import { Lang, normalizeLang } from "@/lib/i18n/translations";
import { isSmsConfigured } from "@/lib/sms";
import { resolveVerifyFrom } from "@/lib/auth-portals";
import VerifyAccountClient from "./VerifyAccountClient";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

export default function VerifyAccountPage({
  searchParams,
}: {
  searchParams: { email?: string; callbackUrl?: string; from?: string };
}) {
  const lang = detectLang();
  const email = searchParams.email || "";
  const callbackUrl = searchParams.callbackUrl || "";
  const from = resolveVerifyFrom({ from: searchParams.from, callbackUrl });

  return (
    <VerifyAccountClient
      lang={lang}
      email={email}
      callbackUrl={callbackUrl}
      from={from}
      smsEnabled={isSmsConfigured()}
    />
  );
}
