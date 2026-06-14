// src/app/(dashboard)/admin/doctors/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import DoctorsAdminClient from "./DoctorsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <DoctorsAdminClient />;
}
