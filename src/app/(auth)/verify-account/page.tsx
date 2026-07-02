// Choose verification method after registration — server-rendered.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Lang, normalizeLang } from "@/lib/i18n/translations";
import { isSmsConfigured } from "@/lib/sms";
import { resolveVerifyFrom } from "@/lib/auth-portals";
import { canSkipHumanitarianEmailVerification } from "@/lib/humanitarian/feature-flags";
import {
  HUM_ORIGIN_COOKIE,
  HUM_RETURN_COOKIE,
  defaultHumanitarianReturnPath,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";
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
  const email = searchParams.email || "";
  const callbackUrl = searchParams.callbackUrl || "";
  const from = resolveVerifyFrom({ from: searchParams.from, callbackUrl });

  const originCookie = cookies().get(HUM_ORIGIN_COOKIE)?.value === "1";
  const returnPath = cookies().get(HUM_RETURN_COOKIE)?.value;
  const safeReturn = returnPath?.startsWith("/") ? returnPath : null;
  const effectiveCallback = resolveHumanitarianAuthCallback(callbackUrl, {
    originCookie,
    returnPath: safeReturn,
  });

  if (canSkipHumanitarianEmailVerification(effectiveCallback, originCookie)) {
    redirect(effectiveCallback || safeReturn || defaultHumanitarianReturnPath());
  }

  const lang = detectLang();

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
