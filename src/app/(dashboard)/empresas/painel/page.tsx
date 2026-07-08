import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEmployerMembership } from "@/lib/employer-auth";
import { db } from "@/lib/db";
import { resolveRoleHome } from "@/lib/role-home";
import { riskLevelColor, riskLevelLabel } from "@/lib/nr1-risk-matrix";
import { buildEmployerAnalytics } from "@/lib/employer-analytics";
import {
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Users,
  Brain,
  ArrowRight,
  FileDown,
  TrendingUp,
  Activity,
  Stethoscope,
} from "lucide-react";
import EmployerOnboardingCard from "@/components/employer/EmployerOnboardingCard";

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

  const [riskEntries, riskCount, analytics, aepLatest, examStats] = await Promise.all([
    db.employerRiskEntry.findMany({
      where: { employerCompanyId: companyId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.employerRiskEntry.count({ where: { employerCompanyId: companyId } }),
    buildEmployerAnalytics(companyId),
    db.employerAepRecord.findFirst({
      where: { employerCompanyId: companyId },
      orderBy: { version: "desc" },
    }),
    Promise.all([
      db.employerOccupationalExam.count({
        where: { employerCompanyId: companyId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      }),
      db.employerOccupationalExam.count({
        where: {
          employerCompanyId: companyId,
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]),
  ]);

  const [pendingExams, overdueExams] = examStats;

  const quickLinks = [
    { href: "/empresas/nr1", label: "Inventário de riscos", icon: Shield },
    { href: "/empresas/aep", label: "AEP (NR-17)", icon: ClipboardCheck },
    { href: "/empresas/plano-acao", label: "Plano de ação", icon: AlertTriangle },
    { href: "/empresas/pesquisas", label: "Pesquisas anônimas", icon: Users },
    { href: "/empresas/eap", label: "EAP psicológico", icon: Brain },
    { href: "/empresas/exames", label: "Exames / ASO", icon: Stethoscope },
    { href: "/empresas/documentacao", label: "Exportar PGR", icon: FileDown },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <EmployerOnboardingCard />
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
          <p className="text-3xl font-bold text-sky-700 mt-2">{analytics.nr1.complianceScore}%</p>
          <p className="text-xs text-slate-400 mt-1">Onboarding {analytics.nr1.onboardingPercent}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Riscos mapeados</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{riskCount || "—"}</p>
          {analytics.nr1.highRiskCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">{analytics.nr1.highRiskCount} alto/crítico</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Plano de ação</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {analytics.actionPlan.total ? `${analytics.actionPlan.done}/${analytics.actionPlan.total}` : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">{analytics.actionPlan.completionPercent}% concluído</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide">EAP · adoção</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{analytics.eap.adoptionPercent}%</p>
          <p className="text-xs text-slate-400 mt-1">{analytics.eap.activeMembers} colaboradores ativos</p>
        </div>
      </div>

      <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-sky-600" />
          Inteligência RH / SST (últimos 30 dias)
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Utilização EAP</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{analytics.eap.utilizationPercent}%</p>
            <p className="text-xs text-slate-400">{analytics.eap.sessionsUsed}/{analytics.eap.sessionsQuota} sessões</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Sessões agendadas</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{analytics.eap.appointmentsLast30Days}</p>
            <p className="text-xs text-slate-400">{analytics.eap.linkedPsychologists} psicólogos na rede</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Respostas pesquisa</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{analytics.surveys.responsesLast30Days}</p>
            <p className="text-xs text-slate-400">{analytics.surveys.activeCampaign ? "Campanha ativa" : "Sem campanha ativa"}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Bem-estar (pulse + trilhas)</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {analytics.wellness.pulsesLast30Days + analytics.wellness.contentViewsLast30Days}
            </p>
            <p className="text-xs text-slate-400">
              {analytics.wellness.pulsesLast30Days} check-ins · {analytics.wellness.contentViewsLast30Days} trilhas
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-100 bg-violet-50/30 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900 text-sm">Benchmark setorial — {analytics.benchmark.sector.label}</h2>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Conformidade NR-1", yours: analytics.benchmark.company.complianceScore, ref: analytics.benchmark.sector.avgComplianceScore, delta: analytics.benchmark.deltas.compliance, status: analytics.benchmark.status.compliance },
            { label: "Adoção EAP", yours: analytics.benchmark.company.eapAdoptionPercent, ref: analytics.benchmark.sector.avgEapAdoptionPercent, delta: analytics.benchmark.deltas.eapAdoption, status: analytics.benchmark.status.eapAdoption },
            { label: "Plano de ação", yours: analytics.benchmark.company.actionPlanCompletion, ref: analytics.benchmark.sector.avgActionPlanCompletion, delta: analytics.benchmark.deltas.actionPlan, status: analytics.benchmark.status.actionPlan },
          ].map((row) => (
            <div key={row.label} className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{row.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{row.yours}%</p>
              <p className="text-xs text-slate-400">Mercado: {row.ref}%</p>
              <p className={`text-xs mt-1 font-medium ${row.status === "above" ? "text-emerald-600" : row.status === "below" ? "text-amber-600" : "text-slate-500"}`}>
                {row.delta >= 0 ? "+" : ""}{row.delta} pts vs setor
              </p>
            </div>
          ))}
        </div>
      </section>

      {(overdueExams > 0 || pendingExams > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
          <Stethoscope className="shrink-0" size={18} />
          <div>
            <p className="font-medium">
              {pendingExams} exame(s) pendente(s)
              {overdueExams > 0 ? ` · ${overdueExams} vencido(s)` : ""}
            </p>
            <Link href="/empresas/exames" className="inline-flex items-center gap-1 text-amber-900 font-medium mt-2 underline">
              Gerenciar exames / ASO <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

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

      {analytics.nr1.openWhistleblowerReports > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <Activity size={18} />
          {analytics.nr1.openWhistleblowerReports} denúncia(s) aberta(s).{" "}
          <Link href="/empresas/denuncias" className="font-medium underline">
            Ver triagem
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
              Ver todos ({riskCount})
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
    </div>
  );
}
