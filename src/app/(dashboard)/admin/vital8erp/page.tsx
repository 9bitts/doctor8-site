import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminVital8UsersClient from "./AdminVital8UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminVital8ErpPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminVital8UsersClient />;
}
