import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignatureSession } from "@/lib/lacuna";
import { getPublicBase } from "@/lib/sign-helpers";

export const runtime = "nodejs";
export const maxDuration = 30;

function redirectAccount(req: NextRequest, signTest: string) {
  const url = new URL(`${getPublicBase(req)}/professional/account`);
  url.hash = "digital-sign";
  url.searchParams.set("signTest", signTest);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`${getPublicBase(req)}/login`));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  if (!signatureSessionId) {
    return redirectAccount(req, "cancelled");
  }

  try {
    const lacuna = await getSignatureSession(signatureSessionId);
    const status = (lacuna.status || "").toLowerCase();
    if (status === "completed") {
      return redirectAccount(req, "success");
    }
    if (status.includes("cancel")) {
      return redirectAccount(req, "cancelled");
    }
    return redirectAccount(req, "error");
  } catch {
    return redirectAccount(req, "error");
  }
}
