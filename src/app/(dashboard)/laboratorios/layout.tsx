import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { getLaboratoryMembership, isLaboratoryActive } from "@/lib/laboratory-auth";
import LaboratoryStatusBanner from "@/components/laboratory/LaboratoryStatusBanner";

export default async function LaboratoriosDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/laboratorios/login");
  const role = session.user.role;
  if (role !== "LABORATORY" && role !== "ADMIN") {
    redirect(resolveRoleHome(role));
  }

  let labStatus: string | null = null;
  if (role === "LABORATORY") {
    const membership = await getLaboratoryMembership(session.user.id);
    labStatus = membership?.laboratory.status ?? null;
  }

  return (
    <div className="space-y-6">
      {labStatus && !isLaboratoryActive(labStatus) && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <LaboratoryStatusBanner status={labStatus} />
        </div>
      )}
      {children}
    </div>
  );
}
