"use client";

// src/components/TourGuide.tsx
// Guided onboarding tour — works for both patient and professional dashboards.
// Tooltip is always centered on screen (avoids off-viewport placement on desktop sidebar).

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, HelpCircle, CheckCircle2 } from "lucide-react";

export interface TourStep {
  target: string | null;
  titleKey: string;
  bodyKey: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface TourGuideProps {
  steps: TourStep[];
  texts: Record<string, Record<string, string>>;
  lang: string;
  storageKey: string;
  onComplete?: () => void;
}

const BUTTON_LABEL: Record<string, string> = {
  pt: "Ver tour de introdução",
  en: "Take the intro tour",
  es: "Ver tour de introducción",
};
const NEXT: Record<string, string>   = { pt: "Próximo", en: "Next", es: "Siguiente" };
const PREV: Record<string, string>   = { pt: "Anterior", en: "Previous", es: "Anterior" };
const SKIP: Record<string, string>   = { pt: "Pular tour", en: "Skip tour", es: "Saltar tour" };
const FINISH: Record<string, string> = { pt: "Concluir", en: "Finish", es: "Finalizar" };
const STEP_OF: Record<string, string>= { pt: "de", en: "of", es: "de" };

interface Rect { top: number; left: number; width: number; height: number; }

export default function TourGuide({ steps, texts, lang, storageKey, onComplete }: TourGuideProps) {
  const l = lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en";

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);

  const t = (key: string) => texts[key]?.[l] ?? texts[key]?.["en"] ?? key;

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const measureTarget = useCallback((stepIndex: number) => {
    const target = steps[stepIndex]?.target;
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(target);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 400);
  }, [steps]);

  useEffect(() => {
    if (!active) return;
    measureTarget(step);
  }, [active, step, measureTarget]);

  useEffect(() => {
    if (!active) return;
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), 500);
    return () => window.clearTimeout(timer);
  }, [step, active]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function startTour() {
    setStep(0);
    setActive(true);
    setVisible(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function finish() {
    setActive(false);
    setVisible(false);
    localStorage.setItem(storageKey, "done");
    onComplete?.();
  }

  const current = steps[step];
  const PADDING = 10;

  return (
    <>
      <button
        onClick={startTour}
        title={BUTTON_LABEL[l]}
        className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-brand-500 hover:border-brand-200 transition"
      >
        <HelpCircle size={20} />
      </button>

      {active && (
        <>
          <div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            {rect && (
              <div
                className="absolute rounded-xl"
                style={{
                  top: rect.top - PADDING,
                  left: rect.left - PADDING,
                  width: rect.width + PADDING * 2,
                  height: rect.height + PADDING * 2,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  background: "transparent",
                  border: "2px solid rgba(52,211,153,0.8)",
                }}
              />
            )}
          </div>

          <div className="fixed inset-0 z-50" aria-hidden onClick={(e) => e.stopPropagation()} />

          {/* Tooltip — always centered, same as mobile */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className={`w-full max-w-sm pointer-events-auto transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-brand-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {steps.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition ${i === step ? "bg-accent-400 w-4" : i < step ? "bg-brand-400 w-1.5" : "bg-white/30 w-1.5"}`}
                        />
                      ))}
                    </div>
                    <span className="text-white/60 text-xs ml-1">
                      {step + 1} {STEP_OF[l]} {steps.length}
                    </span>
                  </div>
                  <button type="button" onClick={finish} className="text-white/60 hover:text-white transition" aria-label={SKIP[l]}>
                    <X size={16} />
                  </button>
                </div>

                <div className="px-5 py-4">
                  <h3 id="tour-title" className="font-bold text-slate-900 text-base mb-1.5">
                    {t(current.titleKey)}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{t(current.bodyKey)}</p>
                </div>

                <div className="px-5 pb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={finish}
                    className="text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    {SKIP[l]}
                  </button>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={prev}
                        className="flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        <ChevronLeft size={13} /> {PREV[l]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={next}
                      className={`flex items-center gap-1 text-xs font-semibold text-white px-4 py-1.5 rounded-lg transition ${step === steps.length - 1 ? "bg-brand-500 hover:bg-brand-600" : "bg-slate-800 hover:bg-slate-700"}`}
                    >
                      {step === steps.length - 1 ? (
                        <><CheckCircle2 size={13} /> {FINISH[l]}</>
                      ) : (
                        <>{NEXT[l]} <ChevronRight size={13} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
