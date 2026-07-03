import { NextResponse } from "next/server";
import { clearHumanitarianOriginCookies } from "@/lib/humanitarian/origin-cookie";

/** Clears short-lived humanitarian origin cookies (httpOnly origin + return path). */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearHumanitarianOriginCookies(response);
  return response;
}
