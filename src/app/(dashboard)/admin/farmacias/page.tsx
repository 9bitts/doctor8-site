import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminPharmacyStoresClient from "./AdminPharmacyStoresClient";

export const dynamic = "force-dynamic";

export default async function AdminFarmaciasPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminPharmacyStoresClient />;
}
