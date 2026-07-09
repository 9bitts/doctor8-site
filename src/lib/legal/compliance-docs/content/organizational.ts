import type { ComplianceDoc } from "../types";
import { COMPANY_BLOCK } from "../utils";

export const organizationalDocs: ComplianceDoc[] = [
  {
    slug: "codigo-conduta-etica",
    title: "Código de Conduta e Ética em Privacidade",
    description: "Diretrizes internas para colaboradores e parceiros sobre tratamento de dados pessoais.",
    legalBasis: "Art. 50, §2º, LGPD",
    required: false,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Compromisso",
        content: `${COMPANY_BLOCK}
<p class="mt-4">Colaboradores, prestadores e parceiros da INFO8 que tenham acesso a dados pessoais na Doctor8 devem seguir este Código de Conduta em Privacidade.</p>`,
      },
      {
        title: "2. Princípios",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Acessar dados apenas quando necessário para a função (need-to-know).</li>
<li>Nunca compartilhar credenciais ou exportar dados sem autorização.</li>
<li>Reportar imediatamente suspeitas de incidente ao DPO.</li>
<li>Não utilizar dados para fins diversos dos autorizados.</li>
<li>Respeitar sigilo profissional na área da saúde.</li>
<li>Tratar titulares com transparência e respeito em solicitações de direitos.</li>
</ul>`,
      },
      {
        title: "3. Consequências",
        content: `<p>Violações podem resultar em medidas disciplinares, rescisão contratual e comunicação às autoridades, conforme gravidade.</p>`,
      },
    ],
  },
  {
    slug: "registros-treinamento",
    title: "Registros de Treinamento em Proteção de Dados",
    description: "Modelo de evidências de capacitação da equipe em LGPD e segurança da informação.",
    legalBasis: "Boa prática / Art. 50, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Objetivo",
        content: `<p>Demonstrar que colaboradores com acesso a dados pessoais recebem capacitação periódica em LGPD, segurança e sigilo em saúde.</p>`,
      },
      {
        title: "2. Público-alvo",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Equipe de desenvolvimento e infraestrutura</li>
<li>Suporte ao usuário</li>
<li>Administradores da plataforma</li>
<li>Comercial e atendimento a empresas</li>
<li>Coordenadores de campanhas humanitárias</li>
</ul>`,
      },
      {
        title: "3. Conteúdo mínimo do treinamento",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Conceitos LGPD e dados sensíveis de saúde</li>
<li>Política de Privacidade e PSI</li>
<li>Procedimento de atendimento ao titular</li>
<li>Plano de resposta a incidentes</li>
<li>Telemedicina e TCLE</li>
</ul>`,
      },
      {
        title: "4. Registro (modelo)",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b bg-slate-50"><td class="py-2 px-2 font-semibold">Data</td><td class="py-2 px-2 font-semibold">Tema</td><td class="py-2 px-2 font-semibold">Participantes</td><td class="py-2 px-2 font-semibold">Carga horária</td><td class="py-2 px-2 font-semibold">Instrutor</td></tr>
<tr class="border-b"><td class="py-2 px-2 text-slate-400 italic" colspan="5">A preencher após realização do primeiro treinamento</td></tr>
</table>
<p class="mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong>Ação pendente:</strong> agendar e registrar o primeiro treinamento formal da equipe INFO8.</p>`,
      },
    ],
  },
  {
    slug: "relatorios-auditoria",
    title: "Relatórios de Auditoria de Conformidade",
    description: "Comprovação periódica de conformidade com a LGPD e políticas internas.",
    legalBasis: "Art. 50, III, LGPD",
    required: false,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Escopo da auditoria",
        content: `<p>Auditorias internas periódicas verificam:</p>
<ul class="list-disc pl-5 space-y-2 mt-2">
<li>Adequação do ROPA às funcionalidades atuais</li>
<li>Efetividade dos controles de acesso e criptografia</li>
<li>Integridade dos logs de auditoria</li>
<li>Atendimento a solicitações de titulares dentro do prazo</li>
<li>Contratos com subprocessadores atualizados</li>
<li>Consentimentos e TCLE versionados corretamente</li>
</ul>`,
      },
      {
        title: "2. Evidências técnicas disponíveis",
        content: `<p>A plataforma Doctor8 registra automaticamente ações sobre dados sensíveis (visualização, criação, alteração, exclusão, compartilhamento, exportação). Administradores autorizados podem consultar logs no painel admin.</p>`,
      },
      {
        title: "3. Periodicidade",
        content: `<p><strong>Recomendado:</strong> auditoria interna semestral e revisão anual completa do programa de governança. Relatório assinado pelo DPO e direção.</p>
<p class="mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong>Ação pendente:</strong> realizar primeira auditoria formal e arquivar relatório datado.</p>`,
      },
    ],
  },
];
