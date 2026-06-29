import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminHomeClient from "./AdminHomeClient";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await getAdminSession();
  if (!session) redirect("/login/medico");
  return <AdminHomeClient />;
}
