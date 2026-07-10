import { NextResponse } from "next/server";
import {
  isAwsSnsConfigured,
  isAwsSnsProductionReady,
  isSmsUserFacingEnabled,
} from "@/lib/sms";

export async function GET() {
  return NextResponse.json({
    smsEnabled: isSmsUserFacingEnabled(),
    smsPendingAwsApproval: isAwsSnsConfigured() && !isAwsSnsProductionReady(),
  });
}
