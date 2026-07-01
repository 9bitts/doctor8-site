"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, LogIn, Heart,
} from "lucide-react";
import { translate, normalizeLang, LANGUAGES, Lang } from "@/lib/i18n/translations";
import RegistrationRegionSelect from "@/components/auth/RegistrationRegionSelect";
import { parseRegistrationRegion } from "@/lib/registration-regions";
import {
  detectInitialLang,
  LANG_KEY,
  Region,
  RegisterLanguageSelector,
  RegisterLogo,
} from "@/components/auth/register-shared";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { ANGEL_LOGIN, buildVerifyAccountHref } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import InternationalPhoneInput, {
  type InternationalPhoneValue,
} from "@/components/InternationalPhoneInput";
import { defaultDdiForRegion, validateRegistrationPhone } from "@/lib/international-phone";
import RegisterVerificationNotice from "@/components/auth/RegisterVerificationNotice";

const PASSWORD_RULES = [
  { key: "reg.rule8", test: (p: string) => p.length >= 8 },
  { key: "reg.ruleUpper", test: (p: string) => /[A-Z]/.test(p) },
  { key: "reg.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
  { key: "reg.ruleSpecial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const LANG_OPTIONS = ["pt", "en", "es"] as const;

export default function RegisterAngelPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  const [campaignSlug, setCampaignSlug] = useState(VENEZUELA_CAMPAIGN_SLUG);
  const [region, setRegion] = useState<Region>("BR");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<InternationalPhoneValue>({
    ddi: defaultDdiForRegion(region),
    nationalNumber: "",
  });
  const [profession, setProfession] = useState("");
  const [volunteerHelp, setVolunteerHelp] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [languages, setLanguages] = useState<string[]>(["pt"]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("campaign");
    if (c) setCampaignSlug(c);
    const r = params.get("region");
    if (r) {
      const parsed = parseRegistrationRegion(r, "BR");
      setRegion(parsed);
      setPhone((prev) => ({ ...prev, ddi: defaultDdiForRegion(parsed) }));
    }
    const langParam = params.get("lang");
    if (langParam) {
      const l = normalizeLang(langParam);
      setLang(l);
      try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { setLang(detectInitialLang()); }, []);

  const t = (key: string) => translate(lang, key);
  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const isPasswordValid = passwordStrength === PASSWORD_RULES.length;
  const isPhoneValid = validateRegistrationPhone(phone.ddi, phone.nationalNumber).ok;

  function handleRegionChange(next: Region) {
    setRegion(next);
    setPhone((prev) => ({ ...prev, ddi: defaultDdiForRegion(next) }));
  }
  const canSubmit =
    isPasswordValid &&
    acceptedTerms &&
    acceptedPrivacy &&
    languages.length > 0 &&
    isPhoneValid &&
    profession.trim().length > 0 &&
    volunteerHelp.trim().length > 0 &&
    !!certificate;

  const missingFields: string[] = [];
  if (!isPhoneValid) missingFields.push(t("angel.register.missing.phone"));
  if (!isPasswordValid) missingFields.push(t("angel.register.missing.password"));
  if (!profession.trim()) missingFields.push(t("angel.register.missing.profession"));
  if (!volunteerHelp.trim()) missingFields.push(t("angel.register.missing.volunteerHelp"));
  if (!certificate) missingFields.push(t("angel.register.missing.certificate"));
  if (!acceptedTerms || !acceptedPrivacy) missingFields.push(t("angel.register.missing.terms"));
  if (languages.length === 0) missingFields.push(t("angel.register.missing.languages"));

  const loginHref = buildAuthHref(ANGEL_LOGIN, {
    callbackUrl: "/humanitarian/angel",
  });

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErrors({});

    try {
      const form = new FormData();
      form.append("email", email);
      form.append("password", password);
      form.append("region", region);
      form.append("firstName", firstName);
      form.append("lastName", lastName);
      form.append("phoneDdi", phone.ddi);
      form.append("phoneNational", phone.nationalNumber);
      form.append("profession", profession.trim());
      form.append("volunteerHelp", volunteerHelp.trim());
      form.append("languages", JSON.stringify(languages));
      if (motivation) form.append("motivation", motivation);
      form.append("campaignSlug", campaignSlug);
      form.append("language", lang);
      form.append("acceptedTerms", "true");
      form.append("acceptedPrivacy", "true");
      if (certificate) form.append("certificate", certificate);

      const res = await fetch("/api/auth/register-angel", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.error || { general: [t("reg.regFailed")] });
        return;
      }
      router.push(
        buildVerifyAccountHref({
          email,
          callbackUrl: "/humanitarian/angel",
          from: ANGEL_LOGIN,
        }),
      );
    } catch {
      setErrors({ general: [t("reg.genericError")] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <RegisterLanguageSelector lang={lang} onChange={changeLang} accent="rose" />
        <RegisterLogo accent="rose" />
        <p className="text-rose-200/80 text-sm -mt-4 mb-8 text-center font-medium">{t("angel.register.subtitle")}</p>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Link
            href={loginHref}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-rose-500 hover:bg-rose-500/10 transition text-left group mb-6"
          >
            <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <LogIn className="w-7 h-7 text-rose-400" />
            </div>
            <p className="text-white font-semibold text-base">
              {t("reg.haveAccount")}{" "}
              <span className="text-rose-400">{t("reg.signIn")}</span>
            </p>
          </Link>

          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <Heart className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium text-rose-200">{t("angel.register.accountType")}</p>
          </div>

          <RegisterVerificationNotice lang={lang} />

          {errors.general && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{errors.general[0]}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.firstName")}</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.lastName")}</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email[0]}</p>}
            </div>

            <InternationalPhoneInput
              lang={lang}
              dark
              region={region}
              value={phone}
              onChange={setPhone}
              error={errors.phoneNational?.[0]}
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("angel.register.profession")}</label>
              <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} required
                placeholder={t("angel.register.professionPlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("angel.register.volunteerHelp")}</label>
              <textarea value={volunteerHelp} onChange={(e) => setVolunteerHelp(e.target.value)} rows={3} required
                placeholder={t("angel.register.volunteerHelpPlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("angel.register.certificate")}</label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                required
                onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-rose-500/20 file:text-rose-200 file:font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">{t("angel.register.certificateHint")}</p>
              {errors.certificate && <p className="text-red-400 text-xs mt-1">{errors.certificate[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("angel.register.languages")}</label>
              <div className="flex flex-wrap gap-2">
                {LANG_OPTIONS.map((code) => (
                  <button key={code} type="button" onClick={() => toggleLanguage(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      languages.includes(code)
                        ? "bg-rose-500 border-rose-500 text-white"
                        : "border-white/20 text-slate-400 hover:border-rose-400"
                    }`}>
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.region")}</label>
              <RegistrationRegionSelect
                value={region}
                onChange={handleRegionChange}
                lang={lang}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                optionClassName="bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("angel.register.motivation")}</label>
              <textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.password")}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-3 space-y-1">
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.key} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${rule.test(password) ? "text-rose-400" : "text-slate-600"}`} />
                      <span className={`text-xs ${rule.test(password) ? "text-rose-400" : "text-slate-500"}`}>{t(rule.key)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
              {t("angel.register.note")}
            </p>

            <div className="border-t border-white/10 pt-5 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-300">
                  {t("reg.acceptTerms")}{" "}
                  <Link href="/terms" className="text-rose-400 hover:underline" target="_blank">{t("reg.termsOfService")}</Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-300">
                  {t("reg.acceptPrivacy")}{" "}
                  <Link href="/privacy" className="text-rose-400 hover:underline" target="_blank">{t("reg.privacyPolicy")}</Link>
                </span>
              </label>
            </div>

            {!canSubmit && missingFields.length > 0 && !loading && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-amber-200 text-sm font-medium mb-2">{t("angel.register.missingPrefix")}</p>
                <ul className="list-disc list-inside space-y-1">
                  {missingFields.map((item) => (
                    <li key={item} className="text-amber-200/90 text-xs">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" disabled={loading || !canSubmit}
              className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t("reg.creating") : t("angel.register.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
