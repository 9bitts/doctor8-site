"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  allowsAnalyticsPath,
  hasAnalyticsConsent,
  updateGoogleAnalyticsConsent,
} from "@/lib/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const active = Boolean(GA_ID && allowsAnalyticsPath(pathname));

  useEffect(() => {
    if (!active) return;

    function syncConsent() {
      updateGoogleAnalyticsConsent(hasAnalyticsConsent());
    }

    syncConsent();
    window.addEventListener("d8:cookie-consent", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("d8:cookie-consent", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, [active, pathname]);

  if (!active || !GA_ID) {
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
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500,
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            allow_google_signals: false,
            send_page_view: false,
          });
        `}
      </Script>
    </>
  );
}
