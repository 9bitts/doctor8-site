"use client";

import { Suspense } from "react";
import PharmacyStoreLoginForm from "@/components/pharmacy-store/PharmacyStoreLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function FarmaciasLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="emerald" />}>
      <PharmacyStoreLoginForm />
    </Suspense>
  );
}
