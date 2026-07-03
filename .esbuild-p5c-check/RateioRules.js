"use client";

// src/components/financeiro/RateioRules.tsx
import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
function pct(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value * 100);
}
function fmtRating(value) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
function fmtMult(value) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
function AccordionBlock({
  title,
  children,
  defaultOpen = false
}) {
  const [open, setOpen] = useState(defaultOpen);
  return /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-xl overflow-hidden bg-white" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setOpen((v) => !v),
      className: "w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
    },
    /* @__PURE__ */ React.createElement("span", null, title),
    /* @__PURE__ */ React.createElement(
      ChevronDown,
      {
        size: 18,
        className: `shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`
      }
    )
  ), open && /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4 text-sm text-slate-600 leading-relaxed" }, children));
}
function RateioRules({ rules, myProgress }) {
  const progressPct = Math.min(
    100,
    rules.minValidConsults > 0 ? myProgress.validConsults / rules.minValidConsults * 100 : 0
  );
  const remaining = Math.max(0, rules.minValidConsults - myProgress.validConsults);
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-slate-800" }, "Como funciona o rateio \u2014 livro aberto"), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-100 rounded-2xl p-4 sm:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "Seu m\xEAs at\xE9 agora (", myProgress.month, ")"), /* @__PURE__ */ React.createElement("ul", { className: "text-sm text-slate-700 space-y-1.5" }, /* @__PURE__ */ React.createElement("li", null, "Consultas v\xE1lidas: ", myProgress.validConsults, " de ", rules.minValidConsults, " necess\xE1rias"), myProgress.pendingRefundWindow > 0 && /* @__PURE__ */ React.createElement("li", null, "+", myProgress.pendingRefundWindow, " consulta(s) aguardando a janela de estorno de ", rules.refundWindowDays, " dias"), /* @__PURE__ */ React.createElement("li", null, myProgress.avgRating != null ? `Sua nota m\xE9dia: ${fmtRating(myProgress.avgRating)}` : "Voc\xEA ainda n\xE3o recebeu avalia\xE7\xF5es \u2014 sem nota, seu multiplicador \xE9 neutro (1,0)"), /* @__PURE__ */ React.createElement("li", null, myProgress.qualified ? "\u2713 Voc\xEA est\xE1 qualificado para o rateio deste m\xEAs" : `Faltam ${remaining} consultas v\xE1lidas para voc\xEA participar do rateio deste m\xEAs`)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "h-2.5 rounded-full bg-white/80 overflow-hidden border border-brand-100" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all",
      style: { width: `${progressPct}%` }
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(AccordionBlock, { title: "De onde vem o dinheiro do pote" }, /* @__PURE__ */ React.createElement("p", null, "De cada consulta paga na plataforma, ", pct(rules.commissionRate), "% viram comiss\xE3o. Essa comiss\xE3o n\xE3o \xE9 lucro da Doctor8: ela paga os custos de manter o sistema funcionando (servidores, v\xEDdeo, mensagens, intelig\xEAncia artificial) e o que sobra volta para os profissionais no fim do m\xEAs. Custos e sobras ficam vis\xEDveis para todos nesta p\xE1gina \u2014 por isso chamamos de livro aberto.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que \xE9 uma consulta v\xE1lida" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Para entrar na conta do rateio, a consulta precisa:"), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "ter sido paga de verdade (pagamento confirmado, n\xE3o pendente);"), /* @__PURE__ */ React.createElement("li", null, "ter passado a janela de estorno de ", rules.refundWindowDays, " dias \u2014 se o paciente for reembolsado, ela n\xE3o conta;"), /* @__PURE__ */ React.createElement("li", null, "ser de um paciente real e distinto \u2014 consultas artificiais s\xE3o detectadas e descartadas.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "No Plant\xE3o Online, chamadas com menos de ", rules.shortCallSeconds, " segundos passam por revis\xE3o antes de contar.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que voc\xEA precisa para participar do m\xEAs" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Pelo menos ", rules.minValidConsults, " consultas v\xE1lidas no m\xEAs;"), /* @__PURE__ */ React.createElement("li", null, "Nota m\xE9dia de pelo menos ", fmtRating(rules.minRating), " (se voc\xEA ainda n\xE3o tem avalia\xE7\xF5es, isso n\xE3o te desqualifica).")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Quem n\xE3o atinge os m\xEDnimos em um m\xEAs continua contribuindo para o pote, e volta a participar assim que atingir \u2014 as regras recome\xE7am do zero todo m\xEAs.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Como o pote \xE9 dividido" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Pote do m\xEAs = comiss\xF5es arrecadadas \u2212 custos do sistema (nunca negativo)."), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, pct(rules.baseFraction), "% do pote: dividido em partes iguais entre todos os qualificados do m\xEAs."), /* @__PURE__ */ React.createElement("li", null, pct(rules.meritFraction), "% do pote: dividido por m\xE9rito, proporcional ao seu score.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Score = consultas v\xE1lidas \xD7 multiplicador de qualidade.", /* @__PURE__ */ React.createElement("br", null), "O multiplicador vem da sua nota m\xE9dia: nota ", fmtRating(rules.minRating), " vale ", fmtMult(rules.ratingMultiplierAtMin), "\xD7, nota 5,0 vale ", fmtMult(rules.qualityMax), "\xD7, sempre entre ", fmtMult(rules.qualityMin), " e ", fmtMult(rules.qualityMax), ". Sem avalia\xE7\xF5es, vale 1,0 (neutro).", /* @__PURE__ */ React.createElement("br", null), "Exemplo: 20 consultas v\xE1lidas com nota 4,5 \u2192 multiplicador 1,1 \u2192 score 22.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Regras de prote\xE7\xE3o e compromissos" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Sinais objetivos: usamos o pagamento real (Stripe), a dura\xE7\xE3o real da chamada e a identidade do paciente para validar \u2014 n\xE3o d\xE1 para inflar n\xFAmeros artificialmente."), /* @__PURE__ */ React.createElement("li", null, "Casos suspeitos passam por revis\xE3o humana antes de qualquer exclus\xE3o."), /* @__PURE__ */ React.createElement("li", null, "Mudan\xE7as de regra valem apenas para os meses seguintes, nunca retroativamente."), /* @__PURE__ */ React.createElement("li", null, "Este livro aberto \xE9 um compromisso da Doctor8: os mesmos n\xFAmeros que voc\xEA v\xEA aqui s\xE3o os usados no c\xE1lculo.")))));
}
function RateioRulesPanel() {
  const [rules, setRules] = useState(null);
  const [myProgress, setMyProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/professional/financeiro/rateio");
        if (!res.ok) {
          console.warn("[RateioRules] API error:", res.status);
          return;
        }
        const data = await res.json();
        if (!data.rules || !data.myProgress) {
          console.warn("[RateioRules] Missing rules or myProgress in API response");
          return;
        }
        if (!cancelled) {
          setRules(data.rules);
          setMyProgress(data.myProgress);
        }
      } catch (e) {
        console.warn("[RateioRules] Failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-8" }, /* @__PURE__ */ React.createElement(Loader2, { size: 20, className: "animate-spin text-slate-300" }));
  }
  if (!rules || !myProgress) return null;
  return /* @__PURE__ */ React.createElement(RateioRules, { rules, myProgress });
}
export {
  RateioRules,
  RateioRulesPanel
};
