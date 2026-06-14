"use client";

// src/app/(dashboard)/admin/categories/CategoriesAdminClient.tsx
import { useState, useEffect } from "react";
import {
  Layers, Plus, X, Loader2, Pencil, Eye, EyeOff, Trash2, AlertCircle,
} from "lucide-react";

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
      else setErr(data.error || "Erro ao carregar.");
    } catch { setErr("Erro de rede."); }
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
    if (!name.trim() || !groupName.trim()) { setErr("Nome e grupo são obrigatórios."); return; }
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
      if (!res.ok) { setErr(typeof data.error === "string" ? data.error : "Não foi possível salvar."); setSaving(false); return; }
      setShowForm(false);
      await load();
    } catch { setErr("Erro de rede."); }
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
      alert(`Esta categoria tem ${c.usageCount} registro(s) e não pode ser excluída. Desative-a em vez disso.`);
      return;
    }
    if (!confirm(`Excluir a categoria "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Não foi possível excluir.");
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
          <p className="text-slate-500 mt-1">Gerencie as categorias de documentos da plataforma</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> Nova categoria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> Carregando...
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Layers className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">Nenhuma categoria ainda</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.group} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-sm">{g.group}</h2>
                <span className="text-xs text-slate-400">ordem {g.groupOrder} · {g.items.length} categorias</span>
              </div>
              <div className="divide-y divide-slate-50">
                {g.items.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${c.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{c.name}</p>
                        {!c.active && <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">inativa</span>}
                        {c.isSystem && <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">sistema</span>}
                        {c.usageCount > 0 && <span className="text-[11px] text-slate-500">· {c.usageCount} uso(s)</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.slug}{c.legacyType ? ` · ${c.legacyType}` : ""}</p>
                    </div>
                    <button onClick={() => openEdit(c)} disabled={busyId === c.id}
                      className="text-slate-400 hover:text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50" aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => toggleActive(c)} disabled={busyId === c.id}
                      className="text-slate-400 hover:text-amber-600 p-2 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                      aria-label={c.active ? "Desativar" : "Ativar"}>
                      {busyId === c.id ? <Loader2 size={16} className="animate-spin" /> : c.active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => handleDelete(c)} disabled={busyId === c.id || c.usageCount > 0}
                      className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 disabled:opacity-30"
                      aria-label="Excluir" title={c.usageCount > 0 ? "Tem registros — desative" : "Excluir"}>
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
              <h2 className="font-bold text-slate-800">{editing ? "Editar categoria" : "Nova categoria"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Exame de sangue"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Grupo *</label>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex.: Exames"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ordem do grupo</label>
                  <input type="number" value={groupOrder} onChange={(e) => setGroupOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ordem do item</label>
                  <input type="number" value={itemOrder} onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo legado <span className="text-slate-400">(opcional)</span></label>
                <input value={legacyType} onChange={(e) => setLegacyType(e.target.value)} placeholder="Ex.: EXAM_RESULT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
              </div>

              {err && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {err}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
