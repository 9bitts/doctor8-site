import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";

export default async function FarmaciasDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login");
  const role = session.user.role;
  if (
    role !== "PHARMACY_STORE" &&
    role !== "PROFESSIONAL" &&
    role !== "ADMIN"
  ) {
    redirect(resolveRoleHome(role));
  }
  return <>{children}</>;
}
