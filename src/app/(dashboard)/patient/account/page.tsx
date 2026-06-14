"use client";

// src/app/(dashboard)/patient/account/page.tsx
// Account settings: change password + change email. i18n via useT().

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Lock, Mail, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, LogOut, Shield,
} from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition";

export default function AccountPage() {
  const t = useT();

  const PASSWORD_RULES = [
    { key: "acct.rule8", test: (p: string) => p.length >= 8 },
    { key: "acct.ruleUpper", test: (p: string) => /[A-Z]/.test(p) },
    { key: "acct.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
    { key: "acct.ruleSpecial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const [currentEmail, setCurrentEmail] = useState("");

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

  const isPasswordValid = PASSWORD_RULES.every((r) => r.test(newPwd));
  const passwordsMatch = newPwd === confirmPwd;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.email) setCurrentEmail(s.user.email);
      });
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("acct.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("acct.subtitle")}</p>
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
