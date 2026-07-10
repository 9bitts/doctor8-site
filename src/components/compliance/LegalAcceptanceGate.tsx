"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const EXEMPT_PREFIXES = ["/legal/reaccept", "/login", "/register", "/signup"];

const LEGAL_OK_SESSION_KEY = "d8_legal_acceptance_ok";
const LEGAL_OK_LOCAL_KEY = "d8_legal_acceptance_ok_at";
const LEGAL_OK_TTL_MS = 12 * 60 * 60 * 1000;

function readLegalOkCache(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(LEGAL_OK_SESSION_KEY)) return true;
    const raw = localStorage.getItem(LEGAL_OK_LOCAL_KEY);
    if (!raw) return false;
    const ts = Number.parseInt(raw, 10);
    if (Number.isFinite(ts) && Date.now() - ts < LEGAL_OK_TTL_MS) {
      sessionStorage.setItem(LEGAL_OK_SESSION_KEY, "1");
      return true;
    }
    localStorage.removeItem(LEGAL_OK_LOCAL_KEY);
  } catch {
    /* ignore */
  }
  return false;
}

function writeLegalOkCache(): void {
  try {
    sessionStorage.setItem(LEGAL_OK_SESSION_KEY, "1");
    localStorage.setItem(LEGAL_OK_LOCAL_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [checking, setChecking] = useState(() => {
    if (typeof window === "undefined") return true;
    return !readLegalOkCache();
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
      setChecking(false);
      setPending(false);
      return;
    }

    if (readLegalOkCache()) {
      setChecking(false);
      setPending(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/consent/legal-status", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setChecking(false);
          return;
        }
        const data = (await res.json()) as { needsAny?: boolean };
        if (!cancelled) {
          if (!data.needsAny) {
            writeLegalOkCache();
          }
          setPending(!!data.needsAny);
          setChecking(false);
          if (data.needsAny) router.replace("/legal/reaccept");
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">{t("legalReaccept.checking")}</span>
      </div>
    );
  }

  if (pending && pathname !== "/legal/reaccept") {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <ShieldAlert className="mx-auto text-amber-500 mb-4" size={40} />
        <p className="text-slate-700 font-medium mb-4">{t("legalReaccept.redirectHint")}</p>
        <Link
          href="/legal/reaccept"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-700"
        >
          {t("legalReaccept.cta")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
