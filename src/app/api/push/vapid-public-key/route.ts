import { NextResponse } from "next/server";
import { getVapidPublicKey, isWebPushEnabled } from "@/lib/web-push";

export async function GET() {
  if (!isWebPushEnabled()) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({ enabled: true, publicKey: getVapidPublicKey() });
}
