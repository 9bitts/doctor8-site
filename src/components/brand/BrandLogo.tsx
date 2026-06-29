"use client";

import Link from "next/link";
import { BRAND_LOGO_PATH } from "@/lib/brand";

export { BRAND_LOGO_PATH };

export type BrandLogoVariant = "on-dark" | "on-light";

const HEIGHT_CLASS = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
} as const;

function LogoImg({
  variant,
  size,
  className,
}: {
  variant: BrandLogoVariant;
  size: keyof typeof HEIGHT_CLASS;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_PATH}
      alt="Doctor8"
      width={200}
      height={56}
      decoding="async"
      className={`w-auto ${HEIGHT_CLASS[size]} ${variant === "on-light" ? "invert" : ""} ${className}`.trim()}
    />
  );
}

export function BrandLogo({
  variant = "on-dark",
  size = "md",
  className = "",
}: {
  variant?: BrandLogoVariant;
  size?: keyof typeof HEIGHT_CLASS;
  className?: string;
  priority?: boolean;
}) {
  if (variant === "on-dark") {
    return (
      <span className={`inline-flex items-center justify-center rounded-lg bg-black/60 px-3 py-1.5 ${className}`.trim()}>
        <LogoImg variant={variant} size={size} className="" />
      </span>
    );
  }

  return <LogoImg variant={variant} size={size} className={className} />;
}

export function BrandLogoLink({
  href = "/",
  variant = "on-dark",
  size = "md",
  className = "",
}: {
  href?: string;
  variant?: BrandLogoVariant;
  size?: keyof typeof HEIGHT_CLASS;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className={`inline-flex shrink-0 items-center ${className}`.trim()} aria-label="Doctor8">
      <BrandLogo variant={variant} size={size} />
    </Link>
  );
}
