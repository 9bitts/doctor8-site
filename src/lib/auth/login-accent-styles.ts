// Shared login/register accent class maps — safe for server and client components.

import type { LoginAccent } from "@/lib/auth-portals";

export const ACCENT_RING: Record<LoginAccent, string> = {
  emerald: "focus:ring-emerald-500/50",
  violet: "focus:ring-violet-500/50",
  teal: "focus:ring-teal-500/50",
  indigo: "focus:ring-indigo-500/50",
  rose: "focus:ring-rose-500/50",
  amber: "focus:ring-amber-500/50",
  sky: "focus:ring-sky-500/50",
};

export const ACCENT_BTN: Record<LoginAccent, string> = {
  emerald: "bg-emerald-500 hover:bg-emerald-400",
  violet: "bg-violet-500 hover:bg-violet-400",
  teal: "bg-teal-500 hover:bg-teal-400",
  indigo: "bg-indigo-600 hover:bg-indigo-500",
  rose: "bg-rose-500 hover:bg-rose-400",
  amber: "bg-amber-500 hover:bg-amber-400",
  sky: "bg-sky-500 hover:bg-sky-400",
};

export const ACCENT_LINK: Record<LoginAccent, string> = {
  emerald: "text-emerald-400 hover:text-emerald-300",
  violet: "text-violet-400 hover:text-violet-300",
  teal: "text-teal-400 hover:text-teal-300",
  indigo: "text-indigo-400 hover:text-indigo-300",
  rose: "text-rose-400 hover:text-rose-300",
  amber: "text-amber-400 hover:text-amber-300",
  sky: "text-sky-400 hover:text-sky-300",
};

export const ACCENT_LANG: Record<LoginAccent, string> = {
  emerald: "bg-emerald-500 text-white",
  violet: "bg-violet-500 text-white",
  teal: "bg-teal-500 text-white",
  indigo: "bg-indigo-600 text-white",
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-500 text-white",
  sky: "bg-sky-500 text-white",
};

export const GRADIENT: Record<LoginAccent, string> = {
  emerald: "from-slate-900 via-blue-950 to-slate-900",
  violet: "from-slate-900 via-violet-950 to-slate-900",
  teal: "from-slate-900 via-teal-950 to-slate-900",
  indigo: "from-slate-900 via-indigo-950 to-slate-900",
  rose: "from-slate-900 via-rose-950 to-slate-900",
  amber: "from-slate-900 via-amber-950 to-slate-900",
  sky: "from-slate-900 via-sky-950 to-slate-900",
};

export const BRAND_ACCENT: Record<LoginAccent, string> = {
  emerald: "text-emerald-400",
  violet: "text-violet-400",
  teal: "text-teal-400",
  indigo: "text-indigo-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

export const HEADER_ICON_WRAP: Record<LoginAccent, string> = {
  emerald: "bg-emerald-500/15 border-emerald-500/25",
  violet: "bg-violet-500/15 border-violet-500/25",
  teal: "bg-teal-500/15 border-teal-500/25",
  indigo: "bg-indigo-500/15 border-indigo-500/25",
  rose: "bg-rose-500/15 border-rose-500/25",
  amber: "bg-amber-500/15 border-amber-500/25",
  sky: "bg-sky-500/15 border-sky-500/25",
};

export const HEADER_ICON_COLOR: Record<LoginAccent, string> = {
  emerald: "text-emerald-400",
  violet: "text-violet-400",
  teal: "text-teal-400",
  indigo: "text-indigo-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

const SOFT_BG: Record<LoginAccent, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/20",
  violet: "bg-violet-500/10 border-violet-500/20",
  teal: "bg-teal-500/10 border-teal-500/20",
  indigo: "bg-indigo-500/10 border-indigo-500/20",
  rose: "bg-rose-500/10 border-rose-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
  sky: "bg-sky-500/10 border-sky-500/20",
};

const SOFT_TEXT: Record<LoginAccent, string> = {
  emerald: "text-emerald-400",
  violet: "text-violet-400",
  teal: "text-teal-400",
  indigo: "text-indigo-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

const SOFT_TEXT_MUTED: Record<LoginAccent, string> = {
  emerald: "text-emerald-300",
  violet: "text-violet-300",
  teal: "text-teal-300",
  indigo: "text-indigo-300",
  rose: "text-rose-300",
  amber: "text-amber-300",
  sky: "text-sky-300",
};

const CHECKBOX_CHECKED: Record<LoginAccent, string> = {
  emerald: "bg-emerald-500 border-emerald-500",
  violet: "bg-violet-500 border-violet-500",
  teal: "bg-teal-500 border-teal-500",
  indigo: "bg-indigo-600 border-indigo-600",
  rose: "bg-rose-500 border-rose-500",
  amber: "bg-amber-500 border-amber-500",
  sky: "bg-sky-500 border-sky-500",
};

export function getLoginAccentStyles(accent: LoginAccent) {
  return {
    langActive: ACCENT_LANG[accent],
    ring: ACCENT_RING[accent],
    btn: ACCENT_BTN[accent],
    link: ACCENT_LINK[accent],
    brand: BRAND_ACCENT[accent],
    iconWrap: HEADER_ICON_WRAP[accent],
    iconColor: HEADER_ICON_COLOR[accent],
    softBg: SOFT_BG[accent],
    softText: SOFT_TEXT[accent],
    softTextMuted: SOFT_TEXT_MUTED[accent],
    checkboxChecked: CHECKBOX_CHECKED[accent],
  };
}
