"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PenLine, Smartphone, Loader2, CheckCircle2, AlertCircle, FlaskConical, Lock,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type SignConfig = {
  configured: boolean;
  provider: string | null;
  cpfMasked: string | null;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition";

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function DigitalSignSettings() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<SignConfig | null>(null);
  const [provider, setProvider] = useState<"BirdID" | "VIDaaS">("BirdID");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [testMsg, setTestMsg] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/professional/digital-sign");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.provider === "VIDaaS") setProvider("VIDaaS");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signTest = params.get("signTest");
    if (signTest === "success") {
      setTestMsg({ tone: "success", text: t("digSign.testSuccess") });
    } else if (signTest === "cancelled") {
      setTestMsg({ tone: "warning", text: t("digSign.testCancelled") });
    } else if (signTest === "error") {
      setTestMsg({ tone: "error", text: t("digSign.testError") });
    }
    if (signTest) {
      params.delete("signTest");
      const qs = params.toString();
      window.history.replaceState({}, "", `/professional/account${qs ? `?${qs}` : ""}#digital-sign`);
    }
    if (window.location.hash === "#digital-sign" || params.get("digitalSign") === "1") {
      requestAnimationFrame(() => {
        document.getElementById("digital-sign")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [t]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      setError(t("digSign.invalidCpf"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/digital-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, cpf: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("digSign.errSave"));
        return;
      }
      setSuccess(true);
      setCpf("");
      await load();
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError(t("digSign.errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestMsg(null);
    setTesting(true);
    try {
      const res = await fetch("/api/professional/digital-sign/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setTestMsg({ tone: "error", text: data.error || t("digSign.testError") });
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setTestMsg({ tone: "error", text: t("digSign.testError") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div id="digital-sign" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 scroll-mt-24">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <PenLine size={18} className="text-brand-500" /> {t("digSign.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("digSign.subtitle")}</p>
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-brand-700 flex items-center gap-2">
          <Smartphone size={15} /> {t("digSign.howTitle")}
        </p>
        <ol className="text-xs text-brand-600 space-y-1 list-decimal list-inside">
          <li>{t("digSign.step1")}</li>
          <li>{t("digSign.step2")}</li>
          <li>{t("digSign.step3")}</li>
          <li>{t("digSign.step4")}</li>
        </ol>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <>
          {config?.configured && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t("digSign.configured")}</p>
                <p className="text-xs mt-0.5">
                  {config.provider} ? CPF {config.cpfMasked}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> {t("digSign.saved")}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {testMsg && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-sm border ${
                testMsg.tone === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : testMsg.tone === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <AlertCircle size={16} className="shrink-0" />
              {testMsg.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("digSign.provider")}</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "BirdID" | "VIDaaS")}
                className={inputClass}
              >
                <option value="BirdID">{t("digSign.birdId")}</option>
                <option value="VIDaaS">{t("digSign.vidaas")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("digSign.cpf")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                placeholder="000.000.000-00"
                className={inputClass}
                required={!config?.configured}
              />
              <p className="text-xs text-slate-400 mt-1">{t("digSign.cpfHint")}</p>
            </div>
            <button
              type="submit"
              disabled={saving || cpf.replace(/\D/g, "").length !== 11}
              className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? t("acct.saving") : t("digSign.save")}
            </button>
          </form>

          {config?.configured && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-sm font-medium text-slate-700">{t("digSign.testTitle")}</p>
              <p className="text-xs text-slate-500">{t("digSign.testHint")}</p>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {testing ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
                {testing ? t("digSign.testOpening") : t("digSign.testBtn")}
                {!testing && <Lock size={13} className="opacity-60" />}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
