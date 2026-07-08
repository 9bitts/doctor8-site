import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { PSYCHOED_TRAILS } from "@/lib/employer-psychoed-content";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR", "VIEWER"]);
  if ("error" in ctx) return ctx.error;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [views, topContent] = await Promise.all([
    db.employerContentProgress.count({
      where: { employerCompanyId: ctx.employerCompanyId, completedAt: { gte: thirtyDaysAgo } },
    }),
    db.employerContentProgress.groupBy({
      by: ["contentId"],
      where: { employerCompanyId: ctx.employerCompanyId, completedAt: { gte: thirtyDaysAgo } },
      _count: { contentId: true },
      orderBy: { _count: { contentId: "desc" } },
      take: 5,
    }),
  ]);

  const topTrails = topContent.map((row) => {
    const content = PSYCHOED_TRAILS.find((c) => c.id === row.contentId);
    return {
      contentId: row.contentId,
      title: content?.title ?? row.contentId,
      views: row._count.contentId,
    };
  });

  return NextResponse.json({
    totalViewsLast30Days: views,
    catalogSize: PSYCHOED_TRAILS.length,
    topTrails,
    trails: PSYCHOED_TRAILS,
  });
}
