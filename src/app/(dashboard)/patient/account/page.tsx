"use client";

// src/app/(dashboard)/patient/account/page.tsx
// Account settings: personal data (P1-e) + change password + change email. i18n via useT().
// P1-e: the "Personal data" section lets the patient fill/correct their own
// registration data (name, birth, phone, sex, CPF, address) — the same fields the
// prescription (CFM) needs. Encryption is handled server-side by the profile API.

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import RegistrationRegionSelect from "@/components/auth/RegistrationRegionSelect";
import {
  parseRegistrationRegion,
  type RegistrationRegionCode,
} from "@/lib/registration-regions";
import {
  Lock, Mail, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, LogOut, Shield, User, Globe,
} from "lucide-react";
import Link from "next/link";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import DataExportSection from "@/components/account/DataExportSection";
import IncompleteSectionHighlight, {
  incompleteFieldClass,
  incompleteInputClass,
} from "@/components/IncompleteSectionHighlight";
import { useRegistrationChecklist } from "@/hooks/useRegistrationChecklist";
import type { DataResidencyInfo } from "@/lib/data-residency";
import { DEFAULT_TIME_ZONE, listTimeZoneOptions } from "@/lib/timezone";

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
  const { lang } = useI18n();
  const pathname = usePathname();
  const { data: session } = useSession();
  const signOutHref = resolveLoginPathForSession(session?.user?.role, pathname);

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
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [profileLoadEpoch, setProfileLoadEpoch] = useState(0);
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
  const [accountRegion, setAccountRegion] = useState<RegistrationRegionCode>("BR");
  const [regionSaving, setRegionSaving] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);
  const [regionError, setRegionError] = useState("");
  const [dataResidency, setDataResidency] = useState<DataResidencyInfo | null>(null);
  const [accountTimezone, setAccountTimezone] = useState(DEFAULT_TIME_ZONE);
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneSaved, setTimezoneSaved] = useState(false);
  const [timezoneError, setTimezoneError] = useState("");
  const timeZoneOptions = listTimeZoneOptions();

  const { patientChecklist, refresh: refreshRegistration } = useRegistrationChecklist();
  const missingName = patientChecklist?.name === false;
  const missingDob = patientChecklist?.dateOfBirth === false;
  const missingAddress = patientChecklist?.address === false;
  const profileSectionIncomplete = missingName || missingDob || missingAddress;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [profileLoading]);

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
        if (d?.region) {
          setAccountRegion(parseRegistrationRegion(d.region, accountRegion));
        }
        if (d?.dataResidency) {
          setDataResidency(d.dataResidency);
        }
      })
      .catch(() => {});
    fetch("/api/user/timezone")
      .then((r) => r.json())
      .then((d) => {
        if (d?.timezone) setAccountTimezone(d.timezone);
      })
      .catch(() => {});
  }, []);

  // P1-e: load current personal data. A failed load must block the save
  // form, otherwise real data could be overwritten with an empty form.
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) { setProfileLoading(true); setProfileLoadError(false); }
      try {
        const res = await fetch("/api/patient/profile");
        if (!res.ok) {
          if (active) setProfileLoadError(true);
          return;
        }
        const data = await res.json();
        if (active && data.profile) {
          setProfile({ ...EMPTY_PROFILE, ...data.profile });
        }
      } catch {
        if (active) setProfileLoadError(true);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profileLoadEpoch]);

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
      await refreshRegistration();
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

  async function saveAccountTimezone() {
    setTimezoneSaving(true);
    setTimezoneError("");
    setTimezoneSaved(false);
    try {
      const res = await fetch("/api/user/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: accountTimezone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("acct.timezoneErr"));
      if (data.timezone) setAccountTimezone(data.timezone);
      setTimezoneSaved(true);
      setTimeout(() => setTimezoneSaved(false), 4000);
    } catch (e) {
      setTimezoneError(e instanceof Error ? e.message : t("acct.timezoneErr"));
    } finally {
      setTimezoneSaving(false);
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
      if (!res.ok) throw new Error(data.error || t("acct.regionErr"));
      setRegionSaved(true);
      if (data.region) {
        setAccountRegion(parseRegistrationRegion(data.region, accountRegion));
      }
      fetch("/api/user/region")
        .then((r) => r.json())
        .then((d) => {
          if (d?.dataResidency) setDataResidency(d.dataResidency);
        })
        .catch(() => {});
      setTimeout(() => setRegionSaved(false), 4000);
    } catch (e) {
      setRegionError(e instanceof Error ? e.message : t("acct.regionErr"));
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
          <Globe size={18} className="text-emerald-600" /> {t("acct.regionTitle")}
        </h2>
        <p className="text-sm text-slate-500">
          {t("acct.regionDesc")}
        </p>
        {regionError && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {regionError}
          </p>
        )}
        {regionSaved && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {t("acct.regionSaved")}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("acct.regionLabel")}</label>
            <RegistrationRegionSelect
              value={accountRegion}
              onChange={setAccountRegion}
              lang={lang}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={saveAccountRegion}
            disabled={regionSaving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0"
          >
            {regionSaving && <Loader2 size={14} className="animate-spin" />}
            {t("acct.regionSave")}
          </button>
        </div>
        {dataResidency && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {t("acct.dataResidencyTitle")}
            </p>
            <dl className="grid sm:grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <dt className="text-xs text-slate-500">{t("acct.dataResidencyDeploy")}</dt>
                <dd className="font-medium text-slate-800">{dataResidency.deployRegion}</dd>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <dt className="text-xs text-slate-500">{t("acct.dataResidencyStorage")}</dt>
                <dd className="font-medium text-slate-800">
                  {dataResidency.storageProvider} · {dataResidency.storageRegion}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Globe size={18} className="text-emerald-600" /> {t("acct.timezoneTitle")}
        </h2>
        <p className="text-sm text-slate-500">{t("acct.timezoneDesc")}</p>
        {timezoneError && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {timezoneError}
          </p>
        )}
        {timezoneSaved && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {t("acct.timezoneSaved")}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("acct.timezoneLabel")}</label>
            <select
              value={accountTimezone}
              onChange={(e) => setAccountTimezone(e.target.value)}
              className={inputClass}
            >
              {timeZoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={saveAccountTimezone}
            disabled={timezoneSaving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0"
          >
            {timezoneSaving && <Loader2 size={14} className="animate-spin" />}
            {t("acct.timezoneSave")}
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
      <IncompleteSectionHighlight
        id="patient-personal-data"
        incomplete={profileSectionIncomplete}
      >
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
        ) : profileLoadError ? (
          <div className="flex flex-col items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" /> {t("common.loadError")}
            </div>
            <button
              type="button"
              onClick={() => setProfileLoadEpoch((n) => n + 1)}
              className="text-sm font-semibold text-emerald-600"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div id="patient-name" className="grid grid-cols-2 gap-3 scroll-mt-24">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${incompleteFieldClass(missingName)}`}>{t("pat.firstName")}</label>
                <input value={profile.firstName} onChange={(e) => setField("firstName", e.target.value)} className={incompleteInputClass(missingName, inputClass)} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${incompleteFieldClass(missingName)}`}>{t("pat.lastName")}</label>
                <input value={profile.lastName} onChange={(e) => setField("lastName", e.target.value)} className={incompleteInputClass(missingName, inputClass)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div id="patient-dateOfBirth" className="scroll-mt-24">
                <label className={`block text-sm font-medium mb-1.5 ${incompleteFieldClass(missingDob)}`}>{t("pat.dob")}</label>
                <input type="date" value={profile.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} className={incompleteInputClass(missingDob, inputClass)} />
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

            <div id="patient-address" className="scroll-mt-24">
              <label className={`block text-sm font-medium mb-1.5 ${incompleteFieldClass(missingAddress)}`}>{t("pat.address")}</label>
              <input value={profile.addressLine1} onChange={(e) => setField("addressLine1", e.target.value)} placeholder={t("pat.addressPlaceholder")} className={incompleteInputClass(missingAddress, inputClass)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${incompleteFieldClass(missingAddress)}`}>{t("pat.city")}</label>
                <input value={profile.city} onChange={(e) => setField("city", e.target.value)} className={incompleteInputClass(missingAddress, inputClass)} />
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
      </IncompleteSectionHighlight>

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

      <PushNotificationSettings />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("acct.connectedApps")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.connectedAppsDesc")}</p>
        </div>
        <Link
          href="/patient/connected-apps"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 shrink-0"
        >
          {t("smart.consent.manageApps")} →
        </Link>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{t("acct.signOut")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.signOutDesc")}</p>
        </div>
        <button
          onClick={() => {
            clearSensitiveClientState();
            signOut({ callbackUrl: signOutHref });
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition min-h-[44px] shrink-0"
        >
          <LogOut size={15} /> {t("acct.signOut")}
        </button>
      </div>

      <DataExportSection />

      <DeleteAccountSection />
    </div>
  );
}
