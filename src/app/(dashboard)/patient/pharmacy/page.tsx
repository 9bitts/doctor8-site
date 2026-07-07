import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import PatientPharmacyClient from "@/components/patient/PatientPharmacyClient";

export const dynamic = "force-dynamic";

export default async function PatientPharmacyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  return <PatientPharmacyClient />;
}
