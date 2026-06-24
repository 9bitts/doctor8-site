"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { translate, normalizeLang, LANGUAGES, Lang } from "@/lib/i18n/translations";
import { buyingClubPageForRole } from "@/lib/buying-club-auth";
import {
  ShoppingBag, Users, Loader2, LogIn, UserPlus, AlertCircle,
} from "lucide-react";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

function ClubJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("club") || searchParams.get("token") || "";
  const drugId = searchParams.get("drug") || "";

  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [drug, setDrug] = useState<{
    name: string;
    activeIngredient: string;
    presentation: string;
    manufacturer: string | null;
  } | null>(null);
  const [activeCount, setActiveCount] = useState(0);

  const t = (key: string) => translate(lang, key);

  useEffect(() => { setLang(detectInitialLang()); }, []);

  const destination = token
    ? `/patient/buying-club?club=${encodeURIComponent(token)}`
    : drugId
      ? `/patient/buying-club?drug=${encodeURIComponent(drugId)}`
      : "/patient/buying-club";
  const callbackUrl = encodeURIComponent(destination);

  useEffect(() => {
    if (!token && !drugId) {
      setLoading(false);
      setCheckingSession(false);
      return;
    }

    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user?.role) {
          const page = buyingClubPageForRole(session.user.role);
          const qs = token
            ? `club=${encodeURIComponent(token)}`
            : `drug=${encodeURIComponent(drugId)}`;
          router.replace(`${page}?${qs}`);
          return;
        }
      } catch { /* continue as guest */ }
      setCheckingSession(false);

      try {
        const apiUrl = token
          ? `/api/buying-club/public?token=${encodeURIComponent(token)}`
          : `/api/buying-club/public?drugCatalogId=${encodeURIComponent(drugId)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (res.ok && data.drug) {
          setDrug(data.drug);
          setActiveCount(data.activeCount ?? 0);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [token, drugId, router]);

  if (!token && !drugId) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
        <p className="text-slate-600">{t("buyClub.invite.invalidLink")}</p>
        <Link href="/login" className="inline-block mt-4 text-emerald-600 font-medium hover:underline">
          {t("buyClub.invite.login")}
        </Link>
      </div>
    );
  }

  if (checkingSession || loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 py-16">
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  if (notFound || !drug) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
        <p className="text-slate-600">{t("buyClub.invite.notFound")}</p>
        <Link href="/register" className="inline-block mt-4 text-emerald-600 font-medium hover:underline">
          {t("buyClub.invite.register")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("buyClub.invite.title")}</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">{t("buyClub.invite.subtitle")}</p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
        <p className="font-semibold text-slate-800">{drug.name}</p>
        <p className="text-sm text-slate-500 mt-1">
          {drug.activeIngredient} · {drug.presentation}
        </p>
        {drug.manufacturer && (
          <p className="text-xs text-slate-400 mt-1">{drug.manufacturer}</p>
        )}
        <p className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-700">
          <Users size={16} />
          {t("buyClub.activeCount").replace("{{count}}", String(activeCount))}
        </p>
      </div>

      <p className="text-sm text-slate-600 text-center leading-relaxed">
        {t("buyClub.invite.authPrompt")}
      </p>

      <div className="space-y-3">
        <Link
          href={`/register?callbackUrl=${callbackUrl}`}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition"
        >
          <UserPlus size={18} />
          {t("buyClub.invite.register")}
        </Link>
        <Link
          href={`/login?callbackUrl=${callbackUrl}`}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 font-semibold py-3 rounded-xl transition"
        >
          <LogIn size={18} />
          {t("buyClub.invite.login")}
        </Link>
      </div>
    </div>
  );
}

export default function ClubJoinPage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(detectInitialLang()); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  try { window.localStorage.setItem(LANG_KEY, l.code); } catch { /* ignore */ }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                  lang === l.code ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{l.flag}</span>
                <span className="uppercase">{l.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Doctor<span className="text-emerald-500">8</span>
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center gap-2 text-slate-400 py-16">
                <Loader2 size={22} className="animate-spin" />
              </div>
            }
          >
            <ClubJoinContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
