"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { PublicReviewDto } from "@/lib/public-reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          fill={n <= rating ? "currentColor" : "none"}
          className={n <= rating ? "" : "text-slate-200"}
        />
      ))}
    </span>
  );
}

export default function PublicReviewsSection({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PublicReviewDto[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/professionals/${slug}/reviews`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setAvg(data.avg ?? null);
          setCount(data.count ?? 0);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
        <Loader2 size={16} className="animate-spin" />
        {t("pubReviews.loading")}
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <section className="border-t border-slate-100 pt-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">{t("pubReviews.title")}</h2>
        {avg != null && (
          <div className="flex items-center gap-2 text-sm">
            <Stars rating={Math.round(avg)} />
            <span className="font-bold text-slate-800">{avg.toFixed(1)}</span>
            <span className="text-slate-400">({count})</span>
          </div>
        )}
      </div>

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">{r.patientLabel}</span>
              <Stars rating={r.rating} />
            </div>
            {r.comment && (
              <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
            )}
            <p className="text-[11px] text-slate-400">
              {new Date(r.createdAt).toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
