import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminUsersClient />;
}
