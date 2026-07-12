import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminEightUsersClient from "./AdminEightUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminEightPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminEightUsersClient />;
}
