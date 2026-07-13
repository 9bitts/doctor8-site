import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import PatientsHumanitarianAdminClient from "./PatientsHumanitarianAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminHumanitarianPatientsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <PatientsHumanitarianAdminClient />;
}

