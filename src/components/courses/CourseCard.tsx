"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Users } from "lucide-react";
import { formatPriceBrl } from "@/lib/courses/display";

export type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  professionLabel: string;
  specialty: string | null;
  priceCents: number;
  workloadHours: number | null;
  thumbnailUrl: string | null;
  enrollmentCount: number;
  instructor: { name: string; specialty: string | null };
};

export default function CourseCard({
  course,
  featured = false,
}: {
  course: CourseCardData;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-d8-border bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl ${
        featured ? "lg:col-span-2 lg:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-d8-off ${
          featured ? "lg:w-[44%] aspect-video lg:aspect-auto lg:min-h-[220px]" : "aspect-[16/10]"
        }`}
      >
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="text-brand-200" size={featured ? 56 : 40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-d8-dark/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-600 shadow-sm">
          {course.professionLabel}
        </span>
      </div>

      <div className={`flex flex-1 flex-col p-5 ${featured ? "lg:justify-center lg:p-7" : ""}`}>
        {course.specialty && (
          <p className="text-xs font-medium text-d8-muted">{course.specialty}</p>
        )}
        <h3
          className={`mt-1 font-bold leading-snug text-d8-dark group-hover:text-brand-600 ${
            featured ? "text-xl sm:text-2xl" : "text-base"
          }`}
        >
          {course.title}
        </h3>
        {course.shortDescription && (
          <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-d8-muted ${featured ? "line-clamp-3" : ""}`}>
            {course.shortDescription}
          </p>
        )}
        <p className="mt-3 text-xs text-d8-muted">{course.instructor.name}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-extrabold text-d8-dark">
              {course.priceCents === 0 ? "Grátis" : formatPriceBrl(course.priceCents)}
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-d8-muted">
              {course.workloadHours != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {course.workloadHours}h
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users size={12} />
                {course.enrollmentCount} alunos
              </span>
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition group-hover:bg-accent-500">
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}
