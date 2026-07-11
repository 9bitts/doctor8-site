// src/app/(dashboard)/admin/campaigns/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import CampaignsAdminClient from "./CampaignsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <CampaignsAdminClient />;
}
