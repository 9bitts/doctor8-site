import { NextResponse } from "next/server";
import { isSmsConfigured } from "@/lib/sms";

export async function GET() {
  return NextResponse.json({ smsEnabled: isSmsConfigured() });
}
