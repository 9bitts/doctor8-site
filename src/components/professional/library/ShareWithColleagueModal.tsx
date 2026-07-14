"use client";

import { useEffect, useState } from "react";
import {
  X, Search, Share2, CheckCircle2, AlertCircle, Loader2,
  Stethoscope, UserPlus, Mail,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getProfessionLabel } from "@/lib/professions";
import type { ColleagueKind } from "@/lib/professional-library/colleague-share";
import type { LibraryResourceDto } from "@/lib/professional-library/types";

interface ShareWithColleagueModalProps {
  apiBase: string;
  resource: LibraryResourceDto;
  onClose: () => void;
}

interface ColleagueResult {
  id: string;
  kind: ColleagueKind;
  name: string;
  specialty: string;
  email: string;
}

function kindLabel(t: (k: string) => string, kind: ColleagueKind): string {
  switch (kind) {
    case "psychoanalyst":
      return t("libHub.colleagueKind.psychoanalyst");
    case "integrative":
      return t("libHub.colleagueKind.integrative");
    default:
      return t("libHub.colleagueKind.health");
  }
}

export default function ShareWithColleagueModal({
  apiBase,
  resource,
  onClose,
}: ShareWithColleagueModalProps) {
  const { lang, t } = useI18n();
  const [proQuery, setProQuery] = useState("");
  const [colleagues, setColleagues] = useState<ColleagueResult[]>([]);
  const [proSearching, setProSearching] = useState(false);
  const [shareMsg, setShareMsg] = useState<Record<string, "ok" | "error">>({});
  const [sharingKey, setSharingKey] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<"ok" | string | null>(null);

  useEffect(() => {
    if (proQuery.length < 2) {
      setColleagues([]);
      return;
    }
    const timer = setTimeout(async () => {
      setProSearching(true);
      try {
        const res = await fetch(
          `${apiBase}/search-colleagues?q=${encodeURIComponent(proQuery)}`,
        );
        const data = await res.json();
        setColleagues(data.colleagues || []);
      } catch {
        setColleagues([]);
      }
      setProSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [apiBase, proQuery]);

  function colleagueKey(c: ColleagueResult) {
    return `${c.kind}:${c.id}`;
  }

  async function shareWith(c: ColleagueResult) {
    const key = colleagueKey(c);
    setSharingKey(key);
    try {
      const res = await fetch(`${apiBase}/resources/${resource.id}/share-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientKind: c.kind,
          recipientId: c.id,
        }),
      });
      setShareMsg((m) => ({ ...m, [key]: res.ok ? "ok" : "error" }));
    } catch {
      setShareMsg((m) => ({ ...m, [key]: "error" }));
    }
    setSharingKey(null);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) {
      setInviteMsg(t("lib.proErrEmail"));
      return;
    }
    setInviteSending(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`${apiBase}/resources/${resource.id}/share-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          phone: invitePhone.trim(),
        }),
      });
      if (res.ok) {
        setInviteMsg("ok");
        setInviteName("");
        setInviteEmail("");
        setInvitePhone("");
        setShowInviteForm(false);
      } else {
        setInviteMsg("err");
      }
    } catch {
      setInviteMsg("err");
    }
    setInviteSending(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope size={18} className="text-sky-600" />
              {t("lib.shareWithPro")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{resource.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">{t("libHub.shareColleagueHint")}</p>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={proQuery}
              onChange={(e) => setProQuery(e.target.value)}
              placeholder={t("lib.proSearch")}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-brand-400"
            />
          </div>

          {proSearching ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
              <Loader2 size={14} className="animate-spin" /> {t("common.loading")}
            </div>
          ) : proQuery.length >= 2 && colleagues.length === 0 ? (
            <p className="text-sm text-slate-400">{t("lib.proNotFound")}</p>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {colleagues.map((c) => {
                const key = colleagueKey(c);
                const st = shareMsg[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 font-medium truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {kindLabel(t, c.kind)}
                        {c.kind === "health" && c.specialty
                          ? ` · ${getProfessionLabel(lang, c.specialty)}`
                          : ""}
                      </p>
                    </div>
                    {st === "ok" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-500 shrink-0">
                        <CheckCircle2 size={13} /> {t("lib.proNotified")}
                      </span>
                    ) : st === "error" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-500 shrink-0">
                        <AlertCircle size={13} /> Erro
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => shareWith(c)}
                        disabled={sharingKey === key}
                        className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 px-2.5 py-1 rounded-lg disabled:opacity-50 shrink-0"
                      >
                        {sharingKey === key ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Share2 size={12} />
                        )}
                        {t("libHub.sharePrimary")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 transition"
            >
              <UserPlus size={13} /> {t("lib.proNoAccount")}
            </button>
            {showInviteForm && (
              <div className="mt-3 space-y-2">
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t("lib.proNameLabel")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-brand-400"
                />
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("lib.proEmailLabel")}
                  type="email"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-brand-400"
                />
                <input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder={t("lib.proPhoneLabel")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-brand-400"
                />
                {inviteMsg === "ok" && (
                  <p className="text-xs text-brand-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {t("lib.proInvited")}
                  </p>
                )}
                {inviteMsg === "err" && (
                  <p className="text-xs text-rose-600">{t("lib.errGeneric")}</p>
                )}
                {typeof inviteMsg === "string" && inviteMsg !== "ok" && inviteMsg !== "err" && (
                  <p className="text-xs text-rose-600">{inviteMsg}</p>
                )}
                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={inviteSending}
                  className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {inviteSending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Mail size={14} />
                  )}
                  {t("lib.proInvite")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
