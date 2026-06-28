import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrganizationMembership, getOrganizationProfessionalIds } from "@/lib/organization-auth";
import Link from "next/link";
import {
  Building2, Users, Calendar, TrendingUp, ChevronRight, Stethoscope,
} from "lucide-react";

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

export default async function OrganizationDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZATION") redirect("/unauthorized");

  const membership = await getOrganizationMembership(session.user.id);
  if (!membership) redirect("/login");

  const org = membership.organization;
  const professionalIds = await getOrganizationProfessionalIds(org.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [todayAppointments, monthRevenue, patientCount, staffCount] = await Promise.all([
    professionalIds.length > 0
      ? db.appointment.count({
          where: {
            professionalId: { in: professionalIds },
            scheduledAt: { gte: todayStart, lte: todayEnd },
            status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
          },
        })
      : Promise.resolve(0),
    professionalIds.length > 0
      ? db.appointment.aggregate({
          where: {
            professionalId: { in: professionalIds },
            status: "COMPLETED",
            paidAt: { not: null },
            scheduledAt: { gte: monthStart },
          },
          _sum: { priceAmount: true },
        })
      : Promise.resolve({ _sum: { priceAmount: 0 } }),
    professionalIds.length > 0
      ? db.patientRecord.count({ where: { professionalId: { in: professionalIds } } })
      : Promise.resolve(0),
    db.organizationMember.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
  ]);

  const upcoming = professionalIds.length > 0
    ? await db.appointment.findMany({
        where: {
          professionalId: { in: professionalIds },
          scheduledAt: { gte: new Date() },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          professional: { select: { firstName: true, lastName: true, specialty: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      })
    : [];

  const cards = [
    {
      label: "Consultas hoje",
      value: String(todayAppointments),
      icon: Calendar,
      href: "/organization/appointments",
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Profissionais",
      value: String(professionalIds.length),
      icon: Stethoscope,
      href: "/organization/team",
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Pacientes",
      value: String(patientCount),
      icon: Users,
      href: "/organization/patients",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Receita do m\u00eas",
      value: fmt(monthRevenue._sum.priceAmount || 0, org.currency),
      icon: TrendingUp,
      href: "/organization/financeiro",
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="text-indigo-600" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{org.nomeFantasia}</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13">
            CNPJ {org.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
            \u00b7 {staffCount} colaborador{staffCount !== 1 ? "es" : ""}
          </p>
        </div>
        <Link
          href="/organization/settings"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Configura\u00e7\u00f5es
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition group"
          >
            <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
              {card.label}
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition" />
            </p>
          </Link>
        ))}
      </div>

      {professionalIds.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
          <h2 className="font-semibold text-indigo-900 mb-2">Vincule seus profissionais</h2>
          <p className="text-indigo-700 text-sm mb-4">
            Compartilhe o c\u00f3digo de convite com os m\u00e9dicos da cl\u00ednica para que eles se vinculem \u00e0 organiza\u00e7\u00e3o.
          </p>
          <Link
            href="/organization/team"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-500 transition"
          >
            Ver c\u00f3digo de convite
            <ChevronRight size={16} />
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Pr\u00f3ximas consultas</h2>
          <Link href="/organization/appointments" className="text-sm text-indigo-600 hover:text-indigo-700">
            Ver agenda
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhuma consulta agendada.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "?"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Dr. {a.professional?.firstName} {a.professional?.lastName}
                    {a.professional?.specialty ? ` \u00b7 ${a.professional.specialty}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-700">
                    {a.scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
