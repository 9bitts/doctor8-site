"use client";

import {
  Brain, User, Gem, MessageCircle, Lightbulb, Users, BookOpen, Clock,
  Heart, RefreshCw, Flame,
} from "lucide-react";
import type { FreudEducationalContent } from "@/lib/freud-educational-content";

const CONCEPT_ICONS = [Brain, RefreshCw, Heart, Flame] as const;
const PROFESSION_DOTS = ["bg-rose-400", "bg-violet-500", "bg-amber-400"] as const;

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  iconClass = "bg-violet-100 text-violet-600",
}: {
  icon: React.ElementType;
  title: string;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={18} aria-hidden />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif leading-snug">{title}</h2>
    </div>
  );
}

export default function FreudLibraryContent({ content }: { content: FreudEducationalContent }) {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Intro */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50/80 to-violet-50 border border-rose-200/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={18} className="text-rose-500 shrink-0" aria-hidden />
          <h2 className="font-bold text-rose-800 text-lg">Fala comigo, Freud</h2>
        </div>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{content.introDesc}</p>
        <blockquote className="mt-4 border-l-4 border-rose-400 pl-4">
          <p className="text-sm sm:text-base text-slate-600 italic leading-relaxed">
            &ldquo;{content.introQuote}&rdquo;
          </p>
          <footer className="text-xs text-slate-500 mt-2">— Sigmund Freud</footer>
        </blockquote>
      </section>

      {/* What is psychoanalysis */}
      <SectionCard>
        <SectionHeading icon={Brain} title={content.whatIsTitle} iconClass="bg-rose-100 text-rose-600" />
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{content.whatIsBody}</p>
        <div className="mt-4 bg-rose-50/80 border border-rose-100 rounded-xl p-4 sm:p-5">
          <p className="text-sm sm:text-base text-slate-700 italic leading-relaxed">
            &ldquo;{content.whatIsQuote}&rdquo; — Sigmund Freud
          </p>
          <p className="text-sm font-semibold text-rose-900 mt-3">{content.whatIsEssence}</p>
        </div>
      </SectionCard>

      {/* About Freud */}
      <SectionCard>
        <SectionHeading icon={User} title={content.aboutTitle} />
        <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          <p>{content.aboutP1}</p>
          <p>{content.aboutP2}</p>
          <p>{content.aboutP3}</p>
        </div>
      </SectionCard>

      {/* 4 concepts */}
      <SectionCard>
        <SectionHeading icon={Gem} title={content.conceptsTitle} />
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">{content.conceptsIntro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {content.concepts.map((item, i) => {
            const Icon = CONCEPT_ICONS[i] ?? Brain;
            return (
              <div
                key={item.title}
                className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 flex flex-col"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-violet-600" aria-hidden />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">{item.body}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Method */}
      <SectionCard>
        <SectionHeading icon={MessageCircle} title={content.methodTitle} />
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">{content.methodIntro}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {content.methodItems.map((item, i) => (
            <div key={item.title} className="rounded-xl p-4 bg-violet-50/40 border border-violet-100/80">
              <div className="flex items-center gap-2 mb-2">
                {i === 0 ? (
                  <MessageCircle size={16} className="text-violet-600 shrink-0" aria-hidden />
                ) : (
                  <Lightbulb size={16} className="text-amber-500 shrink-0" aria-hidden />
                )}
                <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Professions */}
      <SectionCard className="bg-gradient-to-b from-amber-50/30 to-white">
        <SectionHeading icon={Users} title={content.professionsTitle} iconClass="bg-amber-100 text-amber-700" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {content.professions.map((prof, i) => (
            <div
              key={prof.title}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PROFESSION_DOTS[i] ?? "bg-slate-400"}`} />
                <h3 className="font-bold text-slate-900">{prof.title}</h3>
              </div>
              <div className="space-y-3 flex-1">
                {prof.fields.map((field) => (
                  <div key={field.label}>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">{field.label}</p>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-0.5">{field.body}</p>
                  </div>
                ))}
              </div>
              {prof.quote && (
                <blockquote className="mt-4 pt-4 border-t border-rose-100 bg-rose-50/60 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                    &ldquo;{prof.quote.text}&rdquo;
                  </p>
                  <footer className="text-xs text-slate-500 mt-2">— {prof.quote.author}</footer>
                </blockquote>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Timeline */}
      <SectionCard>
        <SectionHeading icon={Clock} title={content.timelineTitle} iconClass="bg-amber-100 text-amber-700" />
        <div className="space-y-6 sm:space-y-8">
          {content.timelineEras.map((era) => (
            <div key={era.title}>
              <h3 className="text-sm font-bold text-violet-800 uppercase tracking-wide mb-3 sm:mb-4">
                {era.title}
              </h3>
              <ol className="relative border-l-2 border-rose-200 ml-2 sm:ml-3 space-y-4">
                {era.events.map((event) => (
                  <li key={`${era.title}-${event.year}-${event.text.slice(0, 20)}`} className="relative pl-5 sm:pl-6">
                    <span
                      className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-rose-400 ring-4 ring-white"
                      aria-hidden
                    />
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                      <span className="text-sm font-bold text-rose-700 shrink-0 sm:w-12">{event.year}</span>
                      <p className="text-sm text-slate-600 leading-relaxed">{event.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Works */}
      <SectionCard>
        <SectionHeading icon={BookOpen} title={content.worksTitle} iconClass="bg-rose-100 text-rose-600" />
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-2.5">
          {content.works.map((work, i) => (
            <li key={`${work.year}-${work.title}`} className="flex items-start gap-2 text-sm">
              <span className="text-rose-500 font-bold shrink-0 w-6 text-right">{i + 1}.</span>
              <span className="text-slate-700 leading-snug">
                <span className="font-semibold text-slate-800">{work.year}</span>
                {" — "}
                {work.title}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs sm:text-sm text-slate-500 leading-relaxed bg-amber-50/80 border border-amber-100 rounded-xl p-4">
          {content.worksFootnote}
        </p>
      </SectionCard>
    </div>
  );
}
