"use client";

// src/app/(dashboard)/patient/account/page.tsx
// Account settings: personal data (P1-e) + change password + change email. i18n via useT().
// P1-e: the "Personal data" section lets the patient fill/correct their own
// registration data (name, birth, phone, sex, CPF, address) — the same fields the
// prescription (CFM) needs. Encryption is handled server-side by the profile API.

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Lock, Mail, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, LogOut, Shield, User, Globe,
} from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition";

interface ProfileData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  sex: string;
  cpf: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

const EMPTY_PROFILE: ProfileData = {
  firstName: "", lastName: "", dateOfBirth: "", phone: "", sex: "", cpf: "",
  addressLine1: "", city: "", state: "", country: "", zipCode: "",
};

export default function AccountPage() {
  const t = useT();

  const PASSWORD_RULES = [
    { key: "acct.rule8", test: (p: string) => p.length >= 8 },
    { key: "acct.ruleUpper", test: (p: string) => /[A-Z]/.test(p) },
    { key: "acct.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
    { key: "acct.ruleSpecial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const [currentEmail, setCurrentEmail] = useState("");

  // P1-e: personal data
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailPwd, setEmailPwd] = useState("");
  const [showEmailPwd, setShowEmailPwd] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [accountRegion, setAccountRegion] = useState<"BR" | "US" | "EU">("US");
  const [regionSaving, setRegionSaving] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);
  const [regionError, setRegionError] = useState("");

  const isPasswordValid = PASSWORD_RULES.every((r) => r.test(newPwd));
  const passwordsMatch = newPwd === confirmPwd;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.email) setCurrentEmail(s.user.email);
      });
    fetch("/api/user/region")
      .then((r) => r.json())
      .then((d) => {
        if (d?.region === "BR" || d?.region === "US" || d?.region === "EU") {
          setAccountRegion(d.region);
        }
      })
      .catch(() => {});
  }, []);

  // P1-e: load current personal data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/patient/profile");
        const data = await res.json();
        if (active && res.ok && data.profile) {
          setProfile({ ...EMPTY_PROFILE, ...data.profile });
        }
      } catch {
        /* ignore — keep empty */
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function setField(field: keyof ProfileData, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setProfileError(t("pat.errNameRequired"));
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileError(typeof data.error === "string" ? data.error : t("acct.errGeneric"));
        return;
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 5000);
    } catch {
      setProfileError(t("acct.errGeneric"));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess(false);

    if (!isPasswordValid) { setPwdError(t("acct.errPwdReq")); return; }
    if (!passwordsMatch) { setPwdError(t("acct.pwdNoMatch")); return; }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPwdError(
          typeof data.error === "string"
            ? data.error
            : data.error?.newPassword?.[0] || data.error?.currentPassword?.[0] || t("acct.errPwdFail")
        );
        return;
      }

      setPwdSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 5000);
    } catch {
      setPwdError(t("acct.errGeneric"));
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess(false);

    if (!newEmail) { setEmailError(t("acct.errEnterEmail")); return; }

    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword: emailPwd }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailError(
          typeof data.error === "string"
            ? data.error
            : data.error?.newEmail?.[0] || data.error?.currentPassword?.[0] || t("acct.errEmailFail")
        );
        return;
      }

      setEmailSuccess(true);
      setNewEmail("");
      setEmailPwd("");
    } catch {
      setEmailError(t("acct.errGeneric"));
    } finally {
      setEmailLoading(false);
    }
  }

  async function saveAccountRegion() {
    setRegionSaving(true);
    setRegionError("");
    setRegionSaved(false);
    try {
      const res = await fetch("/api/user/region", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: accountRegion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nao foi possivel salvar a regiao.");
      setRegionSaved(true);
      setTimeout(() => setRegionSaved(false), 4000);
    } catch (e) {
      setRegionError(e instanceof Error ? e.message : "Erro ao salvar regiao.");
    } finally {
      setRegionSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("acct.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("acct.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Globe size={18} className="text-emerald-600" /> Regiao da conta
        </h2>
        <p className="text-sm text-slate-500">
          Define a moeda do Club Doctor e de outros pagamentos. Para PIX e boleto, selecione Brasil.
        </p>
        {regionError && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {regionError}
          </p>
        )}
        {regionSaved && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            Regiao atualizada. Voce ja pode assinar o Club Doctor na moeda escolhida.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Pais / regiao</label>
            <select
              value={accountRegion}
              onChange={(e) => setAccountRegion(e.target.value as "BR" | "US" | "EU")}
              className={inputClass}
            >
              <option value="BR">Brasil (BRL)</option>
              <option value="US">Estados Unidos (USD)</option>
              <option value="EU">Europa (EUR)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={saveAccountRegion}
            disabled={regionSaving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0"
          >
            {regionSaving && <Loader2 size={14} className="animate-spin" />}
            Salvar regiao
          </button>
        </div>
      </div>

      {/* Current account info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Shield size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{currentEmail || t("common.loading")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.currentEmail")}</p>
        </div>
      </div>

      {/* P1-e: Personal data */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-emerald-500" /> {t("pat.regSection")}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t("pat.regHint")}</p>
        </div>

        {profileSaved && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} className="shrink-0" /> {t("rx2.saved")}
          </div>
        )}
        {profileError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {profileError}
          </div>
        )}

        {profileLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.firstName")}</label>
                <input value={profile.firstName} onChange={(e) => setField("firstName", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.lastName")}</label>
                <input value={profile.lastName} onChange={(e) => setField("lastName", e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.dob")}</label>
                <input type="date" value={profile.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.sex")}</label>
                <select value={profile.sex} onChange={(e) => setField("sex", e.target.value)} className={inputClass + " bg-white"}>
                  <option value="">{t("pat.sexSelect")}</option>
                  <option value="F">{t("pat.sexF")}</option>
                  <option value="M">{t("pat.sexM")}</option>
                  <option value="O">{t("pat.sexO")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.phone")}</label>
                <input value={profile.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+55 11 99999-9999" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  {t("pat.cpf")} <span className="text-slate-400">{t("pat.cpfHint")}</span>
                </label>
                <input value={profile.cpf} onChange={(e) => setField("cpf", e.target.value)} placeholder="000.000.000-00" className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.address")}</label>
              <input value={profile.addressLine1} onChange={(e) => setField("addressLine1", e.target.value)} placeholder={t("pat.addressPlaceholder")} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.city")}</label>
                <input value={profile.city} onChange={(e) => setField("city", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.state")}</label>
                <input value={profile.state} onChange={(e) => setField("state", e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.country")}</label>
                <input value={profile.country} onChange={(e) => setField("country", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("pat.zip")}</label>
                <input value={profile.zipCode} onChange={(e) => setField("zipCode", e.target.value)} className={inputClass} />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
            >
              {profileSaving && <Loader2 size={15} className="animate-spin" />}
              {profileSaving ? t("acct.saving") : t("common.save")}
            </button>
          </form>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Lock size={18} className="text-emerald-500" /> {t("acct.changePassword")}
        </h2>

        {pwdSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} className="shrink-0" /> {t("acct.pwdSuccess")}
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" /> {pwdError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.currentPwd")}</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass + " pr-12"}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newPwd")}</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass + " pr-12"}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPwd && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <div key={rule.key} className="flex items-center gap-2">
                    <CheckCircle2
                      size={12}
                      className={rule.test(newPwd) ? "text-emerald-500" : "text-slate-300"}
                    />
                    <span className={`text-xs ${rule.test(newPwd) ? "text-emerald-600" : "text-slate-400"}`}>
                      {t(rule.key)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.confirmPwd")}</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
            {confirmPwd && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">{t("acct.pwdNoMatch")}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pwdLoading || !isPasswordValid || !passwordsMatch || !currentPwd}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
          >
            {pwdLoading && <Loader2 size={15} className="animate-spin" />}
            {pwdLoading ? t("acct.saving") : t("acct.changePasswordBtn")}
          </button>
        </form>
      </div>

      {/* Change email */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Mail size={18} className="text-emerald-500" /> {t("acct.changeEmail")}
        </h2>

        {emailSuccess ? (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">{t("acct.emailSentTitle")}</p>
              <p className="text-xs text-emerald-600 mt-1">{t("acct.emailSentText")}</p>
            </div>
          </div>
        ) : (
          <>
            {emailError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" /> {emailError}
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newEmail")}</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                  placeholder="new@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  {t("acct.confirmWithPwd")}
                </label>
                <div className="relative">
                  <input
                    type={showEmailPwd ? "text" : "password"}
                    value={emailPwd}
                    onChange={(e) => setEmailPwd(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass + " pr-12"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPwd(!showEmailPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEmailPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={emailLoading || !newEmail}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
              >
                {emailLoading && <Loader2 size={15} className="animate-spin" />}
                {emailLoading ? t("acct.sending") : t("acct.sendVerification")}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("acct.signOut")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.signOutDesc")}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition"
        >
          <LogOut size={15} /> {t("acct.signOut")}
        </button>
      </div>
    </div>
  );
}
