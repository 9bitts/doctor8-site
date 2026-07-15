import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminDistributorsClient from "./AdminDistributorsClient";

export const dynamic = "force-dynamic";

export default async function AdminDistribuidoresPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminDistributorsClient />;
}
