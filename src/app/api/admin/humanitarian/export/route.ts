import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildHumanitarianCsv } from "@/lib/humanitarian/export-csv";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const slug = params.get("slug") || VENEZUELA_CAMPAIGN_SLUG;
  const dateParam = params.get("date");
  const day = dateParam ? new Date(dateParam) : new Date();

  const csv = await buildHumanitarianCsv(slug, day);
  if (!csv) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const dateStr = day.toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="humanitarian-${slug}-${dateStr}.csv"`,
    },
  });
}
