import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminLaboratoriesClient from "./AdminLaboratoriesClient";

export const dynamic = "force-dynamic";

export default async function AdminLaboratoriosPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminLaboratoriesClient />;
}
