import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR", "VIEWER"]);
  if ("error" in ctx) return ctx.error;

  const deliveries = await db.employerWebhookDelivery.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { deliveredAt: "desc" },
    take: 50,
    include: {
      endpoint: { select: { label: true, url: true } },
    },
  });

  return NextResponse.json({
    deliveries: deliveries.map((d) => ({
      id: d.id,
      event: d.event,
      success: d.success,
      httpStatus: d.httpStatus,
      errorMessage: d.errorMessage,
      deliveredAt: d.deliveredAt.toISOString(),
      endpointLabel: d.endpoint.label,
      endpointUrl: d.endpoint.url,
    })),
  });
}
