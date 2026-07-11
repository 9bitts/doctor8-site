// src/app/(dashboard)/admin/campaigns/[id]/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import CampaignDetailClient from "./CampaignDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  const exists = await db.emailCampaign.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!exists) notFound();

  return <CampaignDetailClient campaignId={params.id} />;
}
