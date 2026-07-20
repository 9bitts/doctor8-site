"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Search,
  FileText,
  Clock,
} from "lucide-react";

type LinkRow = {
  id: string;
  status: "PENDING" | "ACCEPTED";
  requestedBy: "PROFESSIONAL" | "PATIENT" | string;
  createdAt: string;
  professionalUserId: string;
  professionalId: string | null;
  name: string;
  licenseNumber: string | null;
  specialty: string | null;
};

type SearchHit = {
  professionalId: string;
  professionalUserId: string;
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
  linkStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED" | "NONE";
  linkId: string | null;
};

type OwnDoc = {
  id: string;
  title: string;
  type: string;
  categoryName: string | null;
  createdAt: string;
};

type SharePrompt = {
  professionalId: string;
  name: string;
};

export default function PatientProvidersLinksClient() {
  const { t } = useI18n();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [sharePrompt, setSharePrompt] = useState<SharePrompt | null>(null);
  const [ownDocs, setOwnDocs] = useState<OwnDoc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/professional-links");
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/patient/professionals/search?q=${encodeURIComponent(q)}`,
        );
        if (res.ok) {
          const d = await res.json();
          setHits(d.professionals || []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function respond(id: string, action: "accept" | "reject") {
    setActingId(id);
    try {
      const res = await fetch(`/api/patient/professional-links/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  }

  async function revoke(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/patient/professional-links/${id}/revoke`, {
        method: "POST",
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  }

  async function requestConnection(hit: SearchHit) {
    setActingId(hit.professionalUserId);
    try {
      const res = await fetch("/api/patient/professional-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalUserId: hit.professionalUserId }),
      });
      if (!res.ok) return;
      await load();
      setSelected(null);
      setQuery("");
      setHits([]);
      setSharePrompt({ professionalId: hit.professionalId, name: hit.name });
      setSelectedDocIds(new Set());
    } finally {
      setActingId(null);
    }
  }

  async function openDocPicker() {
    if (!sharePrompt) return;
    setDocsLoading(true);
    try {
      const res = await fetch("/api/patient/own-documents");
      if (res.ok) {
        const d = await res.json();
        setOwnDocs(d.documents || []);
      }
    } finally {
      setDocsLoading(false);
    }
  }

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function shareSelectedDocs() {
    if (!sharePrompt || selectedDocIds.size === 0) return;
    setSharing(true);
    try {
      await Promise.all(
        [...selectedDocIds].map((docId) =>
          fetch(`/api/patient/documents/${docId}/share-with-doctor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professionalId: sharePrompt.professionalId }),
          }),
        ),
      );
      setSharePrompt(null);
      setOwnDocs([]);
      setSelectedDocIds(new Set());
    } finally {
      setSharing(false);
    }
  }

  const incomingPending = links.filter(
    (l) => l.status === "PENDING" && l.requestedBy !== "PATIENT",
  );
  const outgoingPending = links.filter(
    (l) => l.status === "PENDING" && l.requestedBy === "PATIENT",
  );
  const accepted = links.filter((l) => l.status === "ACCEPTED");

  const showDocList = sharePrompt && (ownDocs.length > 0 || docsLoading);

  return (
    <div className="space-y-4 mb-8">
      {/* Search professionals */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Search size={16} className="text-brand-500" />
          {t("providers.search.title")}
        </h2>
        <p className="text-xs text-slate-500 mb-3">{t("providers.search.hint")}</p>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder={t("providers.search.placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 min-h-[44px]"
          />
          {searching && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
            />
          )}
        </div>

        {hits.length > 0 && !selected && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
            {hits.map((hit) => (
              <li key={hit.professionalId}>
                <button
                  type="button"
                  onClick={() => setSelected(hit)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition min-h-[44px]"
                >
                  <p className="font-semibold text-slate-900 text-sm">{hit.name}</p>
                  <p className="text-xs text-slate-500">
                    {[hit.specialty, hit.licenseNumber].filter(Boolean).join(" · ")}
                  </p>
                  {hit.linkStatus === "PENDING" && (
                    <p className="text-xs text-amber-600 mt-0.5">{t("link.statusPending")}</p>
                  )}
                  {hit.linkStatus === "ACCEPTED" && (
                    <p className="text-xs text-brand-600 mt-0.5">{t("link.statusAccepted")}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="font-semibold text-slate-900 text-sm">{selected.name}</p>
            {selected.specialty && (
              <p className="text-xs text-slate-500 mt-0.5">{selected.specialty}</p>
            )}
            {selected.licenseNumber && (
              <p className="text-xs text-slate-500">{selected.licenseNumber}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {selected.linkStatus === "NONE" ||
              selected.linkStatus === "REJECTED" ||
              selected.linkStatus === "REVOKED" ? (
                <button
                  type="button"
                  disabled={actingId === selected.professionalUserId}
                  onClick={() => requestConnection(selected)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
                >
                  {actingId === selected.professionalUserId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {t("link.requestConnection")}
                </button>
              ) : (
                <p className="text-xs text-slate-600 py-2">
                  {selected.linkStatus === "PENDING"
                    ? t("providers.search.alreadyPending")
                    : t("providers.search.alreadyConnected")}
                </p>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2 min-h-[44px]"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* After request: offer to send documents */}
      {sharePrompt && !showDocList && (
        <section className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:p-5">
          <p className="text-sm font-semibold text-brand-900">
            {t("providers.sharePrompt.title").replace("{{name}}", sharePrompt.name)}
          </p>
          <p className="text-xs text-brand-800/90 mt-1">{t("providers.sharePrompt.desc")}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={openDocPicker}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg min-h-[44px]"
            >
              <FileText size={14} /> {t("providers.sharePrompt.yes")}
            </button>
            <button
              type="button"
              onClick={() => setSharePrompt(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg min-h-[44px]"
            >
              {t("providers.sharePrompt.later")}
            </button>
          </div>
        </section>
      )}

      {sharePrompt && showDocList && (
        <section className="rounded-2xl border border-brand-200 bg-white p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            {t("providers.sharePrompt.pickTitle")}
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            {t("providers.sharePrompt.pickDesc").replace("{{name}}", sharePrompt.name)}
          </p>
          {docsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-slate-400" size={22} />
            </div>
          ) : ownDocs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">{t("providers.sharePrompt.noDocs")}</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {ownDocs.map((doc) => (
                <li key={doc.id}>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 cursor-pointer hover:bg-slate-50 min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.has(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="mt-1 rounded border-slate-300 text-brand-500 focus:ring-brand-300"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">
                        {doc.title}
                      </span>
                      {doc.categoryName && (
                        <span className="block text-xs text-slate-500">{doc.categoryName}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sharing || selectedDocIds.size === 0}
              onClick={shareSelectedDocs}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
            >
              {sharing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              {t("providers.sharePrompt.send")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSharePrompt(null);
                setOwnDocs([]);
                setSelectedDocIds(new Set());
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2 min-h-[44px]"
            >
              {t("providers.sharePrompt.later")}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-slate-400" size={22} />
        </div>
      ) : (
        <>
          {incomingPending.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                <UserPlus size={16} /> {t("providers.linkRequests.title")}
              </h2>
              <ul className="space-y-3">
                {incomingPending.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-xl border border-amber-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{link.name}</p>
                      {link.licenseNumber && (
                        <p className="text-xs text-slate-500">{link.licenseNumber}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {t("providers.linkRequests.desc")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actingId === link.id}
                        onClick={() => respond(link.id, "accept")}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
                      >
                        {actingId === link.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {t("providers.linkRequests.accept")}
                      </button>
                      <button
                        type="button"
                        disabled={actingId === link.id}
                        onClick={() => respond(link.id, "reject")}
                        className="inline-flex items-center gap-1 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
                      >
                        <XCircle size={14} /> {t("providers.linkRequests.reject")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {outgoingPending.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Clock size={16} /> {t("providers.sentRequests.title")}
              </h2>
              <ul className="space-y-2">
                {outgoingPending.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{link.name}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {t("providers.sentRequests.pending")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {accepted.length > 0 && (
            <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-3">
                {t("providers.connected.title")}
              </h2>
              <ul className="space-y-2">
                {accepted.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{link.name}</p>
                      {link.specialty && (
                        <p className="text-xs text-slate-500 truncate">{link.specialty}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={actingId === link.id}
                      onClick={() => revoke(link.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 shrink-0 min-h-[44px] px-2"
                    >
                      {actingId === link.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ShieldOff size={14} />
                      )}
                      {t("providers.connected.revoke")}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
