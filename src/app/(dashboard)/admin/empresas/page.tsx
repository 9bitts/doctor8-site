import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminEmployersClient from "./AdminEmployersClient";

export const dynamic = "force-dynamic";

export default async function AdminEmployersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminEmployersClient />;
}
