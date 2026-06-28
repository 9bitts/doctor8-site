"use client";

// src/app/(dashboard)/admin/categories/CategoriesAdminClient.tsx
import { useState, useEffect } from "react";
import {
  Layers, Plus, X, Loader2, Pencil, Eye, EyeOff, Trash2, AlertCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Cat {
  id: string;
  name: string;
  slug: string;
  groupName: string;
  groupOrder: number;
  itemOrder: number;
  icon: string | null;
  legacyType: string | null;
  isSystem: boolean;
  active: boolean;
  usageCount: number;
}
interface Group { group: string; groupOrder: number; items: Cat[]; }

export default function CategoriesAdminClient() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupOrder, setGroupOrder] = useState(0);
  const [itemOrder, setItemOrder] = useState(0);
  const [legacyType, setLegacyType] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (res.ok) setGroups(data.groups || []);
      else setErr(data.error || t("admin.categories.errLoad"));
    } catch { setErr(t("common.loadError")); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setName(""); setGroupName(""); setGroupOrder(0); setItemOrder(0); setLegacyType("");
    setErr(null);
    setShowForm(true);
  }
  function openEdit(c: Cat) {
    setEditing(c);
    setName(c.name); setGroupName(c.groupName); setGroupOrder(c.groupOrder);
    setItemOrder(c.itemOrder); setLegacyType(c.legacyType || "");
    setErr(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !groupName.trim()) { setErr(t("admin.categories.errRequired")); return; }
    setSaving(true); setErr(null);
    try {
      const payload = { name, groupName, groupOrder, itemOrder, legacyType };
      const res = editing
        ? await fetch(`/api/admin/categories/${editing.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/categories", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) { setErr(typeof data.error === "string" ? data.error : t("admin.categories.errSave")); setSaving(false); return; }
      setShowForm(false);
      await load();
    } catch { setErr(t("common.loadError")); }
    setSaving(false);
  }

  async function toggleActive(c: Cat) {
    setBusyId(c.id);
    try {
      await fetch(`/api/admin/categories/${c.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  }

  async function handleDelete(c: Cat) {
    if (c.usageCount > 0) {
      alert(t("admin.categories.deleteBlocked").replace("{{n}}", String(c.usageCount)));
      return;
    }
    if (!confirm(t("admin.categories.deleteConfirm").replace("{{name}}", c.name))) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) alert(data.error || t("admin.categories.errDelete"));
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("admin.categories.title")}</h1>
          <p className="text-slate-500 mt-1">{t("admin.categories.subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> {t("admin.categories.new")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Layers className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("admin.categories.empty")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.group} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-sm">{g.group}</h2>
                <span className="text-xs text-slate-400">
                  {t("admin.categories.groupMeta")
                    .replace("{{order}}", String(g.groupOrder))
                    .replace("{{count}}", String(g.items.length))}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {g.items.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${c.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{c.name}</p>
                        {!c.active && <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{t("admin.categories.inactive")}</span>}
                        {c.isSystem && <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{t("admin.categories.system")}</span>}
                        {c.usageCount > 0 && <span className="text-[11px] text-slate-500">{t("admin.categories.usageCount").replace("{{n}}", String(c.usageCount))}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.slug}{c.legacyType ? ` · ${c.legacyType}` : ""}</p>
                    </div>
                    <button onClick={() => openEdit(c)} disabled={busyId === c.id}
                      className="text-slate-400 hover:text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50" aria-label={t("admin.categories.edit")}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => toggleActive(c)} disabled={busyId === c.id}
                      className="text-slate-400 hover:text-amber-600 p-2 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                      aria-label={c.active ? t("admin.categories.deactivate") : t("admin.categories.activate")}>
                      {busyId === c.id ? <Loader2 size={16} className="animate-spin" /> : c.active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => handleDelete(c)} disabled={busyId === c.id || c.usageCount > 0}
                      className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 disabled:opacity-30"
                      aria-label={t("admin.categories.delete")}
                      title={c.usageCount > 0 ? t("admin.categories.deleteHasRecords") : t("admin.categories.delete")}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{editing ? t("admin.categories.formEdit") : t("admin.categories.formNew")}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.categories.nameLabel")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("admin.categories.namePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.categories.groupLabel")}</label>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={t("admin.categories.groupPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.categories.groupOrderLabel")}</label>
                  <input type="number" value={groupOrder} onChange={(e) => setGroupOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.categories.itemOrderLabel")}</label>
                  <input type="number" value={itemOrder} onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("admin.categories.legacyLabel")}{" "}
                  <span className="text-slate-400">{t("admin.categories.legacyOptional")}</span>
                </label>
                <input value={legacyType} onChange={(e) => setLegacyType(e.target.value)} placeholder={t("admin.categories.legacyPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>

              {err && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {err}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">{t("common.cancel")}</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50">
                  {saving ? t("admin.categories.saving") : editing ? t("common.save") : t("admin.categories.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
