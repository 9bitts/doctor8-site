import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminRateioClient from "./AdminRateioClient";

export const dynamic = "force-dynamic";

export default async function AdminRateioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminRateioClient />;
}
