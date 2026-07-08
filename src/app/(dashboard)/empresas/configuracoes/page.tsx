import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployerMembership } from "@/lib/employer-auth";
import { resolveRoleHome } from "@/lib/role-home";
import Link from "next/link";
import { CopyLinkButton } from "@/components/employer/CopyLinkButton";
import { EmployerBillingSection, EmployerWebhooksSection } from "@/components/employer/EmployerSettingsSections";
import EmployerCompanyForm from "@/components/employer/EmployerCompanyForm";
import { EmployerEapUsageSection } from "@/components/employer/EmployerEapUsageSection";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/empresas/login");
  if (session.user.role !== "EMPLOYER" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  const membership = await getEmployerMembership(session.user.id);
  if (!membership) redirect("/empresas/login");

  const company = membership.employerCompany;
  const denunciaPath = `/empresas/denuncia/${company.slug}`;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>

      <EmployerCompanyForm />

      <EmployerBillingSection />
      <EmployerEapUsageSection />
      <EmployerWebhooksSection />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold text-slate-800">Canal de denúncia (assédio)</h2>
        <p className="text-sm text-slate-500">
          Link anônimo para colaboradores reportarem assédio e condições adversas — frequentemente exigido no plano de ação NR-1.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-slate-100 px-2 py-1 rounded">{denunciaPath}</code>
          <CopyLinkButton path={denunciaPath} />
        </div>
        <Link href={denunciaPath} className="text-sm text-sky-600 hover:underline" target="_blank">
          Abrir canal público
        </Link>
      </section>
    </div>
  );
}
