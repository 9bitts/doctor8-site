import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";

export default async function EmpresasDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/empresas/login");
  const role = session.user.role;
  if (
    role !== "EMPLOYER" &&
    role !== "OCCUPATIONAL_PHYSICIAN" &&
    role !== "ADMIN"
  ) {
    redirect(resolveRoleHome(role));
  }
  return <>{children}</>;
}
