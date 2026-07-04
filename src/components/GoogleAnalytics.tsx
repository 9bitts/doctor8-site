"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  allowsAnalyticsPath,
  hasAnalyticsConsent,
} from "@/lib/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!GA_ID || !allowsAnalyticsPath(pathname)) {
      setEnabled(false);
      return;
    }

    function syncConsent() {
      setEnabled(hasAnalyticsConsent());
    }

    syncConsent();
    window.addEventListener("d8:cookie-consent", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("d8:cookie-consent", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, [pathname]);

  if (!GA_ID || !enabled || !allowsAnalyticsPath(pathname)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true, allow_google_signals: false });
        `}
      </Script>
    </>
  );
}
