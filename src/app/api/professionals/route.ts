// Returns verified health professionals + psychoanalysts for patient booking.

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listUnifiedProviders } from "@/lib/providers";
import { getOnlineJitSessionByProfessionalId } from "@/lib/jit-online-index";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty") || undefined;
  const type = searchParams.get("type") || undefined;

  const [providers, onlineByProId] = await Promise.all([
    unstable_cache(
      async () =>
        listUnifiedProviders({
          specialty: specialty && specialty !== "All" ? specialty : null,
          consultType: type || null,
          verifiedOnly: true,
          take: 80,
        }),
      [`professionals-list-${specialty || "all"}-${type || "all"}`],
      { revalidate: 60 },
    )(),
    getOnlineJitSessionByProfessionalId(),
  ]);

  const enriched = await Promise.all(
    providers.map(async (pro) => {
      const appointmentCount =
        pro.providerType === "health"
          ? await db.appointment.count({
              where: {
                professionalId: pro.id,
                status: { in: ["CONFIRMED", "PENDING"] },
                scheduledAt: { gte: new Date() },
              },
            })
          : await db.appointment.count({
              where: {
                psychoanalystId: pro.id,
                status: { in: ["CONFIRMED", "PENDING"] },
                scheduledAt: { gte: new Date() },
              },
            });

      const jitSessionId =
        pro.providerType === "health" ? onlineByProId.get(pro.id) ?? null : null;

      return {
        ...pro,
        upcomingAppointments: appointmentCount,
        rating: 4.8,
        reviewCount: 0,
        isOnline: !!jitSessionId,
        jitSessionId,
      };
    })
  );

  return NextResponse.json({ professionals: enriched });
}
