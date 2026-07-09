import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLaboratoryMembership } from "@/lib/laboratory-auth";
import { resolveRoleHome } from "@/lib/role-home";
import { db } from "@/lib/db";
import { LABORATORY_TYPE_LABELS } from "@/lib/laboratory-portal";
import { FlaskConical, MapPin, Upload, ArrowRight } from "lucide-react";

const LAB_STATUS_LABEL: Record<string, { label: string; hint: string }> = {
  PENDING_REVIEW: {
    label: "Em revisão",
    hint: "Aguardando aprovação da equipe Doctor8",
  },
  ACTIVE: {
    label: "Ativo na rede",
    hint: "Visível para pacientes na sua região",
  },
  SUSPENDED: {
    label: "Suspenso",
    hint: "Entre em contato com o suporte Doctor8",
  },
};

export default async function LaboratoriosPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/laboratorios/login");
  if (session.user.role !== "LABORATORY" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  const membership = await getLaboratoryMembership(session.user.id);
  if (!membership) redirect("/laboratorios/login");

  const lab = membership.laboratory;
  const hasAddress = Boolean(lab.addressCity && lab.addressZip);
  const examCount = await db.laboratoryExamItem.count({
    where: { laboratoryId: lab.id, available: true },
  });

  const statusInfo = LAB_STATUS_LABEL[lab.status] ?? {
    label: lab.status,
    hint: "",
  };

  const steps = [
    {
      done: hasAddress,
      title: "Informar endereço",
      href: "/laboratorios/configuracoes",
      icon: MapPin,
    },
    {
      done: examCount > 0,
      title: "Publicar tabela de exames",
      href: "/laboratorios/exames",
      icon: Upload,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-violet-600 font-medium">Doctor8 Laboratórios</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{lab.nomeFantasia}</h1>
        <p className="text-slate-500 text-sm mt-1">
          CNPJ {lab.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
          {lab.addressCity ? ` · ${lab.addressCity}/${lab.addressState}` : ""}
          {" · "}
          {LABORATORY_TYPE_LABELS[lab.labType] ?? lab.labType}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <FlaskConical className="text-violet-600 mb-2" size={22} />
          <p className="text-2xl font-bold text-slate-900">{examCount}</p>
          <p className="text-sm text-slate-500">exames publicados</p>
        </div>
        <div className={`rounded-2xl p-5 text-white sm:col-span-2 ${
          lab.status === "ACTIVE"
            ? "bg-violet-600"
            : lab.status === "SUSPENDED"
              ? "bg-red-600"
              : "bg-amber-500"
        }`}>
          <p className="text-sm font-medium opacity-90">Status</p>
          <p className="text-lg font-bold mt-1">{statusInfo.label}</p>
          <p className="text-xs opacity-90 mt-1">{statusInfo.hint}</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-4">Próximos passos</h2>
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.href}
                href={step.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  step.done ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                }`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.done ? "Concluído" : "Pendente"}</p>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-violet-600" />
              </Link>
            );
          })}
        </div>
      </section>

      {lab.status === "PENDING_REVIEW" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Seu laboratório está em revisão. Após aprovação em <strong>/admin/laboratorios</strong>, pacientes poderão encontrá-lo na rede Doctor8.
        </div>
      )}

      {lab.status === "ACTIVE" && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          A busca de exames por pacientes na rede Doctor8 será ativada quando houver densidade de laboratórios na região.
          Cadastre sua tabela agora para aparecer primeiro.
        </div>
      )}
    </div>
  );
}
