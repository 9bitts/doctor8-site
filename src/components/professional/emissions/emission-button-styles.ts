/** Shared action button styles for emission cards (Prescriptions + patient chart). */

export const EMISSION_BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 min-h-8 w-full sm:w-auto sm:min-w-[5.5rem] px-3 py-1.5 text-xs font-semibold rounded-lg border transition disabled:opacity-50 whitespace-nowrap";

export const EMISSION_BTN_NEUTRAL = `${EMISSION_BTN_BASE} text-slate-600 hover:text-brand-600 border-slate-200 hover:border-brand-200 bg-white`;

export const EMISSION_BTN_MUTED = `${EMISSION_BTN_BASE} cursor-default`;

export const EMISSION_BTN_BRAND = `${EMISSION_BTN_MUTED} text-brand-600 border-brand-200 bg-brand-50`;

export const EMISSION_BTN_AMBER = `${EMISSION_BTN_MUTED} text-amber-700 border-amber-200 bg-amber-50`;

export const EMISSION_BTN_DOCTOR8 = `${EMISSION_BTN_BASE} text-white border-brand-600 bg-brand-500 hover:bg-brand-600`;

export const EMISSION_BTN_WHATSAPP = `${EMISSION_BTN_BASE} text-green-800 border-green-200 bg-green-50 hover:bg-green-100`;

export const EMISSION_BTN_FULL =
  "w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50";

export const EMISSION_ACTIONS_ROW = "mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-stretch";
