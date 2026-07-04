import { NextRequest, NextResponse } from "next/server";
import { resolveRegistrationRegion } from "@/lib/detect-registration-region";

export const runtime = "nodejs";

/** Returns the best-guess registration region from the request IP / geo headers. */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const region = resolveRegistrationRegion({
    phoneDdi: sp.get("phoneDdi"),
    language: sp.get("lang"),
    headers: req.headers,
  });

  return NextResponse.json({ region });
}
