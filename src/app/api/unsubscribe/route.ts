// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processCampaignUnsubscribe } from "@/lib/admin/email-campaigns";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  try {
    const result = await processCampaignUnsubscribe(token);
    return new NextResponse(result.html, {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("[GET /api/unsubscribe]", error);
    const { unsubscribeConfirmationHtml } = await import("@/lib/admin/email-campaigns");
    return new NextResponse(
      unsubscribeConfirmationHtml("Ocorreu um erro. Tente novamente mais tarde."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
