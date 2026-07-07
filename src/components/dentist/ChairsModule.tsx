"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Chair = { id: string; name: string; active: boolean };

export default function ChairsModule() {
  const { t } = useI18n();
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/dentist/chairs")
      .then((r) => r.json())
      .then((data) => setChairs(data.chairs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dentist/chairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setName("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/dentist/chairs?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/odontologo"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-700 transition"
      >
        <ArrowLeft size={14} />
        {t("dental.backToDashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dental.mod.chairs.title")}</h1>
        <p className="text-slate-600 mt-2">{t("dental.mod.chairs.desc")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-sky-500" size={24} />
        </div>
      ) : (
        <div className="space-y-3">
          {chairs.map((chair) => (
            <div key={chair.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="font-medium text-slate-800">{chair.name}</span>
              <button type="button" onClick={() => remove(chair.id)} className="text-rose-500 hover:text-rose-700">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("dental.chairs.namePlaceholder")}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("dental.chairs.add")}
        </button>
      </div>
    </div>
  );
}
