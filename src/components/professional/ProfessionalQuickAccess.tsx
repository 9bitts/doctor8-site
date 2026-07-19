import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Flower2,
  GraduationCap,
  Heart,
  Inbox,
  Layers,
  LayoutDashboard,
  Leaf,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Microscope,
  Package,
  PieChart,
  Pill,
  Plug,
  QrCode,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import {
  PROFESSIONAL_NAV_GROUPS,
  PROVIDER_HUMANITARIAN_VOLUNTEER_ENTRY,
  type NavIconKey,
  type PlatformNavEntry,
  type PlatformNavGroup,
} from "@/lib/platform-nav-registry";

const QUICK_ICON_SIZE = 14;

const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Pill,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  FlaskConical,
  Flower2,
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
  UserCog,
  Brain,
  Inbox,
  Layers,
  TrendingUp,
  BarChart3,
  Shield,
  Briefcase,
  FileSpreadsheet,
  Receipt,
  Package,
  Megaphone,
  Building2,
  CreditCard,
  Plug,
  ScrollText,
  PieChart,
  Video,
  GraduationCap,
  QrCode,
  MessageCircle,
  Microscope,
};

const EXCLUDED_HREFS = new Set(["/professional", "/professional/jit"]);

type Props = {
  t: (key: string) => string;
  sharedPending?: number;
  unreadMessages?: number;
};

function badgeFor(href: string, sharedPending?: number, unreadMessages?: number): number | undefined {
  if (href === "/professional/shared" && sharedPending && sharedPending > 0) return sharedPending;
  if (href === "/professional/messages" && unreadMessages && unreadMessages > 0) return unreadMessages;
  return undefined;
}

function isExternal(entry: PlatformNavEntry): boolean {
  return entry.external === true || /^https?:\/\//i.test(entry.href);
}

function buildQuickGroups(): PlatformNavGroup[] {
  const groups = PROFESSIONAL_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !EXCLUDED_HREFS.has(item.href)),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return [{
      labelKey: PROVIDER_HUMANITARIAN_VOLUNTEER_ENTRY.labelKey,
      items: [PROVIDER_HUMANITARIAN_VOLUNTEER_ENTRY],
    }];
  }

  // Pinned in sidebar above groups — surface first in the first quick-access group.
  groups[0] = {
    ...groups[0],
    items: [PROVIDER_HUMANITARIAN_VOLUNTEER_ENTRY, ...groups[0].items],
  };
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
  const className = `relative flex flex-col items-center justify-center gap-1 px-1.5 py-2 sm:py-2.5 rounded-lg text-center transition font-medium text-[10px] sm:text-[11px] leading-tight border min-h-[3.25rem] sm:min-h-[3.5rem] ${accent}`;

  const content = (
    <>
      {badge ? (
        <span className="absolute top-0.5 right-0.5 min-w-[0.9rem] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      <Icon size={QUICK_ICON_SIZE} strokeWidth={1.75} className="shrink-0" />
      <span className="line-clamp-2 px-0.5">{label}</span>
    </>
  );

  if (isExternal(entry)) {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={entry.href} className={className}>
      {content}
    </Link>
  );
}

function tileAccent(entry: PlatformNavEntry): string {
  if (entry.href === PROVIDER_HUMANITARIAN_VOLUNTEER_ENTRY.href) {
    return "bg-red-50 hover:bg-red-100 text-red-700 border-red-200";
  }
  if (entry.href === "/professional/shared") {
    return "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200";
  }
  if (entry.href === "/professional/settings") {
    return "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200";
  }
  if (entry.href === "/professional/prescriptions") {
    return "bg-accent-50 hover:bg-accent-100 text-accent-600 border-accent-100";
  }
  if (entry.href.includes("/medicina-natural")) {
    return "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-50 hover:bg-brand-50 text-slate-700 border-slate-200 hover:border-brand-200 hover:text-brand-700";
}

export default function ProfessionalQuickAccess({ t, sharedPending, unreadMessages }: Props) {
  const groups = buildQuickGroups();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 text-slate-700 font-semibold text-sm">
        <Activity size={16} />
        {t("prodash.quick.title")}
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
                  badge={badgeFor(item.href, sharedPending, unreadMessages)}
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
