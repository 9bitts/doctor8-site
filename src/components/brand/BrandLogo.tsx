"use client";

import Link from "next/link";
import { BRAND_LOGO_PATH, BRAND_LOGO_WHITE_PATH } from "@/lib/brand";

export { BRAND_LOGO_PATH, BRAND_LOGO_WHITE_PATH };

export type BrandLogoVariant = "on-dark" | "on-light";

const HEIGHT_CLASS = {
  sm: "h-6",
  md: "h-7",
  lg: "h-9",
} as const;

function LogoImg({
  size,
  src,
  className,
}: {
  size: keyof typeof HEIGHT_CLASS;
  src: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Doctor8"
      width={500}
      height={150}
      decoding="async"
      className={`w-auto ${HEIGHT_CLASS[size]} ${className}`.trim()}
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
  const src = variant === "on-dark" ? BRAND_LOGO_WHITE_PATH : BRAND_LOGO_PATH;
  return <LogoImg size={size} src={src} className={className} />;
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
