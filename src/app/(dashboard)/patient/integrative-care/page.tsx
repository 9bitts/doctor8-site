import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import PatientIntegrativeCareClient from "@/components/patient/PatientIntegrativeCareClient";

export const dynamic = "force-dynamic";

export default async function PatientIntegrativeCarePage() {
  const session = await auth();
  if (!session?.user) redirect("/login/paciente");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  return <PatientIntegrativeCareClient />;
}
