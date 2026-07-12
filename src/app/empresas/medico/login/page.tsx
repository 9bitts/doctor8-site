"use client";

import { Suspense } from "react";
import OccupationalPhysicianLoginForm from "@/components/employer/OccupationalPhysicianLoginForm";
import { LoginSuspenseFallback } from "@/components/auth/login-shared";

export default function MedicoLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="teal" />}>
      <OccupationalPhysicianLoginForm />
    </Suspense>
  );
}
