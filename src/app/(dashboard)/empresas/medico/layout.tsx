import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { OCCUPATIONAL_PHYSICIAN_LOGIN } from "@/lib/occupational-physician-portal";

export default async function MedicoDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(OCCUPATIONAL_PHYSICIAN_LOGIN);
  if (
    session.user.role !== "OCCUPATIONAL_PHYSICIAN" &&
    session.user.role !== "ADMIN"
  ) {
    redirect(resolveRoleHome(session.user.role));
  }
  return <>{children}</>;
}
