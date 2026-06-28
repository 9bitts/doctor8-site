"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Shield, Loader2, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

function FhirAuthorizeInner() {
  const t = useT();
  const sp = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const redirectUri = sp.get("redirect_uri") || "";
  const clientId = sp.get("client_id") || "doctor8-public";
  const scope = sp.get("scope") || "patient/*.read";
  const state = sp.get("state") || undefined;
  const codeChallenge = sp.get("code_challenge") || "";
  const codeChallengeMethod = sp.get("code_challenge_method") || "";

  async function respond(action: "allow" | "deny") {
    if (!redirectUri || !codeChallenge || codeChallengeMethod !== "S256") {
      setError(t("smart.consent.invalid"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/fhir/smart/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          client_id: clientId,
          state,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("smart.consent.failed"));
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      throw new Error(t("smart.consent.failed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("smart.consent.failed"));
      setBusy(false);
    }
  }

  if (!redirectUri) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center text-slate-600">
        {t("smart.consent.invalid")}
      </div>
    );
  }

  let host = redirectUri;
  try {
    host = new URL(redirectUri).host;
  } catch {
    /* keep raw */
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Shield size={22} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("smart.consent.title")}</h1>
          <p className="text-sm text-slate-500">{t("smart.consent.subtitle")}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">{t("smart.consent.app")}</p>
          <p className="font-medium text-slate-800 mt-0.5">{clientId}</p>
          <p className="text-xs text-slate-400 mt-1">{host}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">{t("smart.consent.scopes")}</p>
          <p className="text-slate-700 mt-0.5 font-mono text-xs">{scope}</p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{t("smart.consent.hint")}</p>
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("allow")}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {t("smart.consent.allow")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond("deny")}
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50"
        >
          <X size={16} /> {t("smart.consent.deny")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.push("/patient/connected-apps")}
        className="text-sm text-emerald-600 hover:underline w-full text-center"
      >
        {t("smart.consent.manageApps")}
      </button>
    </div>
  );
}

export default function FhirAuthorizePage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">?</div>}>
      <FhirAuthorizeInner />
    </Suspense>
  );
}
