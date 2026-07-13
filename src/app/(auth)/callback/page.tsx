"use client";

import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { resolveRoleHome, safePostLoginUrl } from "@/lib/role-home";
import { PATIENT_LOGIN } from "@/lib/auth-portals";
import {
  useLoginLang,
  LoginPageShell,
  LoginSuspenseFallback,
  waitForAuthenticatedSession,
  navigateAfterAuth,
} from "@/components/auth/login-shared";
import { sessionProfileIncomplete } from "@/lib/user-profile-complete";
import { AuthLogo } from "@/components/auth/auth-logo";

type CallbackFailure = "sessionTimeout" | "callbackFailed" | null;

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const { t } = useLoginLang();
  const [failure, setFailure] = useState<CallbackFailure>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishCallback() {
      await fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

      const session = await waitForAuthenticatedSession();
      if (cancelled) return;

      if (!session?.user?.role) {
        setFailure("sessionTimeout");
        navigateAfterAuth(`${PATIENT_LOGIN}?error=SessionTimeout`);
        return;
      }

      if (sessionProfileIncomplete(session.user)) {
        navigateAfterAuth("/signup/role");
        return;
      }

      const savedCallback = consumeAuthCallback();
      const destination = safePostLoginUrl(
        session.user.role,
        savedCallback,
        resolvePatientPostLoginUrl,
        session.user.professionalSpecialty,
        { humanitarianPatient: session.user.humanitarianPatient === true },
      );
      const fallback = resolveRoleHome(session.user.role, session.user.professionalSpecialty, {
        humanitarianPatient: session.user.humanitarianPatient === true,
      });
      const target =
        destination === "/callback" || destination.startsWith("/callback?")
          ? fallback
          : destination;

      navigateAfterAuth(target, session.user.role);
    }

    finishCallback().catch(() => {
      if (!cancelled) {
        setFailure("callbackFailed");
        navigateAfterAuth(`${PATIENT_LOGIN}?error=OAuthCallback`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusMessage =
    failure === "sessionTimeout"
      ? t("login.sessionTimeout")
      : failure === "callbackFailed"
        ? t("login.callbackFailed")
        : t("login.callbackSigningIn");

  return (
    <LoginPageShell accent="emerald">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden />
        </div>
        <AuthLogo className="mx-auto mb-4" />
        <p className="text-slate-400 text-sm" role="status">
          {statusMessage}
        </p>
      </div>
    </LoginPageShell>
  );
}
