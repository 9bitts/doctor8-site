"use client";

// Legacy room URL → unified video consult UI with patient chart sidebar.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { translate, normalizeLang, type Lang, type TranslationKey } from "@/lib/i18n/translations";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return normalizeLang(stored);
  } catch { /* ignore */ }
  const l = document.documentElement.lang || navigator.language || "pt";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

export default function RoomRedirectPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [lang, setLang] = useState<Lang>("pt");

  const t = (key: TranslationKey) => translate(lang, key);

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/room/${roomId}/token`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(data.error || t("room.errAccess"));
          return;
        }
        if (data.appointment?.id) {
          router.replace(`/video/${data.appointment.id}`);
          return;
        }
        setError(t("room.errNotFound"));
      } catch {
        if (alive) setError(t("room.errConnect"));
      }
    })();
    return () => { alive = false; };
  }, [roomId, router, lang]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">{t("room.joinTitle")}</h2>
          <p className="text-slate-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-emerald-400" />
    </div>
  );
}
