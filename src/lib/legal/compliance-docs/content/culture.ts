import type { ComplianceDoc } from "../types";
import { COMPANY_BLOCK } from "../utils";

export const cultureDocs: ComplianceDoc[] = [
  {
    slug: "o-que-e-certo",
    title: "O que é certo",
    description:
      "Princípios culturais da Doctor8: fazer o certo pelos motivos certos, com responsabilidade, visão de futuro e compromisso com uma sociedade livre, justa e solidária.",
    legalBasis: "Cultura organizacional · Constituição Federal (art. 3º)",
    required: false,
    status: "published",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Por que este documento existe",
        content: `${COMPANY_BLOCK}
<p class="mt-4">A Doctor8 nasceu para resolver problemas reais em saúde digital — com ética, seriedade e responsabilidade. Este documento consolida os princípios que orientam nossas decisões de produto, engenharia, atendimento e cultura interna.</p>
<p class="mt-4">A referência cultural é o discurso do ministro André Mendonça (STF) na OAB-RJ sobre os desafios da advocacia no século XXI: uma reflexão sobre propósito, dever e o que significa <strong>fazer o certo pelos motivos certos</strong>.</p>`,
      },
      {
        title: "2. Propósito maior",
        content: `<p>A Constituição estabelece valores supremos — igualdade, liberdade, bem-estar, desenvolvimento, paz e <strong>justiça</strong> — e objetivos fundamentais da República (art. 3º):</p>
<ul class="list-disc pl-5 space-y-2 mt-3">
<li>Garantir uma sociedade livre, justa e solidária</li>
<li>Garantir o desenvolvimento social</li>
<li>Reduzir desigualdades regionais e sociais</li>
<li>Erradicar a pobreza e a marginalização</li>
<li>Promover o bem de todos, sem discriminações ou preconceitos</li>
</ul>
<p class="mt-4">Na Doctor8, o projeto de carreira e de produto <strong>não pode ser apenas financeiro</strong> nem voltado só a ocupar posições. Deve realizar esses fundamentos: construir ferramentas que tornem a saúde mais acessível, digna e justa.</p>`,
      },
      {
        title: "3. O que é certo",
        content: `<p>Adotamos uma ética de dever — na tradição do imperativo categórico (Kant) e do compromisso com o bem comum:</p>
<blockquote class="border-l-4 border-emerald-500 pl-4 my-4 text-slate-700 italic">
O certo é certo independentemente dos interesses de uma pessoa, de um grupo ou de uma maioria.
</blockquote>
<p>Há três passos inseparáveis:</p>
<ol class="list-decimal pl-5 space-y-2 mt-3">
<li><strong>Saber</strong> o que é certo</li>
<li><strong>Fazer</strong> o que é certo</li>
<li><strong>Fazer pelos motivos certos</strong> — pelo dever, não por conveniência, prestígio ou ganho imediato</li>
</ol>
<p class="mt-4">Dinheiro, reconhecimento e cargos podem ser consequências de bons princípios postos em prática — mas <strong>não são objetivos de vida</strong> nem norte exclusivo de decisão.</p>
<p class="mt-4">Quando fazemos o certo, algumas portas se fecham. Outras — às vezes estreitas — se abrem e levam a caminhos mais sólidos e duradouros.</p>`,
      },
      {
        title: "4. Os 12 princípios",
        content: `<p>Cada colaborador, parceiro e profissional que atua na Doctor8 é convidado a assumir estas responsabilidades no dia a dia:</p>
<ol class="list-decimal pl-5 space-y-3 mt-3">
<li><strong>Assumir responsabilidades</strong> — fazer a diferença no próprio trabalho; servir com mais deveres que prerrogativas; preservar a confiança de pacientes, profissionais e sociedade.</li>
<li><strong>Visão de futuro</strong> — projetar impacto em 5, 10, 20 anos; preparar a plataforma e a equipe para o que virá.</li>
<li><strong>Preparo</strong> — suar a camisa; estudar; não esperar passivamente; enfrentar desafios com competência.</li>
<li><strong>Acreditar</strong> — que vale a pena fazer o certo; que realizar boas coisas é, em si, realização.</li>
<li><strong>Coragem</strong> — saber quando ser firme e quando ser sereno; tomar decisões racionais, sem arrogância; não temer derrotas no caminho do que é justo.</li>
<li><strong>Humildade</strong> — reconhecer limitações e quem ajudou; tratar todos com respeito, especialmente quem está em posição mais vulnerável.</li>
<li><strong>Sabedoria</strong> — discernir entre certo e errado; saber quando agir e quando esperar; unir prudência e coragem.</li>
<li><strong>Perseverança</strong> — agir para avançar, mesmo diante de obstáculos.</li>
<li><strong>Resiliência</strong> — fincar o pé para não retroceder; às vezes recuar estrategicamente para depois avançar melhor.</li>
<li><strong>Gratidão</strong> — às pessoas que estenderam a mão, apoiaram e colaboraram.</li>
<li><strong>Lealdade</strong> — aos princípios; em conflito entre gratidão pessoal e princípio, prevalece a lealdade ao que é certo.</li>
<li><strong>Agir</strong> — colocar tudo isso em prática, todos os dias, em cada linha de código, cada atendimento e cada decisão de produto.</li>
</ol>`,
      },
      {
        title: "5. Quem resolve problemas",
        content: `<p>Em qualquer área — saúde, tecnologia, direito, serviço público — há basicamente três perfis:</p>
<div class="grid gap-4 mt-4">
<div class="rounded-lg border border-red-200 bg-red-50 p-4">
<p class="font-semibold text-red-900">Criadores de problema</p>
<p class="text-sm text-red-800 mt-1">Minoría barulhenta. Reclamam, geram atrito, não resolvem.</p>
</div>
<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
<p class="font-semibold text-slate-900">Indiferentes</p>
<p class="text-sm text-slate-700 mt-1">Passam despercebidos. Não colaboram, mas também não ajudam.</p>
</div>
<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
<p class="font-semibold text-emerald-900">Resolvedores de problema</p>
<p class="text-sm text-emerald-800 mt-1">Minoría que faz toda a diferença. O profissional do futuro.</p>
</div>
</div>
<p class="mt-4"><strong>O desafio da Doctor8:</strong> não ser criador de problema nem indiferente. Ser quem resolve — de forma séria, ética e responsável. Há espaço sobrando para quem resolve.</p>
<p class="mt-4">Ao contratar, desenvolver produto ou atender um paciente, buscamos pessoas que conciliem <strong>preparo técnico</strong> com <strong>capacidade real de resolver problemas</strong>.</p>`,
      },
      {
        title: "6. Aplicação prática na Doctor8",
        content: `<p>Estes princípios orientam decisões concretas:</p>
<ul class="list-disc pl-5 space-y-2 mt-3">
<li><strong>Produto:</strong> priorizar funcionalidades que ampliem acesso, dignidade e segurança em saúde — não apenas métricas de vaidade.</li>
<li><strong>Engenharia:</strong> proteger dados sensíveis, corrigir falhas com transparência, não criar débito técnico por conveniência.</li>
<li><strong>Atendimento:</strong> resolver a demanda do titular com respeito; escalar quando necessário; nunca ser indiferente.</li>
<li><strong>Parcerias:</strong> escolher operadores e integrações alinhados a padrões éticos e legais (LGPD, CFM, sigilo profissional).</li>
<li><strong>Cultura interna:</strong> reconhecer quem resolve; corrigir quem cria problema; desenvolver quem está parado.</li>
</ul>
<p class="mt-4">Servimos pacientes, profissionais de saúde, empresas e instituições. Em cada relação, a pergunta é a mesma: <em>estamos fazendo o certo, da forma certa, pelos motivos certos?</em></p>`,
      },
      {
        title: "7. Referência",
        content: `<p>Documento inspirado no discurso do ministro <strong>André Mendonça</strong> (Supremo Tribunal Federal) na Ordem dos Advogados do Brasil — Seção Rio de Janeiro (OAB-RJ), sobre os desafios da advocacia no século XXI.</p>
<p class="mt-4 text-sm text-slate-500">Este texto é adaptado à cultura da Doctor8 e não constitui posicionamento institucional do STF ou da OAB. Serve como referência ética interna para colaboradores, parceiros e profissionais que utilizam a plataforma.</p>`,
      },
    ],
  },
];
