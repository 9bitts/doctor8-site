"use client";

import { Suspense } from "react";
import EmployerPsychologistLoginForm from "@/components/employer/EmployerPsychologistLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function EmpresasPsicologoLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="violet" />}>
      <EmployerPsychologistLoginForm />
    </Suspense>
  );
}
