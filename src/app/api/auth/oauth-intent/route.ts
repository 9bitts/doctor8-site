import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignupRoleToken,
  OAUTH_SIGNUP_ROLE_COOKIE,
  OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS,
} from "@/lib/oauth-signup-intent";
import { parseRegistrationPhone } from "@/lib/international-phone";

const roleSchema = z.object({
  role: z.enum(["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]),
  professionalKind: z.enum(["psychologist"]).optional(),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
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

  const phoneParsed = parseRegistrationPhone({
    phoneDdi: parsed.data.phoneDdi,
    phoneNational: parsed.data.phoneNational,
  });
  if ("error" in phoneParsed) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const token = createSignupRoleToken(
    parsed.data.role,
    parsed.data.professionalKind ?? null,
    phoneParsed.e164,
  );
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_SIGNUP_ROLE_COOKIE, token, cookieOptions(OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_SIGNUP_ROLE_COOKIE, "", cookieOptions(0));
  return res;
}
