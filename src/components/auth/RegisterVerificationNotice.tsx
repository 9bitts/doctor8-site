"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";

export default function RegisterVerificationNotice({
  lang,
  className = "mb-6",
}: {
  lang: Lang;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/auth/sms-status")
      .then((r) => r.json())
      .then((d) => setShow(d.smsEnabled === false))
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 ${className}`}
      role="note"
    >
      <Mail className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" aria-hidden />
      <p className="text-blue-100/90 text-sm leading-relaxed">
        {translate(lang, "reg.emailVerifyNotice")}
      </p>
    </div>
  );
}
