// Validates email verification token and marks email as verified

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/email-core";
import { buildVerifyConfirmedHref, sanitizeLoginFrom } from "@/lib/auth-portals";

function redirect(pathWithQuery: string) {
  return NextResponse.redirect(new URL(pathWithQuery, getAppUrl()));
}

function redirectConfirmedError(from: string | undefined, code: string) {
  const base = buildVerifyConfirmedHref(from);
  const sep = base.includes("?") ? "&" : "?";
  return redirect(`${base}${sep}error=${code}`);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const from = sanitizeLoginFrom(req.nextUrl.searchParams.get("from"));

  if (!token) {
    return redirectConfirmedError(from, "invalid");
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return redirectConfirmedError(from, "invalid");
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      const emailQs = new URLSearchParams({
        error: "expired",
        email: verificationToken.identifier,
      });
      if (from) emailQs.set("from", from);
      return redirect(`/verify-email?${emailQs.toString()}`);
    }

    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({ where: { token } });

    return redirect(buildVerifyConfirmedHref(from));
  } catch (error) {
    console.error("[VERIFY EMAIL ERROR]", error);
    return redirectConfirmedError(from, "failed");
  }
}
