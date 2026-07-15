"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { formatEin, stripEin, isValidEin } from "@/lib/us-ein";
import { buildRegisterSuccessHref } from "@/lib/auth-portals";
import { DISTRIBUTOR_LOGIN } from "@/lib/distributor-portal";
import { existingAccountMessage, registerSuccessFollowUp } from "@/lib/auth-flow-errors";
import { RegisterLogo } from "@/components/auth/register-shared";
import InternationalPhoneInput, { type InternationalPhoneValue } from "@/components/InternationalPhoneInput";
import { validateRegistrationPhone } from "@/lib/international-phone";
import { Eye, EyeOff, Loader2, AlertCircle, Package, ArrowLeft } from "lucide-react";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  return "en";
}

export default function DistribuidoresCadastroPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const t = (key: string) => translate(lang, key);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [ein, setEin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [brandAlias, setBrandAlias] = useState("Zephra");
  const [responsibleFirstName, setResponsibleFirstName] = useState("");
  const [responsibleLastName, setResponsibleLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState<InternationalPhoneValue>({ ddi: "1", nationalNumber: "" });
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedLgpd) return;

    if (!isValidEin(ein)) {
      setErrors({ ein: ["Invalid EIN (XX-XXXXXXX)"] });
      return;
    }

    const phoneCheck = validateRegistrationPhone(phone.ddi, phone.nationalNumber);
    if (!phoneCheck.ok) {
      setErrors({ phoneNational: ["Invalid phone"] });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register-distributor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ein: stripEin(ein),
          legalName,
          tradeName,
          brandAlias: brandAlias.trim() || undefined,
          responsibleFirstName,
          responsibleLastName,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
          addressStreet,
          addressNumber,
          addressCity,
          addressState: addressState.trim().toUpperCase(),
          addressZip,
          language: lang,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedLgpd: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.error || { general: ["Registration failed"] });
        return;
      }
      const followUp = registerSuccessFollowUp(data);
      if (followUp.kind === "existingAccount") {
        setErrors({ email: [existingAccountMessage(lang)] });
        return;
      }
      const emailSent =
        followUp.kind === "verify" ? followUp.emailSent : data.emailSent !== false;
      router.push(
        buildRegisterSuccessHref({
          role: "DISTRIBUTOR",
          email,
          callbackUrl: "/distribuidores/painel",
          emailSent,
        }),
      );
    } catch {
      setErrors({ general: ["Connection error"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/distribuidores" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>

        <RegisterLogo />
        <div className="mt-6 mb-2 flex items-center gap-2 text-sky-400">
          <Package size={20} />
          <span className="font-semibold">US distributor registration</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Join Doctor8 as a supplier</h1>
        <p className="mb-8 text-sm text-slate-400">
          For Zephra and other US companies shipping D2C after Anvisa clearance. Account starts as pending review.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <p className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle size={14} /> {errors.general[0]}
            </p>
          )}

          <label className="block">
            <span className="text-sm text-slate-300">EIN</span>
            <input
              value={ein}
              onChange={(e) => setEin(formatEin(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              placeholder="12-3456789"
              required
            />
            {errors.ein && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-400">
                <AlertCircle size={14} /> {errors.ein[0]}
              </p>
            )}
          </label>

          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Legal company name"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />
          <input
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Trade / DBA name"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />
          <input
            value={brandAlias}
            onChange={(e) => setBrandAlias(e.target.value)}
            placeholder="Brand (e.g. Zephra)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={responsibleFirstName}
              onChange={(e) => setResponsibleFirstName(e.target.value)}
              placeholder="First name"
              required
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            />
            <input
              value={responsibleLastName}
              onChange={(e) => setResponsibleLastName(e.target.value)}
              placeholder="Last name"
              required
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Work email"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />
          {errors.email && (
            <p className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle size={14} /> {errors.email[0]}
            </p>
          )}

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+, upper, number, symbol)"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <InternationalPhoneInput value={phone} onChange={setPhone} lang={lang} />
          {errors.phoneNational && (
            <p className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle size={14} /> {errors.phoneNational[0]}
            </p>
          )}

          <div className="space-y-3 border-t border-slate-800 pt-4">
            <p className="text-sm font-medium text-slate-400">US address (recommended)</p>
            <input
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              placeholder="Street"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="No."
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              />
              <input
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                placeholder="City"
                className="col-span-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={addressState}
                onChange={(e) => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="State (FL)"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
                maxLength={2}
              />
              <input
                value={addressZip}
                onChange={(e) => setAddressZip(e.target.value)}
                placeholder="ZIP"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
              <span>I accept the Terms of Use</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} className="mt-1" />
              <span>I accept the Privacy Policy</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptedLgpd} onChange={(e) => setAcceptedLgpd(e.target.checked)} className="mt-1" />
              <span>I acknowledge LGPD / data processing for platform operations</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptedTerms || !acceptedPrivacy || !acceptedLgpd}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 font-semibold hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            Create distributor account
          </button>

          <p className="text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href={DISTRIBUTOR_LOGIN} className="text-sky-400 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="sr-only">{t("nav.dashboard")}</p>
        </form>
      </div>
    </div>
  );
}
