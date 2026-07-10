"use client";

import { Check, AlertTriangle } from "lucide-react";
import type { AdminJourneyStep, AdminJourneyStepKey } from "@/lib/admin/patient-journey";

const STEP_ORDER: AdminJourneyStepKey[] = [
  "acura_form",
  "acura_triage",
  "d8_register",
  "d8_triage",
  "d8_tcle",
  "d8_anamnese",
  "d8_queue",
  "d8_consult",
];

function visibleSteps(steps: AdminJourneyStep[]): AdminJourneyStep[] {
  return steps.filter((s) => s.state !== "skipped");
}

function dotClass(state: AdminJourneyStep["state"], active: boolean): string {
  if (state === "completed") return "bg-emerald-500 text-white border-emerald-500";
  if (state === "stuck") return "bg-rose-100 text-rose-700 border-rose-400";
  if (active) return "bg-brand-50 text-brand-700 border-brand-400";
  return "bg-slate-100 text-slate-400 border-slate-200";
}

export default function PatientJourneyStepper({
  steps,
  currentStep,
}: {
  steps: AdminJourneyStep[];
  currentStep: AdminJourneyStepKey;
}) {
  const visible = visibleSteps(steps);
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <nav aria-label="Jornada do paciente" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-0.5 min-w-max pb-1">
        {visible.map((step, i) => {
          const stepIdx = STEP_ORDER.indexOf(step.key);
          const done = step.state === "completed";
          const stuck = step.state === "stuck";
          const active =
            step.key === currentStep ||
            (step.state === "in_progress" && stepIdx === currentIdx);

          return (
            <li key={step.key} className="flex items-center gap-0.5">
              <div className="flex flex-col items-center gap-1 min-w-[72px] max-w-[88px]">
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${dotClass(step.state, active)}`}
                  title={
                    step.completedAt
                      ? new Date(step.completedAt).toLocaleString("pt-BR")
                      : undefined
                  }
                >
                  {stuck ? (
                    <AlertTriangle size={12} />
                  ) : done ? (
                    <Check size={12} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium text-center leading-tight ${
                    active
                      ? "text-brand-700"
                      : done
                        ? "text-slate-600"
                        : stuck
                          ? "text-rose-700"
                          : "text-slate-400"
                  }`}
                >
                  {step.shortLabel}
                </span>
              </div>
              {i < visible.length - 1 && (
                <div
                  className={`h-px w-4 sm:w-6 mb-4 ${
                    done ? "bg-emerald-500/60" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
