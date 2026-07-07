import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEmployerMembership } from "@/lib/employer-auth";
import { db } from "@/lib/db";
import { resolveRoleHome } from "@/lib/role-home";
import { riskLevelColor, riskLevelLabel } from "@/lib/nr1-risk-matrix";
import {
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Users,
  Brain,
  ArrowRight,
  FileDown,
} from "lucide-react";

export default async function EmpresasPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/empresas/login");
  if (session.user.role !== "EMPLOYER" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  const membership = await getEmployerMembership(session.user.id);
  if (!membership) redirect("/empresas/login");

  const companyId = membership.employerCompanyId;
  const company = membership.employerCompany;

  const [
    riskEntries,
    aepLatest,
    actionItems,
    workforceCount,
    surveyActive,
    eap,
    openReports,
  ] = await Promise.all([
    db.employerRiskEntry.findMany({
      where: { employerCompanyId: companyId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.employerAepRecord.findFirst({
      where: { employerCompanyId: companyId },
      orderBy: { version: "desc" },
    }),
    db.employerActionPlanItem.findMany({
      where: { plan: { employerCompanyId: companyId } },
      select: { status: true },
    }),
    db.employerWorkforceMember.count({ where: { employerCompanyId: companyId, status: "ACTIVE" } }),
    db.employerSurveyCampaign.findFirst({
      where: { employerCompanyId: companyId, status: "ACTIVE" },
    }),
    db.employerEapBenefit.findUnique({ where: { employerCompanyId: companyId } }),
    db.employerWhistleblowerReport.count({
      where: { employerCompanyId: companyId, status: { in: ["OPEN", "IN_REVIEW"] } },
    }),
  ]);

  const doneActions = actionItems.filter((i) => i.status === "DONE" || i.status === "VERIFIED").length;
  const score = company.nr1ComplianceScore ?? 0;

  const quickLinks = [
    { href: "/empresas/nr1", label: "Inventário de riscos", icon: Shield },
    { href: "/empresas/aep", label: "AEP (NR-17)", icon: ClipboardCheck },
    { href: "/empresas/plano-acao", label: "Plano de ação", icon: AlertTriangle },
    { href: "/empresas/pesquisas", label: "Pesquisas anônimas", icon: Users },
    { href: "/empresas/eap", label: "EAP psicológico", icon: Brain },
    { href: "/empresas/documentacao", label: "Exportar PGR", icon: FileDown },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-sky-600 font-medium">Doctor8 Empresas · NR-1</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{company.nomeFantasia}</h1>
        <p className="text-slate-500 text-sm mt-1">
          CNPJ {company.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
          {company.employeeCount ? ` · ${company.employeeCount} colaboradores` : ""}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Conformidade NR-1</p>
          <p className="text-3xl font-bold text-sky-700 mt-2">{score}%</p>
          <p className="text-xs text-slate-400 mt-1">Índice de completude do PGR</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Riscos mapeados</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{riskEntries.length > 0 ? riskEntries.length : "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Plano de ação</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {actionItems.length ? `${doneActions}/${actionItems.length}` : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">medidas concluídas</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Colaboradores EAP</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{workforceCount}</p>
          {eap?.enabled && (
            <p className="text-xs text-slate-400 mt-1">{eap.sessionsPerEmployee} sessões/ano</p>
          )}
        </div>
      </div>

      {(aepLatest?.status !== "COMPLETED" && aepLatest?.status !== "APPROVED") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
          <AlertTriangle className="shrink-0" size={18} />
          <div>
            <p className="font-medium">AEP pendente ou incompleta</p>
            <p className="mt-1 text-amber-800">
              Complete a Avaliação Ergonômica Preliminar com riscos psicossociais para conformidade NR-17 + NR-1.
            </p>
            <Link href="/empresas/aep" className="inline-flex items-center gap-1 text-amber-900 font-medium mt-2 underline">
              Ir para AEP <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {openReports > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {openReports} denúncia(s) aberta(s) no canal de assédio.{" "}
          <Link href="/empresas/configuracoes" className="font-medium underline">
            Ver protocolos
          </Link>
        </div>
      )}

      <section>
        <h2 className="font-semibold text-slate-900 mb-3">Acesso rápido</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-300 hover:bg-sky-50/50 transition"
            >
              <link.icon size={20} className="text-sky-600" />
              <span className="font-medium text-slate-800 text-sm">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {riskEntries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Últimos riscos no inventário</h2>
            <Link href="/empresas/nr1" className="text-sm text-sky-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Fator de risco</th>
                  <th className="px-4 py-2 font-medium">Nível</th>
                </tr>
              </thead>
              <tbody>
                {riskEntries.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{r.hazardLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskLevelColor(r.riskLevel)}`}>
                        {riskLevelLabel(r.riskLevel)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {surveyActive && (
        <p className="text-sm text-slate-600">
          Pesquisa ativa: <strong>{surveyActive.title}</strong> —{" "}
          <Link href="/empresas/pesquisas" className="text-sky-600 underline">
            copiar link anônimo
          </Link>
        </p>
      )}
    </div>
  );
}
