"use client";

// src/components/TourGuide.tsx
// Guided onboarding tour — works for both patient and professional dashboards.
// - Shows automatically on first visit (localStorage flag per role)
// - Persistent "?" button to replay the tour anytime
// - Dark overlay with spotlight on the target element
// - Trilingual (PT/EN/ES)
// - Mobile friendly (scrolls to element, adjusts tooltip position)

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, HelpCircle, CheckCircle2 } from "lucide-react";

export interface TourStep {
  // CSS selector or element id to highlight (null = center screen)
  target: string | null;
  titleKey: string;
  bodyKey: string;
  // Where to show the tooltip relative to the target
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface TourGuideProps {
  steps: TourStep[];
  texts: Record<string, Record<string, string>>; // key -> lang -> text
  lang: string;
  storageKey: string; // unique key per role e.g. "doctor8.tour.patient"
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

  const [active,  setActive]  = useState(false);
  const [step,    setStep]    = useState(0);
  const [rect,    setRect]    = useState<Rect | null>(null);
  const [tipPos,  setTipPos]  = useState({ top: 0, left: 0, maxW: 320 });
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => texts[key]?.[l] ?? texts[key]?.["en"] ?? key;

  // Auto-start on first visit
  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      setTimeout(() => startTour(), 800);
    }
  }, []);

  const measureTarget = useCallback((stepIndex: number) => {
    const target = steps[stepIndex]?.target;
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(target);
    if (!el) { setRect(null); return; }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    }, 400);
  }, [steps]);

  const computeTooltipPos = useCallback((r: Rect | null, placement?: string) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight + window.scrollY;
    const tw = Math.min(340, vw - 32);

    if (!r || placement === "center") {
      setTipPos({ top: window.scrollY + window.innerHeight / 2 - 80, left: vw / 2 - tw / 2, maxW: tw });
      return;
    }

    const p = placement || "bottom";
    let top = 0; let left = 0;

    if (p === "bottom") {
      top  = r.top + r.height + 16;
      left = Math.max(16, Math.min(r.left, vw - tw - 16));
    } else if (p === "top") {
      top  = r.top - 160;
      left = Math.max(16, Math.min(r.left, vw - tw - 16));
    } else if (p === "right") {
      top  = r.top + r.height / 2 - 60;
      left = Math.min(r.left + r.width + 16, vw - tw - 16);
    } else if (p === "left") {
      top  = r.top + r.height / 2 - 60;
      left = Math.max(16, r.left - tw - 16);
    }

    // Keep within viewport vertically
    top = Math.max(window.scrollY + 16, Math.min(top, vh - 200));
    setTipPos({ top, left, maxW: tw });
  }, []);

  useEffect(() => {
    if (!active) return;
    measureTarget(step);
  }, [active, step, measureTarget]);

  useEffect(() => {
    if (!active || !visible) return;
    computeTooltipPos(rect, steps[step]?.placement);
  }, [rect, active, step, visible, computeTooltipPos, steps]);

  useEffect(() => {
    if (!active) return;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [step, active]);

  function startTour() {
    setStep(0);
    setActive(true);
    setVisible(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
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
      {/* Replay button — always visible */}
      <button
        onClick={startTour}
        title={BUTTON_LABEL[l]}
        className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition"
      >
        <HelpCircle size={20} />
      </button>

      {active && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            {rect && (
              <div
                className="absolute rounded-xl"
                style={{
                  top:    rect.top  - PADDING,
                  left:   rect.left - PADDING,
                  width:  rect.width  + PADDING * 2,
                  height: rect.height + PADDING * 2,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  background: "transparent",
                  border: "2px solid rgba(52,211,153,0.8)",
                }}
              />
            )}
          </div>

          {/* Click blocker */}
          <div className="fixed inset-0 z-50" onClick={(e) => e.stopPropagation()} />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className={`fixed z-[60] transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            style={{ top: tipPos.top, left: tipPos.left, width: tipPos.maxW }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-emerald-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Step dots */}
                  <div className="flex gap-1">
                    {steps.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === step ? "bg-emerald-300 w-4" : i < step ? "bg-emerald-500" : "bg-white/30"}`} />
                    ))}
                  </div>
                  <span className="text-white/60 text-xs ml-1">{step + 1} {STEP_OF[l]} {steps.length}</span>
                </div>
                <button onClick={finish} className="text-white/60 hover:text-white transition">
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{t(current.titleKey)}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{t(current.bodyKey)}</p>
              </div>

              {/* Footer */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <button
                  onClick={finish}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  {SKIP[l]}
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition"
                    >
                      <ChevronLeft size={13} /> {PREV[l]}
                    </button>
                  )}
                  <button
                    onClick={next}
                    className={`flex items-center gap-1 text-xs font-semibold text-white px-4 py-1.5 rounded-lg transition ${step === steps.length - 1 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-800 hover:bg-slate-700"}`}
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
        </>
      )}
    </>
  );
}
