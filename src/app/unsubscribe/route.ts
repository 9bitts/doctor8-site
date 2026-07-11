// src/app/unsubscribe/route.ts — public unsubscribe link from campaign emails
import { NextRequest, NextResponse } from "next/server";
import {
  processCampaignUnsubscribe,
  unsubscribeConfirmationHtml,
} from "@/lib/admin/email-campaigns";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  try {
    const result = await processCampaignUnsubscribe(token);
    return new NextResponse(result.html, {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("[GET /unsubscribe]", error);
    return new NextResponse(
      unsubscribeConfirmationHtml("Ocorreu um erro. Tente novamente mais tarde."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
