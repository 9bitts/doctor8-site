"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Building2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { translate, normalizeLang, type Lang } from "@/lib/i18n/translations";
import { ORGANIZATION_LOGIN } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  const nav = (navigator.language || "pt").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export default function RegisterOrganizationStaffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [lang, setLang] = useState<Lang>("pt");
  const t = (key: string) => translate(lang, key);
  const orgLoginHref = buildAuthHref(ORGANIZATION_LOGIN, {
    callbackUrl: "/organization",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{
    email: string;
    role: string;
    organizationName: string;
  } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/auth/register-organization-staff?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setInvite(data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedGdpr) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register-organization-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          password,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedGdpr: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.general?.[0] || data.error?.email?.[0] || t("orgStaff.errCreate"));
        return;
      }
      router.push(orgLoginHref);
    } catch {
      setError(t("orgStaff.errConnection"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  if (!token || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={40} />
          <p className="text-white font-semibold mb-2">{t("orgStaff.invalidInvite")}</p>
          <Link href={orgLoginHref} className="text-indigo-400 text-sm hover:underline">{t("orgStaff.goLogin")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8">
        <Link href={orgLoginHref} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-white">
          <ArrowLeft size={16} /> {t("orgStaff.back")}
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-indigo-400" size={24} />
          <div>
            <p className="text-white font-bold">{invite.organizationName}</p>
            <p className="text-slate-400 text-xs">{t("orgStaff.role").replace("{{role}}", invite.role)}</p>
          </div>
        </div>
        {error && (
          <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1">{t("orgStaff.email")}</label>
            <input disabled value={invite.email} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-400 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-300 block mb-1">{t("orgStaff.firstName")}</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">{t("orgStaff.lastName")}</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
            </div>
          </div>
          <div className="relative">
            <label className="text-sm text-slate-300 block mb-1">{t("orgStaff.password")}</label>
            <input required type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-slate-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <label className="flex gap-2"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} /> {t("orgStaff.acceptTerms")}</label>
            <label className="flex gap-2"><input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} /> {t("orgStaff.acceptPrivacy")}</label>
            <label className="flex gap-2"><input type="checkbox" checked={acceptedGdpr} onChange={(e) => setAcceptedGdpr(e.target.checked)} /> {t("orgStaff.acceptGdpr")}</label>
          </div>
          <button type="submit" disabled={saving || !acceptedTerms || !acceptedPrivacy || !acceptedGdpr}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="animate-spin" size={18} />}
            {t("orgStaff.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
