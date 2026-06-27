"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

interface AngelRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  languages: string[];
  motivation: string | null;
  preferredCampaignSlug: string | null;
  approvalStatus: string;
  createdAt: string;
}

export default function HumanitarianAngelsAdminPanel() {
  const [angels, setAngels] = useState<AngelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/humanitarian/angels");
      const data = await res.json();
      if (res.ok) setAngels(data.angels || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(userId: string, action: "approve" | "reject") {
    setActing(userId);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await load();
    } catch { /* ignore */ }
    setActing(null);
  }

  const pending = angels.filter((a) => a.approvalStatus === "PENDING");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Anjos ? Volunt?rios de Acompanhamento</h2>
        {pending.length > 0 && (
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {pending.length} pendente(s)
          </span>
        )}
      </div>

      {angels.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum cadastro de Anjo ainda.</p>
      ) : (
        <div className="space-y-3">
          {angels.map((a) => (
            <div key={a.userId} className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    {a.email}
                    {!a.emailVerified && (
                      <span className="text-amber-600 text-xs font-medium">(e-mail n?o verificado)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Idiomas: {a.languages.join(", ").toUpperCase()} ?{" "}
                    {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  {a.motivation && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">{a.motivation}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {a.approvalStatus === "PENDING" && (
                    <>
                      <button
                        disabled={acting === a.userId || !a.emailVerified}
                        onClick={() => act(a.userId, "approve")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                      >
                        {acting === a.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Aprovar
                      </button>
                      <button
                        disabled={acting === a.userId}
                        onClick={() => act(a.userId, "reject")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </>
                  )}
                  {a.approvalStatus === "APPROVED" && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Aprovado</span>
                  )}
                  {a.approvalStatus === "REJECTED" && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">Rejeitado</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
