import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignatureSession } from "@/lib/lacuna";
import { markDigitalSignTrust } from "@/lib/digital-sign-session";
import { getPublicBase } from "@/lib/sign-helpers";

export const runtime = "nodejs";
export const maxDuration = 30;

function safeReturnPath(returnTo: string | null): string {
  if (!returnTo) return "/professional/account";
  const path = returnTo.split("?")[0].split("#")[0];
  if (!path.startsWith("/professional/") && !path.startsWith("/psychologist/")) {
    return "/professional/account";
  }
  return path;
}

function redirectAfterTest(req: NextRequest, signTest: string) {
  const returnTo = safeReturnPath(req.nextUrl.searchParams.get("returnTo"));
  const url = new URL(`${getPublicBase(req)}${returnTo}`);
  url.hash = "digital-sign";
  url.searchParams.set("signTest", signTest);
  const response = NextResponse.redirect(url);
  if (signTest === "success") markDigitalSignTrust(response);
  return response;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`${getPublicBase(req)}/login`));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  if (!signatureSessionId) {
    return redirectAfterTest(req, "cancelled");
  }

  try {
    const lacuna = await getSignatureSession(signatureSessionId);
    const status = (lacuna.status || "").toLowerCase();
    if (status === "completed") {
      return redirectAfterTest(req, "success");
    }
    if (status.includes("cancel")) {
      return redirectAfterTest(req, "cancelled");
    }
    return redirectAfterTest(req, "error");
  } catch {
    return redirectAfterTest(req, "error");
  }
}
