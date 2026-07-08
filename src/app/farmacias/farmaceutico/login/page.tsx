"use client";

import { Suspense } from "react";
import PharmacyStorePharmacistLoginForm from "@/components/pharmacy-store/PharmacyStorePharmacistLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function FarmaciasFarmaceuticoLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="teal" />}>
      <PharmacyStorePharmacistLoginForm />
    </Suspense>
  );
}
