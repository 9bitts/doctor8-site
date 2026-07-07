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
  if (session.user.role !== "EMPLOYER" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }
  return <>{children}</>;
}
