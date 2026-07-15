import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { getDistributorMembership, isDistributorActive } from "@/lib/distributor-auth";

export default async function DistribuidoresDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/distribuidores/login");
  const role = session.user.role;

  if (role !== "DISTRIBUTOR" && role !== "ADMIN") {
    redirect(resolveRoleHome(role));
  }

  let status: string | null = null;
  if (role === "DISTRIBUTOR") {
    const membership = await getDistributorMembership(session.user.id);
    status = membership?.distributor.status ?? null;
  }

  return (
    <div className="space-y-6">
      {status && !isDistributorActive(status) && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Your distributor account is <strong>{status}</strong>. Doctor8 ops will activate it after review.
            You can update company details, but you will not receive live orders until <strong>ACTIVE</strong>.
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
