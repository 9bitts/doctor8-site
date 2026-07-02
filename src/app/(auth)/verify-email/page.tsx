// Shown after registration — tells user to check their email (server-rendered; avoids useSearchParams crash).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canSkipHumanitarianEmailVerification } from "@/lib/humanitarian/feature-flags";
import {
  HUM_ORIGIN_COOKIE,
  HUM_RETURN_COOKIE,
  defaultHumanitarianReturnPath,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";
import VerifyEmailClient from "./VerifyEmailClient";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string; callbackUrl?: string; from?: string };
}) {
  const callbackUrl = searchParams.callbackUrl ?? "";
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

  return (
    <VerifyEmailClient
      email={searchParams.email ?? ""}
      error={searchParams.error}
      callbackUrl={searchParams.callbackUrl}
      from={searchParams.from}
    />
  );
}
