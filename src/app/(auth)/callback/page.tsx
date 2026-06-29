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
import { AuthLogo } from "@/components/auth/auth-logo";

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const { t } = useLoginLang();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishCallback() {
      await fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

      const session = await waitForAuthenticatedSession();
      if (cancelled) return;

      if (!session?.user?.role) {
        setTimedOut(true);
        navigateAfterAuth(`${PATIENT_LOGIN}?error=SessionTimeout`);
        return;
      }

      const savedCallback = consumeAuthCallback();
      const destination = safePostLoginUrl(
        session.user.role,
        savedCallback,
        resolvePatientPostLoginUrl,
        session.user.professionalSpecialty,
      );
      const fallback = resolveRoleHome(session.user.role, session.user.professionalSpecialty);
      const target =
        destination === "/callback" || destination.startsWith("/callback?")
          ? fallback
          : destination;

      navigateAfterAuth(target);
    }

    finishCallback().catch(() => {
      if (!cancelled) {
        navigateAfterAuth(`${PATIENT_LOGIN}?error=SessionTimeout`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LoginPageShell accent="emerald">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden />
        </div>
        <AuthLogo className="h-10 w-auto mx-auto mix-blend-screen mb-4" />
        <p className="text-slate-400 text-sm" role="status">
          {timedOut ? t("login.genericError") : t("login.callbackSigningIn")}
        </p>
      </div>
    </LoginPageShell>
  );
}
