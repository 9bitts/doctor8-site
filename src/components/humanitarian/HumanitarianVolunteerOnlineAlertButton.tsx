"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import { buildAuthHref } from "@/components/auth/login-shared";
import { MAIN_LOGIN } from "@/lib/auth-portals";

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

export default function HumanitarianVolunteerOnlineAlertButton({
  lang,
  campaignSlug,
  userId,
  returnPath,
}: {
  lang: Lang;
  campaignSlug: string;
  userId: string | null;
  returnPath: string;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!userId) {
      setReady(true);
      return;
    }
    try {
      const res = await fetch(
        `/api/humanitarian/volunteer-alerts?campaignSlug=${encodeURIComponent(campaignSlug)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSubscribed(Boolean(data.subscribed));
      }
    } finally {
      setReady(true);
    }
  }, [campaignSlug, userId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function toggleSubscribe() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/humanitarian/volunteer-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug, active: !subscribed }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribed(Boolean(data.subscribed));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  if (!userId) {
    return (
      <Link
        href={buildAuthHref(MAIN_LOGIN, { callbackUrl: returnPath })}
        className="inline-flex items-center gap-2 text-xs font-semibold text-amber-200 hover:text-amber-100 underline underline-offset-2"
      >
        <Bell size={14} /> {t(lang, "hum.volunteerAlert.loginToSubscribe")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggleSubscribe()}
      className="inline-flex items-center gap-2 text-xs font-semibold text-amber-200 hover:text-amber-100 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : subscribed ? (
        <BellOff size={14} />
      ) : (
        <Bell size={14} />
      )}
      {subscribed ? t(lang, "hum.volunteerAlert.subscribed") : t(lang, "hum.volunteerAlert.subscribe")}
    </button>
  );
}
