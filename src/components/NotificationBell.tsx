"use client";

// src/components/NotificationBell.tsx
// The dashboard bell: shows unread count and a dropdown with recent notifications.
// Polls every 20s. Marking as read updates the badge.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  formatNotificationTimeAgo,
  localizeNotification,
} from "@/lib/notification-i18n";
import {
  isExternalHref,
  resolveNotificationHref,
  type NotificationRole,
} from "@/lib/notification-links";

interface Notif {
  id: string;
  title: string;
  body: string;
  type: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [role, setRole] = useState<NotificationRole>("PATIENT");
  const [professionalSpecialty, setProfessionalSpecialty] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = await res.json();
      setNotifs(d.notifications || []);
      setUnread(d.unreadCount || 0);
    } catch {
      // silent — bell just won't update this cycle
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const r = s?.user?.role;
        if (r === "PATIENT" || r === "PROFESSIONAL" || r === "ADMIN") setRole(r);
        setProfessionalSpecialty(s?.user?.professionalSpecialty ?? null);
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      /* ignore */
    }
  }

  async function markOneRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* ignore */
    }
  }

  async function handleNotifClick(n: Notif) {
    const href = resolveNotificationHref(n.type, n.data, role, professionalSpecialty);
    if (!n.readAt) await markOneRead(n.id);
    setOpen(false);
    if (!href) return;
    if (isExternalHref(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread > 0) markAllRead();
        }}
        className="relative text-slate-400 hover:text-slate-600 transition p-2 rounded-xl hover:bg-slate-100"
        aria-label={t("notif.bell.aria")}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">{t("notif.bell.title")}</p>
            {notifs.some((n) => !n.readAt) && (
              <button
                onClick={markAllRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <Check size={12} /> {t("notif.bell.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto overflow-x-hidden">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 text-sm">
                {t("notif.bell.empty")}
              </div>
            ) : (
              notifs.map((n) => {
                const href = resolveNotificationHref(n.type, n.data, role, professionalSpecialty);
                const clickable = Boolean(href);
                const localized = localizeNotification(n, t, lang);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotifClick(n)}
                    disabled={!clickable}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 transition ${
                      n.readAt ? "bg-white" : "bg-emerald-50/50"
                    } ${clickable ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.readAt && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{localized.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2">{localized.body}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatNotificationTimeAgo(n.createdAt, t)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
