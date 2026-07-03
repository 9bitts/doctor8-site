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
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-slate-800" }, "Como funciona o rateio \uFFFD livro aberto"), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-100 rounded-2xl p-4 sm:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "Seu m\uFFFDs at\uFFFD agora (", myProgress.month, ")"), /* @__PURE__ */ React.createElement("ul", { className: "text-sm text-slate-700 space-y-1.5" }, /* @__PURE__ */ React.createElement("li", null, "Consultas v\uFFFDlidas: ", myProgress.validConsults, " de ", rules.minValidConsults, " necess\uFFFDrias"), myProgress.pendingRefundWindow > 0 && /* @__PURE__ */ React.createElement("li", null, "+", myProgress.pendingRefundWindow, " consulta(s) aguardando a janela de estorno de", " ", rules.refundWindowDays, " dias"), /* @__PURE__ */ React.createElement("li", null, myProgress.avgRating != null ? `Sua nota m\uFFFDdia: ${fmtRating(myProgress.avgRating)}` : "Voc\uFFFD ainda n\uFFFDo recebeu avalia\uFFFD\uFFFDes \uFFFD sem nota, seu multiplicador \uFFFD neutro (1,0)"), /* @__PURE__ */ React.createElement("li", null, myProgress.qualified ? "? Voc\uFFFD est\uFFFD qualificado para o rateio deste m\uFFFDs" : `Faltam ${remaining} consultas v\uFFFDlidas para voc\uFFFD participar do rateio deste m\uFFFDs`)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "h-2.5 rounded-full bg-white/80 overflow-hidden border border-brand-100" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all",
      style: { width: `${progressPct}%` }
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(AccordionBlock, { title: "De onde vem o dinheiro do pote" }, /* @__PURE__ */ React.createElement("p", null, "De cada consulta paga na plataforma, ", pct(rules.commissionRate), "% viram comiss\uFFFDo. Essa comiss\uFFFDo n\uFFFDo \uFFFD lucro da Doctor8: ela paga os custos de manter o sistema funcionando (servidores, v\uFFFDdeo, mensagens, intelig\uFFFDncia artificial) e o que sobra volta para os profissionais no fim do m\uFFFDs. Custos e sobras ficam vis\uFFFDveis para todos nesta p\uFFFDgina \uFFFD por isso chamamos de livro aberto.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que \uFFFD uma consulta v\uFFFDlida" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Para entrar na conta do rateio, a consulta precisa:"), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "ter sido paga de verdade (pagamento confirmado, n\uFFFDo pendente);"), /* @__PURE__ */ React.createElement("li", null, "ter passado a janela de estorno de ", rules.refundWindowDays, " dias \uFFFD se o paciente for reembolsado, ela n\uFFFDo conta;"), /* @__PURE__ */ React.createElement("li", null, "ser de um paciente real e distinto \uFFFD consultas artificiais s\uFFFDo detectadas e descartadas.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "No Plant\uFFFDo Online, chamadas com menos de ", rules.shortCallSeconds, " segundos passam por revis\uFFFDo antes de contar.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que voc\uFFFD precisa para participar do m\uFFFDs" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Pelo menos ", rules.minValidConsults, " consultas v\uFFFDlidas no m\uFFFDs;"), /* @__PURE__ */ React.createElement("li", null, "Nota m\uFFFDdia de pelo menos ", fmtRating(rules.minRating), " (se voc\uFFFD ainda n\uFFFDo tem avalia\uFFFD\uFFFDes, isso n\uFFFDo te desqualifica).")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Quem n\uFFFDo atinge os m\uFFFDnimos em um m\uFFFDs continua contribuindo para o pote, e volta a participar assim que atingir \uFFFD as regras recome\uFFFDam do zero todo m\uFFFDs.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Como o pote \uFFFD dividido" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Pote do m\uFFFDs = comiss\uFFFDes arrecadadas ? custos do sistema (nunca negativo)."), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, pct(rules.baseFraction), "% do pote: dividido em partes iguais entre todos os qualificados do m\uFFFDs."), /* @__PURE__ */ React.createElement("li", null, pct(rules.meritFraction), "% do pote: dividido por m\uFFFDrito, proporcional ao seu score.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Score = consultas v\uFFFDlidas \uFFFD multiplicador de qualidade.", /* @__PURE__ */ React.createElement("br", null), "O multiplicador vem da sua nota m\uFFFDdia: nota ", fmtRating(rules.minRating), " vale", " ", fmtMult(rules.ratingMultiplierAtMin), "\uFFFD, nota 5,0 vale ", fmtMult(rules.qualityMax), "\uFFFD, sempre entre", " ", fmtMult(rules.qualityMin), " e ", fmtMult(rules.qualityMax), ". Sem avalia\uFFFD\uFFFDes, vale 1,0 (neutro).", /* @__PURE__ */ React.createElement("br", null), "Exemplo: 20 consultas v\uFFFDlidas com nota 4,5 ? multiplicador 1,1 ? score 22.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Regras de prote\uFFFD\uFFFDo e compromissos" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Sinais objetivos: usamos o pagamento real (Stripe), a dura\uFFFD\uFFFDo real da chamada e a identidade do paciente para validar \uFFFD n\uFFFDo d\uFFFD para inflar n\uFFFDmeros artificialmente."), /* @__PURE__ */ React.createElement("li", null, "Casos suspeitos passam por revis\uFFFDo humana antes de qualquer exclus\uFFFDo."), /* @__PURE__ */ React.createElement("li", null, "Mudan\uFFFDas de regra valem apenas para os meses seguintes, nunca retroativamente."), /* @__PURE__ */ React.createElement("li", null, "Este livro aberto \uFFFD um compromisso da Doctor8: os mesmos n\uFFFDmeros que voc\uFFFD v\uFFFD aqui s\uFFFDo os usados no c\uFFFDlculo.")))));
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
