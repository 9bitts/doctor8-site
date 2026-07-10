import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminOccupationalPhysiciansClient from "./AdminOccupationalPhysiciansClient";

export const dynamic = "force-dynamic";

export default async function AdminOccupationalPhysiciansPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminOccupationalPhysiciansClient />;
}
