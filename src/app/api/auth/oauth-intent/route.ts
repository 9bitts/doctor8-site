import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignupRoleToken,
  OAUTH_SIGNUP_ROLE_COOKIE,
  OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS,
} from "@/lib/oauth-signup-intent";

const roleSchema = z.object({
  role: z.enum(["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]),
});

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const token = createSignupRoleToken(parsed.data.role);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_SIGNUP_ROLE_COOKIE, token, cookieOptions(OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_SIGNUP_ROLE_COOKIE, "", cookieOptions(0));
  return res;
}
