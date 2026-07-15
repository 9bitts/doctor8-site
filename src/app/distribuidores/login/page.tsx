"use client";

import { Suspense } from "react";
import DistributorLoginForm from "@/components/distributor/DistributorLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function DistribuidoresLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="sky" />}>
      <DistributorLoginForm />
    </Suspense>
  );
}
