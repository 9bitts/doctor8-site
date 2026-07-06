import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import PatientNursingClient from "@/components/patient/PatientNursingClient";

export const dynamic = "force-dynamic";

export default async function PatientNursingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  return <PatientNursingClient />;
}
