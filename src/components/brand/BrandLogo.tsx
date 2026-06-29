"use client";

import Link from "next/link";
import { BRAND_LOGO_PATH } from "@/lib/brand";

export { BRAND_LOGO_PATH };

export type BrandLogoVariant = "on-dark" | "on-light";

const HEIGHT_CLASS = {
  sm: "h-6",
  md: "h-7",
  lg: "h-9",
} as const;

function LogoImg({
  size,
  className,
}: {
  size: keyof typeof HEIGHT_CLASS;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_PATH}
      alt="Doctor8"
      width={500}
      height={150}
      decoding="async"
      className={`w-auto ${HEIGHT_CLASS[size]} ${className}`.trim()}
    />
  );
}

export function BrandLogo({
  variant: _variant = "on-dark",
  size = "md",
  className = "",
}: {
  variant?: BrandLogoVariant;
  size?: keyof typeof HEIGHT_CLASS;
  className?: string;
  priority?: boolean;
}) {
  return <LogoImg size={size} className={className} />;
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
