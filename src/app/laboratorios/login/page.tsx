"use client";

import { Suspense } from "react";
import LaboratoryLoginForm from "@/components/laboratory/LaboratoryLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function LaboratoriosLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="violet" />}>
      <LaboratoryLoginForm />
    </Suspense>
  );
}
