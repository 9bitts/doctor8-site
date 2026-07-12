import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/sso/sso-jwt";
import { getSsoUserClaims } from "@/lib/sso/sso-userinfo";

/** OIDC userinfo endpoint. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const parsed = verifyAccessToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const claims = await getSsoUserClaims(parsed.sub, parsed.organizationId);
  if (!claims) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  return NextResponse.json(claims);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
