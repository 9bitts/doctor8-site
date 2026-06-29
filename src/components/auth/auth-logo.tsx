"use client";

import Image from "next/image";

export const AUTH_LOGO_PATH = "/branding/doctor8-logo.png";

/** White wordmark ? `mix-blend-screen` removes the dark plate on auth backgrounds. */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <Image
      src={AUTH_LOGO_PATH}
      alt="Doctor8"
      width={200}
      height={56}
      priority
      className={className ?? "h-10 w-auto mx-auto mix-blend-screen"}
    />
  );
}
