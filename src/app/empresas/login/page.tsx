"use client";

import { Suspense } from "react";
import EmployerLoginForm from "@/components/employer/EmployerLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function EmpresasLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="indigo" />}>
      <EmployerLoginForm />
    </Suspense>
  );
}
