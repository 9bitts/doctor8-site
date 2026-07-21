import Link from "next/link";
import { Heart, Leaf, Pill, BarChart3, ShoppingBag, Package } from "lucide-react";

type Chip = {
  href: string;
  labelKey: string;
  icon: "pharmacy" | "orders" | "import" | "nursing" | "nutrition" | "integrative";
};

type Props = {
  t: (key: string) => string;
  chips: Chip[];
};

const ICONS = {
  pharmacy: Pill,
  orders: ShoppingBag,
  import: Package,
  nursing: Heart,
  nutrition: BarChart3,
  integrative: Leaf,
} as const;

export default function PatientCareToolsChips({ t, chips }: Props) {
  if (chips.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">{t("pdash.careTools.title")}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const Icon = ICONS[chip.icon];
          return (
            <Link
              key={chip.href}
              href={chip.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <Icon size={14} aria-hidden />
              {t(chip.labelKey)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
