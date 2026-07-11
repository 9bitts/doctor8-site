// src/app/(dashboard)/admin/campaigns/new/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import CampaignCreateClient from "./CampaignCreateClient";

export const dynamic = "force-dynamic";

export default async function AdminCampaignNewPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <CampaignCreateClient />;
}
