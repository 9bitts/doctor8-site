"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LegalReacceptPage() {
  const { t } = useI18n();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/consent/legal-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedTerms: true, acceptedPrivacy: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : t("legalReaccept.errGeneric"));
        return;
      }
      sessionStorage.setItem("d8_legal_acceptance_ok", "1");
      window.location.href = "/patient";
    } catch {
      setError(t("legalReaccept.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("legalReaccept.title")}</h1>
      <p className="text-sm text-slate-600 mb-8">{t("legalReaccept.desc")}</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("legalReaccept.acceptTerms")}{" "}
            <Link href="/terms" className="text-brand-600 underline" target="_blank">
              {t("reg.termsOfService")}
            </Link>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("legalReaccept.acceptPrivacy")}{" "}
            <Link href="/privacy" className="text-brand-600 underline" target="_blank">
              {t("reg.privacyPolicy")}
            </Link>
          </span>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !acceptedTerms || !acceptedPrivacy}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 text-white py-3 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {t("legalReaccept.submit")}
        </button>
      </form>
    </div>
  );
}
