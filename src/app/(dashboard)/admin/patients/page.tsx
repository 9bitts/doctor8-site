// src/app/(dashboard)/admin/patients/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import PatientsAdminClient from "./PatientsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <PatientsAdminClient />;
}
