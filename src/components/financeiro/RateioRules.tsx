"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

export interface RateioRulesData {
  commissionRate: number;
  baseFraction: number;
  meritFraction: number;
  minValidConsults: number;
  minRating: number;
  refundWindowDays: number;
  shortCallSeconds: number;
  qualityMin: number;
  qualityMax: number;
  ratingMultiplierAtMin: number;
}

export interface RateioMyProgress {
  month: string;
  validConsults: number;
  pendingRefundWindow: number;
  avgRating: number | null;
  qualified: boolean;
}

interface RateioRulesProps {
  rules: RateioRulesData;
  myProgress: RateioMyProgress;
}

function pct(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value * 100);
}

function fmtRating(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function fmtMult(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function AccordionBlock({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{children}</div>}
    </div>
  );
}

export function RateioRules({ rules, myProgress }: RateioRulesProps) {
  const progressPct = Math.min(
    100,
    rules.minValidConsults > 0
      ? (myProgress.validConsults / rules.minValidConsults) * 100
      : 0,
  );
  const remaining = Math.max(0, rules.minValidConsults - myProgress.validConsults);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-800">
        {"Como funciona o rateio \u2014 livro aberto"}
      </h2>

      <div className="bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-100 rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-sm font-bold text-slate-800">
          {"Seu m\u00eas at\u00e9 agora ("}{myProgress.month}{")"}
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5">
          <li>
            {"Consultas v\u00e1lidas: "}{myProgress.validConsults}{" de "}{rules.minValidConsults}{" necess\u00e1rias"}
          </li>
          {myProgress.pendingRefundWindow > 0 && (
            <li>
              {"+"}{myProgress.pendingRefundWindow}{" consulta(s) aguardando a janela de estorno de "}
              {rules.refundWindowDays}{" dias"}
            </li>
          )}
          <li>
            {myProgress.avgRating != null
              ? `Sua nota m\u00e9dia: ${fmtRating(myProgress.avgRating)}`
              : "Voc\u00ea ainda n\u00e3o recebeu avalia\u00e7\u00f5es \u2014 sem nota, seu multiplicador \u00e9 neutro (1,0)"}
          </li>
          <li>
            {myProgress.qualified
              ? "\u2713 Voc\u00ea est\u00e1 qualificado para o rateio deste m\u00eas"
              : `Faltam ${remaining} consultas v\u00e1lidas para voc\u00ea participar do rateio deste m\u00eas`}
          </li>
        </ul>
        <div className="space-y-1">
          <div className="h-2.5 rounded-full bg-white/80 overflow-hidden border border-brand-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <AccordionBlock title="De onde vem o dinheiro do pote">
          <p>
            {"De cada consulta paga na plataforma, "}{pct(rules.commissionRate)}{"% viram comiss\u00e3o. Essa comiss\u00e3o n\u00e3o \u00e9 lucro da Doctor8: ela paga os custos de manter o sistema funcionando (servidores, v\u00eddeo, mensagens, intelig\u00eancia artificial) e o que sobra volta para os profissionais no fim do m\u00eas. Custos e sobras ficam vis\u00edveis para todos nesta p\u00e1gina \u2014 por isso chamamos de livro aberto."}
          </p>
        </AccordionBlock>

        <AccordionBlock title={"O que \u00e9 uma consulta v\u00e1lida"}>
          <p className="mb-2">{"Para entrar na conta do rateio, a consulta precisa:"}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{"ter sido paga de verdade (pagamento confirmado, n\u00e3o pendente);"}</li>
            <li>
              {"ter passado a janela de estorno de "}{rules.refundWindowDays}{" dias \u2014 se o paciente for reembolsado, ela n\u00e3o conta;"}
            </li>
            <li>
              {"ser de um paciente real e distinto \u2014 consultas artificiais s\u00e3o detectadas e descartadas."}
            </li>
          </ul>
          <p className="mt-2">
            {"No Plant\u00e3o Online, chamadas com menos de "}{rules.shortCallSeconds}{" segundos passam por revis\u00e3o antes de contar."}
          </p>
        </AccordionBlock>

        <AccordionBlock title={"O que voc\u00ea precisa para participar do m\u00eas"}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{"Pelo menos "}{rules.minValidConsults}{" consultas v\u00e1lidas no m\u00eas;"}</li>
            <li>
              {"Nota m\u00e9dia de pelo menos "}{fmtRating(rules.minRating)}{" (se voc\u00ea ainda n\u00e3o tem avalia\u00e7\u00f5es, isso n\u00e3o te desqualifica)."}
            </li>
          </ul>
          <p className="mt-2">
            {"Quem n\u00e3o atinge os m\u00ednimos em um m\u00eas continua contribuindo para o pote, e volta a participar assim que atingir \u2014 as regras recome\u00e7am do zero todo m\u00eas."}
          </p>
        </AccordionBlock>

        <AccordionBlock title={"Como o pote \u00e9 dividido"}>
          <p className="mb-2">
            {"Pote do m\u00eas = comiss\u00f5es arrecadadas \u2212 custos do sistema (nunca negativo)."}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              {pct(rules.baseFraction)}{"% do pote: dividido em partes iguais entre todos os qualificados do m\u00eas."}
            </li>
            <li>
              {pct(rules.meritFraction)}{"% do pote: dividido por m\u00e9rito, proporcional ao seu score."}
            </li>
          </ul>
          <p className="mt-2">
            {"Score = consultas v\u00e1lidas \u00d7 multiplicador de qualidade."}
            <br />
            {"O multiplicador vem da sua nota m\u00e9dia: nota "}{fmtRating(rules.minRating)}{" vale "}
            {fmtMult(rules.ratingMultiplierAtMin)}{"\u00d7, nota 5,0 vale "}{fmtMult(rules.qualityMax)}{"\u00d7, sempre entre "}
            {fmtMult(rules.qualityMin)}{" e "}{fmtMult(rules.qualityMax)}{". Sem avalia\u00e7\u00f5es, vale 1,0 (neutro)."}
            <br />
            {"Exemplo: 20 consultas v\u00e1lidas com nota 4,5 \u2192 multiplicador 1,1 \u2192 score 22."}
          </p>
        </AccordionBlock>

        <AccordionBlock title={"Regras de prote\u00e7\u00e3o e compromissos"}>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              {"Sinais objetivos: usamos o pagamento real (Stripe), a dura\u00e7\u00e3o real da chamada e a identidade do paciente para validar \u2014 n\u00e3o d\u00e1 para inflar n\u00fameros artificialmente."}
            </li>
            <li>
              {"Casos suspeitos passam por revis\u00e3o humana antes de qualquer exclus\u00e3o."}
            </li>
            <li>
              {"Mudan\u00e7as de regra valem apenas para os meses seguintes, nunca retroativamente."}
            </li>
            <li>
              {"Este livro aberto \u00e9 um compromisso da Doctor8: os mesmos n\u00fameros que voc\u00ea v\u00ea aqui s\u00e3o os usados no c\u00e1lculo."}
            </li>
          </ul>
        </AccordionBlock>
      </div>
    </div>
  );
}

export function RateioRulesPanel() {
  const [rules, setRules] = useState<RateioRulesData | null>(null);
  const [myProgress, setMyProgress] = useState<RateioMyProgress | null>(null);
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
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!rules || !myProgress) return null;

  return <RateioRules rules={rules} myProgress={myProgress} />;
}
