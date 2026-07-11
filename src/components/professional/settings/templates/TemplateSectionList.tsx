"use client";

import Link from "next/link";
import { Pencil, Trash2, LayoutTemplate } from "lucide-react";
import { useTemplateUrl, type TemplateCategory } from "@/lib/clinical-template-utils";

interface TemplateListItem {
  id: string;
  name: string;
  subtitle?: string;
}

interface TemplateSectionListProps {
  items: TemplateListItem[];
  category: TemplateCategory;
  emptyLabel: string;
  t: (k: string) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplateSectionList({
  items,
  category,
  emptyLabel,
  t,
  onEdit,
  onDelete,
}: TemplateSectionListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="py-3 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-800">{item.name}</p>
            {item.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</p>
            )}
          </div>
          <Link
            href={useTemplateUrl(category, item.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition shrink-0"
          >
            <LayoutTemplate size={14} />
            {t("tmpl.useTemplateModel")}
          </Link>
          <button type="button" onClick={() => onEdit(item.id)}
            className="p-2 text-slate-400 hover:text-brand-500 rounded-lg" title={t("tmpl.edit")}>
            <Pencil size={15} />
          </button>
          <button type="button" onClick={() => onDelete(item.id)}
            className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title={t("tmpl.delete")}>
            <Trash2 size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}
