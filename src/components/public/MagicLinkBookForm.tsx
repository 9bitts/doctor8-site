"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Mail } from "lucide-react";

export default function MagicLinkBookForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          callbackUrl,
          language: lang,
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.general?.[0] || t("pub.magicError"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("pub.magicError"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-2.5 rounded-xl transition text-sm"
      >
        <Mail size={16} />
        {t("pub.magicCta")}
      </button>
    );
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-medium text-emerald-800">{t("pub.magicSent")}</p>
        <p className="text-xs text-emerald-700 mt-1">{email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs text-slate-600">{t("pub.magicHint")}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t("pub.magicFirstName")}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <input
          type="text"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t("pub.magicLastName")}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("pub.magicEmail")}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          required
          checked={acceptedTerms && acceptedPrivacy}
          onChange={(e) => {
            const v = e.target.checked;
            setAcceptedTerms(v);
            setAcceptedPrivacy(v);
          }}
          className="mt-0.5"
        />
        <span>
          {t("pub.magicTerms")}{" "}
          <Link href="/terms" target="_blank" className="text-brand-600 underline">
            {t("pub.magicTermsLink")}
          </Link>{" "}
          {t("pub.magicAnd")}{" "}
          <Link href="/privacy" target="_blank" className="text-brand-600 underline">
            {t("pub.magicPrivacyLink")}
          </Link>
        </span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          {t("pub.magicCancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {t("pub.magicSubmit")}
        </button>
      </div>
    </form>
  );
}
