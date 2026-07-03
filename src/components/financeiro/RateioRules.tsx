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
        Como funciona o rateio — livro aberto
      </h2>

      <div className="bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-100 rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-sm font-bold text-slate-800">
          Seu mês até agora ({myProgress.month})
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5">
          <li>
            Consultas válidas: {myProgress.validConsults} de {rules.minValidConsults} necessárias
          </li>
          {myProgress.pendingRefundWindow > 0 && (
            <li>
              +{myProgress.pendingRefundWindow} consulta(s) aguardando a janela de estorno de{" "}
              {rules.refundWindowDays} dias
            </li>
          )}
          <li>
            {myProgress.avgRating != null
              ? `Sua nota média: ${fmtRating(myProgress.avgRating)}`
              : "Você ainda não recebeu avaliações — sem nota, seu multiplicador é neutro (1,0)"}
          </li>
          <li>
            {myProgress.qualified
              ? "? Você está qualificado para o rateio deste mês"
              : `Faltam ${remaining} consultas válidas para você participar do rateio deste mês`}
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
            De cada consulta paga na plataforma, {pct(rules.commissionRate)}% viram comissão. Essa
            comissão não é lucro da Doctor8: ela paga os custos de manter o sistema funcionando
            (servidores, vídeo, mensagens, inteligência artificial) e o que sobra volta para os
            profissionais no fim do mês. Custos e sobras ficam visíveis para todos nesta página — por
            isso chamamos de livro aberto.
          </p>
        </AccordionBlock>

        <AccordionBlock title="O que é uma consulta válida">
          <p className="mb-2">Para entrar na conta do rateio, a consulta precisa:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ter sido paga de verdade (pagamento confirmado, não pendente);</li>
            <li>
              ter passado a janela de estorno de {rules.refundWindowDays} dias — se o paciente for
              reembolsado, ela não conta;
            </li>
            <li>
              ser de um paciente real e distinto — consultas artificiais são detectadas e descartadas.
            </li>
          </ul>
          <p className="mt-2">
            No Plantão Online, chamadas com menos de {rules.shortCallSeconds} segundos passam por
            revisão antes de contar.
          </p>
        </AccordionBlock>

        <AccordionBlock title="O que você precisa para participar do mês">
          <ul className="list-disc pl-5 space-y-1">
            <li>Pelo menos {rules.minValidConsults} consultas válidas no mês;</li>
            <li>
              Nota média de pelo menos {fmtRating(rules.minRating)} (se você ainda não tem
              avaliações, isso não te desqualifica).
            </li>
          </ul>
          <p className="mt-2">
            Quem não atinge os mínimos em um mês continua contribuindo para o pote, e volta a
            participar assim que atingir — as regras recomeçam do zero todo mês.
          </p>
        </AccordionBlock>

        <AccordionBlock title="Como o pote é dividido">
          <p className="mb-2">
            Pote do mês = comissões arrecadadas ? custos do sistema (nunca negativo).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              {pct(rules.baseFraction)}% do pote: dividido em partes iguais entre todos os
              qualificados do mês.
            </li>
            <li>
              {pct(rules.meritFraction)}% do pote: dividido por mérito, proporcional ao seu score.
            </li>
          </ul>
          <p className="mt-2">
            Score = consultas válidas × multiplicador de qualidade.
            <br />
            O multiplicador vem da sua nota média: nota {fmtRating(rules.minRating)} vale{" "}
            {fmtMult(rules.ratingMultiplierAtMin)}×, nota 5,0 vale {fmtMult(rules.qualityMax)}×, sempre entre{" "}
            {fmtMult(rules.qualityMin)} e {fmtMult(rules.qualityMax)}. Sem avaliações, vale 1,0
            (neutro).
            <br />
            Exemplo: 20 consultas válidas com nota 4,5 ? multiplicador 1,1 ? score 22.
          </p>
        </AccordionBlock>

        <AccordionBlock title="Regras de proteção e compromissos">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Sinais objetivos: usamos o pagamento real (Stripe), a duração real da chamada e a
              identidade do paciente para validar — não dá para inflar números artificialmente.
            </li>
            <li>
              Casos suspeitos passam por revisão humana antes de qualquer exclusão.
            </li>
            <li>
              Mudanças de regra valem apenas para os meses seguintes, nunca retroativamente.
            </li>
            <li>
              Este livro aberto é um compromisso da Doctor8: os mesmos números que você vê aqui são
              os usados no cálculo.
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
