"use client";

import {
  useLoginLang,
  LoginPageShell,
  LoginLanguageSelector,
  LoginHeader,
  LoginCard,
  LoginSuspenseFallback,
} from "@/components/auth/login-shared";
import type { LoginAccent } from "@/lib/auth-portals";

export function ForgotPasswordLayout({
  accent,
  children,
}: {
  accent: LoginAccent;
  children: React.ReactNode;
}) {
  const { lang, changeLang } = useLoginLang();

  return (
    <LoginPageShell accent={accent}>
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent={accent} />
      <LoginHeader accent={accent} />
      <LoginCard>{children}</LoginCard>
    </LoginPageShell>
  );
}

export function ForgotPasswordSuspenseFallback({ accent = "emerald" }: { accent?: LoginAccent }) {
  return <LoginSuspenseFallback accent={accent} />;
}
