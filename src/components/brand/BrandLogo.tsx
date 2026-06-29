"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_PATH } from "@/lib/brand";

export { BRAND_LOGO_PATH };

export type BrandLogoVariant = "on-dark" | "on-light";

const VARIANT_CLASS: Record<BrandLogoVariant, string> = {
  /** White wordmark on dark / gradient backgrounds */
  "on-dark": "mix-blend-screen",
  /** Dark wordmark on light backgrounds (inverts white-on-black PNG) */
  "on-light": "invert",
};

const HEIGHT_CLASS = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
} as const;

export function BrandLogo({
  variant = "on-dark",
  size = "md",
  className = "",
  priority = false,
}: {
  variant?: BrandLogoVariant;
  size?: keyof typeof HEIGHT_CLASS;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRAND_LOGO_PATH}
      alt="Doctor8"
      width={200}
      height={56}
      priority={priority}
      className={`w-auto ${HEIGHT_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`.trim()}
    />
  );
}

export function BrandLogoLink({
  href = "/",
  variant = "on-dark",
  size = "md",
  className = "",
  priority = false,
}: {
  href?: string;
  variant?: BrandLogoVariant;
  size?: keyof typeof HEIGHT_CLASS;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Doctor8">
      <BrandLogo variant={variant} size={size} className={className} priority={priority} />
    </Link>
  );
}
