import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminAuditClient from "./AdminAuditClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login/medico");
  return <AdminAuditClient />;
}
