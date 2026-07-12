import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listB2BOrganizations } from "@/lib/sso/sso-orgs";
import { formatCnpj } from "@/lib/cnpj";

export const dynamic = "force-dynamic";

export default async function SsoSelectOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const { resume } = await searchParams;
  if (!resume || !resume.startsWith("/api/oauth/authorize?")) {
    redirect("/login");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(resume)}`);
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = dbUser?.role ?? session.user.role;
  if (!role) {
    redirect("/login");
  }

  const organizations = await listB2BOrganizations(session.user.id, role);
  if (organizations.length <= 1) {
    redirect(resume);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Escolha a organização</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sua conta Doctor8 está vinculada a mais de uma organização. Selecione qual deseja
          usar para continuar o login.
        </p>
        <ul className="mt-6 space-y-3">
          {organizations.map((org) => {
            const resumeUrl = new URL(resume, "http://doctor8.local");
            resumeUrl.searchParams.set("organization_id", org.id);
            const href = `${resumeUrl.pathname}?${resumeUrl.searchParams.toString()}`;

            return (
              <li key={org.id}>
                <Link
                  href={href}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span className="block font-medium text-zinc-900">{org.name}</span>
                  <span className="block text-sm text-zinc-500">
                    CNPJ {formatCnpj(org.cnpj)} · {org.memberRole}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
