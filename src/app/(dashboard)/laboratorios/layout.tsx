import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";

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
  return <>{children}</>;
}
