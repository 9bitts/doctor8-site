import { NextResponse } from "next/server";
import { getSsoJwks } from "@/lib/sso/sso-jwt";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSsoJwks(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
