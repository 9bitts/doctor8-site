"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { buyingClubPageForRole } from "@/lib/buying-club-auth";
import {
  Users, Search, Loader2, ShoppingBag, Share2, CheckCircle2,
  AlertCircle, MapPin, X,
} from "lucide-react";

interface DrugResult {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer: string | null;
}

interface ClubInfo {
  exists: boolean;
  clubId?: string;
  shareToken?: string;
  activeCount: number;
  isMember: boolean;
  drug: DrugResult;
}

interface ActiveClub {
  id: string;
  status: string;
  activeCount: number;
  isMember: boolean;
  drug: DrugResult;
}

interface BuyingClubClientProps {
  pagePath: string;
  accountPath: string;
}

export default function BuyingClubClient({ pagePath, accountPath }: BuyingClubClientProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DrugResult | null>(null);
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [clubLoading, setClubLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeClubs, setActiveClubs] = useState<ActiveClub[]>([]);
  const [activeClubsLoading, setActiveClubsLoading] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const loadActiveClubs = useCallback(async () => {
    setActiveClubsLoading(true);
    try {
      const res = await fetch("/api/buying-club/active");
      const data = await res.json();
      if (res.ok) setActiveClubs(data.clubs || []);
    } catch { /* ignore */ }
    setActiveClubsLoading(false);
  }, []);

  useEffect(() => {
    loadActiveClubs();
  }, [loadActiveClubs]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const role = s?.user?.role;
        const correctPath = buyingClubPageForRole(role);
        if (pathname.includes("/buying-club") && pathname !== correctPath) {
          router.replace(`${correctPath}${window.location.search}`);
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  const loadClub = useCallback(async (drugId: string) => {
    setClubLoading(true);
    try {
      const res = await fetch(`/api/buying-club?drugCatalogId=${drugId}`);
      const data = await res.json();
      if (res.ok) {
        setClub(data);
        setJoined(data.isMember);
      }
    } catch { /* ignore */ }
    setClubLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drugId = params.get("drug");
    const token = params.get("club");
    if (!drugId && !token) return;

    (async () => {
      const url = drugId
        ? `/api/buying-club?drugCatalogId=${drugId}`
        : `/api/buying-club?token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.drug) {
        setSelected(data.drug);
        setClub(data);
        setJoined(data.isMember);
      }
    })();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/buying-club/drugs/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setResults(data.drugs || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function selectDrug(drug: DrugResult) {
    setSelected(drug);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setJoined(false);
    setShareMsg(null);
    loadClub(drug.id);
  }

  function clearSelection() {
    setSelected(null);
    setClub(null);
    setJoined(false);
    setShareMsg(null);
  }

  async function handleJoin() {
    if (!selected) return;
    setJoining(true);
    try {
      const res = await fetch("/api/buying-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugCatalogId: selected.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setClub(data);
        setJoined(true);
        loadActiveClubs();
      }
    } catch { /* ignore */ }
    setJoining(false);
  }

  function shareLink(): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (club?.shareToken) {
      return `${base}/club/join?club=${club.shareToken}`;
    }
    if (selected) {
      return `${base}/club/join?drug=${selected.id}`;
    }
    return base;
  }

  async function handleShare() {
    const link = shareLink();
    const shareText = selected?.name ?? t("buyClub.title");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("buyClub.title"), text: shareText, url: link });
        setShareMsg("ok");
        setTimeout(() => setShareMsg(null), 3000);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setShareMsg("ok");
      setTimeout(() => setShareMsg(null), 3000);
    } catch {
      setShareMsg("err");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("buyClub.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm leading-relaxed">{t("buyClub.subtitle")}</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex gap-3">
        <ShoppingBag className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-800 leading-relaxed">{t("buyClub.howItWorks")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          {t("buyClub.searchLabel")}
        </label>

        {selected ? (
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{selected.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selected.activeIngredient} · {selected.presentation}
              </p>
              {selected.manufacturer && (
                <p className="text-xs text-slate-400 mt-0.5">{selected.manufacturer}</p>
              )}
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label={t("common.cancel")}
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="relative" ref={searchRef}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder={t("buyClub.searchPlaceholder")}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-base sm:text-sm"
              autoComplete="off"
            />
            {searching && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
            )}
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-50">
                {results.map((drug) => (
                  <li key={drug.id}>
                    <button
                      type="button"
                      onClick={() => selectDrug(drug)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition"
                    >
                      <p className="text-sm font-medium text-slate-800">{drug.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {drug.activeIngredient} · {drug.presentation}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && query.length >= 2 && !searching && results.length === 0 && (
              <p className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
                {t("buyClub.noResults")}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-slate-400">{t("buyClub.catalogOnly")}</p>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          {clubLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center">
              <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
            </div>
          ) : club ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {t("buyClub.activeCount").replace("{{count}}", String(club.activeCount))}
                  </p>
                  {club.exists && (
                    <p className="text-xs text-slate-500 mt-0.5">{t("buyClub.alreadyExists")}</p>
                  )}
                  {!club.exists && (
                    <p className="text-xs text-slate-500 mt-0.5">{t("buyClub.beFirst")}</p>
                  )}
                </div>
              </div>

              {club.exists && club.activeCount > 0 && !joined && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl transition"
                >
                  <Share2 size={16} />
                  {t("buyClub.share")}
                </button>
              )}
              {shareMsg === "ok" && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> {t("buyClub.linkCopied")}
                </p>
              )}
              {shareMsg === "err" && (
                <p className="text-xs text-rose-500">{t("buyClub.linkCopyError")}</p>
              )}

              {joined ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{t("buyClub.joinedTitle")}</p>
                      <p className="text-sm text-emerald-700 mt-2 leading-relaxed">{t("buyClub.joinedBody")}</p>
                      <p className="text-sm text-emerald-700 mt-2 leading-relaxed">{t("buyClub.joinedPayment")}</p>
                    </div>
                  </div>
                  <Link
                    href={accountPath}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline"
                  >
                    <MapPin size={14} /> {t("buyClub.checkAddress")}
                  </Link>
                  {club.activeCount > 0 && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl transition"
                    >
                      <Share2 size={16} />
                      {t("buyClub.share")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {club.exists && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">{t("buyClub.existingClubHint")}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    {joining ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                    {club.exists ? t("buyClub.joinExisting") : t("buyClub.startClub")}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{t("buyClub.activeClubsTitle")}</h2>
          <p className="text-xs text-slate-500 mt-1">{t("buyClub.activeClubsSubtitle")}</p>
        </div>

        {activeClubsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
            <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
          </div>
        ) : activeClubs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{t("buyClub.noActiveClubs")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-5">
            {activeClubs.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectDrug(item.drug)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <ShoppingBag size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{item.drug.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.drug.activeIngredient} · {item.drug.presentation}
                    </p>
                    {item.isMember && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t("buyClub.youAreMember")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <Users size={14} />
                      {t("buyClub.listMemberCount").replace("{{count}}", String(item.activeCount))}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
