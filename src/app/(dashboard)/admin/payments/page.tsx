// src/app/(dashboard)/admin/payments/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import PaymentsAdminClient from "./PaymentsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login/medico");
  return <PaymentsAdminClient />;
}
