// Pending chart-link notifications for patient consent / acknowledgment.

import { db } from "@/lib/db";

export type ChartLinkNotice = {
  id: string;
  doctorName: string;
  body: string;
  createdAt: string;
};

function noticeDoctorName(data: unknown): string {
  if (data && typeof data === "object" && "doctorName" in data) {
    const name = (data as { doctorName?: unknown }).doctorName;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "";
}

function isChartLinkNotice(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.kind === "chart_linked") return true;
  if (d.rejected === true) return false;
  return d.url === "/patient/providers";
}

export async function getPendingChartLinkNotices(
  userId: string,
): Promise<ChartLinkNotice[]> {
  const rows = await db.notification.findMany({
    where: {
      userId,
      readAt: null,
      type: "system",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rows
    .filter((n) => isChartLinkNotice(n.data))
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      doctorName: noticeDoctorName(n.data),
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    }));
}
