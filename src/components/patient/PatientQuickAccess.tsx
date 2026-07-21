import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  Heart,
  LayoutDashboard,
  Leaf,
  MapPin,
  MessageSquare,
  Package,
  Pill,
  Radio,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  PATIENT_NAV_GROUPS,
  PATIENT_HUMANITARIAN_ENTRY,
  PATIENT_SCHEDULED_VOLUNTEER_ENTRY,
  type NavIconKey,
  type PlatformNavEntry,
  type PlatformNavGroup,
} from "@/lib/platform-nav-registry";

const QUICK_ICON_SIZE = 14;

const NAV_ICONS: Partial<Record<NavIconKey, LucideIcon>> = {
  LayoutDashboard,
  FileText,
  Pill,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  FlaskConical,
  Calendar,
  Users,
  Leaf,
  ClipboardList,
  BookOpen,
  MessageSquare,
  Radio,
  Heart,
  MapPin,
  Settings,
  ScrollText,
  BarChart3,
  Package,
};

const EXCLUDED_HREFS = new Set(["/patient"]);

type Badges = {
  messages?: number;
  prescriptions?: number;
  exams?: number;
  documents?: number;
  resources?: number;
  terms?: number;
};

type Props = {
  t: (key: string) => string;
  badges?: Badges;
  showVolunteer?: boolean;
  showHumanitarian?: boolean;
};

function badgeFor(href: string, badges?: Badges): number | undefined {
  if (!badges) return undefined;
  if (href === "/patient/messages" && badges.messages) return badges.messages;
  if (href === "/patient/prescriptions" && badges.prescriptions) return badges.prescriptions;
  if (href === "/patient/exam-requests" && badges.exams) return badges.exams;
  if (href === "/patient/documents" && badges.documents) return badges.documents;
  if (href === "/patient/resources" && badges.resources) return badges.resources;
  if (href === "/patient/assinar-termos" && badges.terms) return badges.terms;
  return undefined;
}

function buildQuickGroups(showVolunteer: boolean, showHumanitarian: boolean): PlatformNavGroup[] {
  const groups = PATIENT_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !EXCLUDED_HREFS.has(item.href)),
  })).filter((group) => group.items.length > 0);

  const extras: PlatformNavEntry[] = [];
  if (showVolunteer) extras.push(PATIENT_SCHEDULED_VOLUNTEER_ENTRY);
  if (showHumanitarian) extras.push(PATIENT_HUMANITARIAN_ENTRY);

  if (extras.length > 0 && groups.length > 0) {
    groups[0] = {
      ...groups[0],
      items: [...extras, ...groups[0].items],
    };
  }

  return groups;
}

function QuickTile({
  entry,
  label,
  badge,
  accent,
}: {
  entry: PlatformNavEntry;
  label: string;
  badge?: number;
  accent: string;
}) {
  const Icon = NAV_ICONS[entry.iconKey] ?? LayoutDashboard;
  const className = `relative flex flex-col items-center justify-center gap-1 px-1.5 py-2 sm:py-2.5 rounded-lg text-center transition font-medium text-[10px] sm:text-[11px] leading-tight border min-h-[3.25rem] sm:min-h-[3.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${accent}`;

  return (
    <Link href={entry.href} className={className}>
      {badge ? (
        <span className="absolute top-0.5 right-0.5 min-w-[0.9rem] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      <Icon size={QUICK_ICON_SIZE} strokeWidth={1.75} className="shrink-0" aria-hidden />
      <span className="line-clamp-2 px-0.5">{label}</span>
    </Link>
  );
}

function tileAccent(entry: PlatformNavEntry): string {
  if (entry.href === "/urgent") {
    return "bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200";
  }
  if (entry.href === PATIENT_SCHEDULED_VOLUNTEER_ENTRY.href || entry.href === PATIENT_HUMANITARIAN_ENTRY.href) {
    return "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200";
  }
  if (entry.href === "/patient/messages") {
    return "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200";
  }
  if (entry.href === "/patient/documents" || entry.href === "/patient/assinar-termos") {
    return "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200";
  }
  if (entry.href === "/patient/prescriptions" || entry.href === "/patient/pharmacy") {
    return "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-50 hover:bg-brand-50 text-slate-700 border-slate-200 hover:border-brand-200 hover:text-brand-700";
}

export default function PatientQuickAccess({
  t,
  badges,
  showVolunteer = true,
  showHumanitarian = true,
}: Props) {
  const groups = buildQuickGroups(showVolunteer, showHumanitarian);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 text-slate-700 font-semibold text-sm">
        <Activity size={16} aria-hidden />
        {t("pdash.quick.title")}
      </div>
      <div className="p-3 sm:p-4 space-y-4">
        {groups.map((group) => (
          <div key={group.labelKey}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              {t(group.labelKey)}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {group.items.map((item) => (
                <QuickTile
                  key={`${item.href}-${item.labelKey}`}
                  entry={item}
                  label={t(item.labelKey)}
                  badge={badgeFor(item.href, badges)}
                  accent={tileAccent(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
