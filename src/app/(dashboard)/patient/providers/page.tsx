import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserLang } from "@/lib/i18n/server-lang";
import { translate, localeOf, type Lang } from "@/lib/i18n/translations";
import { resolveRoleHome } from "@/lib/role-home";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";
import Link from "next/link";
import { Users, Stethoscope, Brain, Leaf, Calendar, MessageSquare } from "lucide-react";

export default async function PatientProvidersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const patient = await db.patientProfile.findUnique({ where: { userId } });
  if (!patient) redirect("/onboarding");

  const [medical, psycho, integrative] = await Promise.all([
    db.patientRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        professional: {
          select: { id: true, firstName: true, lastName: true, specialty: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.analysandRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.integrativeClientRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        integrativeTherapist: {
          select: { id: true, firstName: true, lastName: true, picsPractices: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  type Row = {
    key: string;
    name: string;
    specialty: string | null;
    typeLabel: string;
    typeIcon: ReactNode;
    lastUpdated: Date;
    professionalUserId?: string;
  };

  const rows: Row[] = [];

  for (const r of medical) {
    if (!r.professional) continue;
    const pro = r.professional;
    rows.push({
      key: `med-${r.id}`,
      name: `Dr. ${pro.firstName} ${pro.lastName}`.trim(),
      specialty: pro.specialty || null,
      typeLabel: t("providers.typeMedical"),
      typeIcon: <Stethoscope size={16} className="text-brand-500" />,
      lastUpdated: r.updatedAt,
    });
  }

  for (const r of psycho) {
    if (!r.psychoanalyst) continue;
    const p = r.psychoanalyst;
    rows.push({
      key: `psy-${r.id}`,
      name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim(),
      specialty: null,
      typeLabel: t("providers.typePsychoanalyst"),
      typeIcon: <Brain size={16} className="text-violet-500" />,
      lastUpdated: r.updatedAt,
    });
  }

  for (const r of integrative) {
    if (!r.integrativeTherapist) continue;
    const p = r.integrativeTherapist;
    rows.push({
      key: `int-${r.id}`,
      name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim(),
      specialty: r.mainPractice || p.picsPractices[0] || null,
      typeLabel: t("providers.typeIntegrative"),
      typeIcon: <Leaf size={16} className="text-emerald-500" />,
      lastUpdated: r.updatedAt,
    });
  }

  rows.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Users size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("providers.title")}</h1>
          <p className="text-sm text-slate-500">{t("providers.subtitle")}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
          <p className="text-slate-600 font-medium">{t("providers.empty")}</p>
          <p className="text-sm text-slate-500 mt-2">{t("providers.emptyHint")}</p>
          <Link
            href="/patient/find"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {t("nav.find")} ?
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.key}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-brand-100 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {row.typeIcon}
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {row.typeLabel}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1 truncate">{row.name}</p>
                  {row.specialty && (
                    <p className="text-sm text-slate-500">{row.specialty}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {t("providers.lastUpdated")}{" "}
                    {row.lastUpdated.toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href="/patient/appointments"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <Calendar size={13} /> {t("nav.appointments")}
                  </Link>
                  <Link
                    href="/patient/messages"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <MessageSquare size={13} /> {t("nav.messages")}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
