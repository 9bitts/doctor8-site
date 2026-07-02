"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession, getSession } from "next-auth/react";
import {
  isProfileExemptRole,
} from "@/lib/user-profile-complete";
import {
  Loader2,
  AlertCircle,
  User,
  Stethoscope,
  Brain,
  Leaf,
} from "lucide-react";
import {
  detectInitialLang,
  LANG_KEY,
  RegisterLanguageSelector,
  RegisterLogo,
  type RegisterRole,
} from "@/components/auth/register-shared";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import InternationalPhoneInput, {
  type InternationalPhoneValue,
} from "@/components/InternationalPhoneInput";
import {
  defaultDdiForRegion,
  validateRegistrationPhone,
} from "@/lib/international-phone";
import { defaultRegistrationRegionForLang, type RegistrationRegionCode } from "@/lib/registration-regions";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { persistAuthCallback } from "@/lib/auth-callback";
import { resolveRoleHome } from "@/lib/role-home";

type RoleChoice =
  | { role: "PATIENT" }
  | { role: "PROFESSIONAL"; professionalKind?: undefined }
  | { role: "PROFESSIONAL"; professionalKind: "psychologist" }
  | { role: "PSYCHOANALYST" }
  | { role: "INTEGRATIVE_THERAPIST" };

function choiceKey(choice: RoleChoice): string {
  if (choice.role === "PROFESSIONAL" && choice.professionalKind === "psychologist") {
    return "psychologist";
  }
  return choice.role;
}

const ROLE_OPTIONS: RoleChoice[] = [
  { role: "PATIENT" },
  { role: "PROFESSIONAL" },
  { role: "PROFESSIONAL", professionalKind: "psychologist" },
  { role: "PSYCHOANALYST" },
  { role: "INTEGRATIVE_THERAPIST" },
];

function roleChoiceFromUserRole(role: string): RoleChoice {
  if (role === "PSYCHOANALYST") return { role: "PSYCHOANALYST" };
  if (role === "INTEGRATIVE_THERAPIST") return { role: "INTEGRATIVE_THERAPIST" };
  if (role === "PROFESSIONAL") return { role: "PROFESSIONAL" };
  return { role: "PATIENT" };
}

export default function SignupRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SignupRoleContent />
    </Suspense>
  );
}

function SignupRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus, update: updateSession } = useSession();

  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [selected, setSelected] = useState<RoleChoice>({ role: "PATIENT" });
  const [region] = useState<RegistrationRegionCode>(() =>
    defaultRegistrationRegionForLang(detectInitialLang()),
  );
  const [phone, setPhone] = useState<InternationalPhoneValue>({
    ddi: defaultDdiForRegion(defaultRegistrationRegionForLang(detectInitialLang())),
    nationalNumber: "",
  });
  const [error, setError] = useState<string | null>(null);

  const t = (key: string) => translate(lang, key);
  const isPhoneValid = validateRegistrationPhone(phone.ddi, phone.nationalNumber).ok;
  const phoneRequired = !(authenticated && needsCompletion);

  useEffect(() => {
    setLang(detectInitialLang());
  }, []);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/auth/signup-status");
        const data = await res.json();
        if (data.authenticated) {
          if (isProfileExemptRole(data.role)) {
            router.replace(resolveRoleHome(data.role));
            return;
          }
          setAuthenticated(true);
          if (data.needsCompletion) {
            setNeedsCompletion(true);
            if (data.role) {
              setSelected(roleChoiceFromUserRole(data.role));
            }
          } else {
            const session = await getSession();
            router.replace(
              resolveRoleHome(
                session?.user?.role,
                session?.user?.professionalSpecialty,
              ),
            );
            return;
          }
        }
      } catch {
        /* unauthenticated flow */
      } finally {
        setLoading(false);
      }
    }

    if (sessionStatus !== "loading") {
      loadStatus();
    }
  }, [sessionStatus, router]);

  function changeLang(next: Lang) {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function optionLabel(choice: RoleChoice): string {
    if (choice.role === "PROFESSIONAL" && choice.professionalKind === "psychologist") {
      return t("signup.role.psychologist");
    }
    if (choice.role === "PROFESSIONAL") return t("signup.role.professional");
    if (choice.role === "PSYCHOANALYST") return t("signup.role.psychoanalyst");
    if (choice.role === "INTEGRATIVE_THERAPIST") return t("signup.role.integrative");
    return t("signup.role.patient");
  }

  function optionIcon(choice: RoleChoice) {
    if (choice.role === "PROFESSIONAL" && choice.professionalKind === "psychologist") {
      return <Brain className="w-5 h-5 text-violet-400 shrink-0" />;
    }
    if (choice.role === "PROFESSIONAL") return <Stethoscope className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (choice.role === "PSYCHOANALYST") return <Brain className="w-5 h-5 text-violet-400 shrink-0" />;
    if (choice.role === "INTEGRATIVE_THERAPIST") return <Leaf className="w-5 h-5 text-teal-400 shrink-0" />;
    return <User className="w-5 h-5 text-emerald-400 shrink-0" />;
  }

  async function handleCompleteSignup() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selected.role,
          professionalKind:
            selected.role === "PROFESSIONAL" && selected.professionalKind === "psychologist"
              ? "psychologist"
              : undefined,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("reg.genericError"));
        return;
      }
      await updateSession({ refreshProfileComplete: true });
      router.replace(data.redirectTo || "/patient");
    } catch {
      setError(t("reg.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleContinue() {
    if (!isPhoneValid) {
      setError(t("reg.phoneInvalid"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const intentRes = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selected.role as RegisterRole,
          professionalKind:
            selected.role === "PROFESSIONAL" && selected.professionalKind === "psychologist"
              ? "psychologist"
              : undefined,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
        }),
      });
      if (!intentRes.ok) {
        setError(t("reg.genericError"));
        setSubmitting(false);
        return;
      }
      const callbackUrl = searchParams.get("callbackUrl") || "/patient";
      persistAuthCallback(callbackUrl);
      const oauthCallback =
        selected.role === "PROFESSIONAL" && selected.professionalKind === "psychologist"
          ? "/callback?portal=psychologist"
          : "/callback";
      clearSensitiveClientState();
      await signIn("google", { callbackUrl: oauthCallback });
    } catch {
      setError(t("reg.genericError"));
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (authenticated && needsCompletion) {
      await handleCompleteSignup();
    } else {
      await handleGoogleContinue();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <RegisterLanguageSelector lang={lang} onChange={changeLang} />
        <RegisterLogo />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-2">{t("signup.role.title")}</h1>
          <p className="text-slate-400 text-sm mb-6">
            {authenticated && needsCompletion
              ? t("signup.role.subtitleComplete")
              : t("signup.role.subtitle")}
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {ROLE_OPTIONS.map((choice) => {
              const active = choiceKey(choice) === choiceKey(selected);
              return (
                <button
                  key={choiceKey(choice)}
                  type="button"
                  onClick={() => setSelected(choice)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  {optionIcon(choice)}
                  <span className="text-sm font-medium text-white">{optionLabel(choice)}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <InternationalPhoneInput
              lang={lang}
              dark
              region={region}
              value={phone}
              onChange={setPhone}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (phoneRequired && !isPhoneValid)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {authenticated && needsCompletion
              ? t("signup.role.completeSignup")
              : t("signup.role.continueGoogle")}
          </button>
        </div>
      </div>
    </div>
  );
}
