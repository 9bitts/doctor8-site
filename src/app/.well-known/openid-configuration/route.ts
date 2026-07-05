import { NextResponse } from "next/server";
import { getOpenIdConfiguration } from "@/lib/sso/sso-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getOpenIdConfiguration(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
