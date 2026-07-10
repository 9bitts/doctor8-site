import type { ComplianceDoc } from "../types";
import { COMPANY_BLOCK } from "../utils";

export const contractsAndClinicalDocs: ComplianceDoc[] = [
  {
    slug: "contratos-tratamento-terceiros",
    title: "Contratos de Tratamento de Dados com Terceiros",
    description:
      "Modelo de cláusulas para fornecedores, parceiros e operadores: segurança, subcontratação e descarte.",
    legalBasis: "Art. 39, III e Art. 42, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Objeto",
        content: `${COMPANY_BLOCK}
<p class="mt-4">Este documento estabelece as cláusulas mínimas de proteção de dados que a INFO8 exige em contratos com operadores e suboperadores que tratam dados pessoais em nome da Doctor8.</p>`,
      },
      {
        title: "2. Cláusulas obrigatórias",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Tratamento apenas conforme instruções documentadas da INFO8.</li>
<li>Confidencialidade de pessoas autorizadas a tratar os dados.</li>
<li>Medidas de segurança compatíveis com o Art. 46 da LGPD.</li>
<li>Notificação imediata de incidentes de segurança.</li>
<li>Apoio ao atendimento de direitos dos titulares.</li>
<li>Eliminação ou devolução dos dados ao término do contrato.</li>
<li>Permissão de auditoria e comprovação de conformidade.</li>
<li>Subcontratação somente com autorização e contrato equivalente.</li>
</ul>`,
      },
      {
        title: "3. Subprocessadores prioritários",
        content: `<p>A INFO8 mantém inventário e revisão contratual para: <strong>AWS</strong>, <strong>Daily.co</strong>, <strong>Google</strong>, <strong>Stripe</strong> e <strong>Lacuna</strong>. Cada contrato ou DPA deve ser arquivado com data de vigência e responsável interno.</p>
<p class="mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong>Ação pendente:</strong> coletar DPAs assinados ou termos equivalentes de cada fornecedor e anexar ao dossiê de conformidade.</p>`,
      },
    ],
  },
  {
    slug: "contrato-operadores-saude",
    title: "Contrato Específico com Operadores de Saúde",
    description:
      "Cláusulas reforçadas para profissionais, clínicas e empregadores que acessam dados de saúde na plataforma.",
    legalBasis: "Art. 39, III e Art. 42, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Partes e papéis",
        content: `<p>A INFO8 atua como <strong>controladora</strong> da plataforma. O profissional de saúde, clínica (ORGANIZATION) ou empregador (EMPLOYER), ao tratar dados de pacientes na Doctor8, pode atuar como <strong>controlador independente</strong> ou <strong>co-controlador</strong>, conforme a finalidade do atendimento.</p>`,
      },
      {
        title: "2. Obrigações do operador de saúde",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Manter registro profissional ativo e verificado na plataforma.</li>
<li>Acessar apenas pacientes vinculados ou com compartilhamento autorizado.</li>
<li>Registrar atendimentos no prontuário conforme normas do conselho (CFM, CFP, etc.).</li>
<li>Obter TCLE antes de teleconsulta por vídeo.</li>
<li>Não exportar ou compartilhar dados fora da plataforma sem base legal.</li>
<li>Comunicar incidentes de segurança à INFO8 em até 24 horas.</li>
<li>Respeitar prazos de guarda de prontuário (mínimo 10 anos — CFM 1.821/2007).</li>
</ul>`,
      },
      {
        title: "3. Uso da plataforma",
        content: `<p>O profissional utiliza a Doctor8 como ferramenta de prontuário, agenda, teleconsulta e prescrição digital. A INFO8 fornece a infraestrutura segura; a responsabilidade clínica e ética permanece com o profissional habilitado.</p>`,
      },
      {
        title: "4. Encerramento",
        content: `<p>Ao encerrar uso da plataforma, o profissional deve exportar prontuários que for obrigado a manter e revogar compartilhamentos ativos. Dados retidos pela INFO8 seguem a Política de Retenção e obrigações legais.</p>`,
      },
    ],
  },
  {
    slug: "consentimento-dados-sensiveis",
    title: "Termo de Consentimento Específico para Dados Sensíveis",
    description:
      "Consentimento separado e específico para finalidades que exigem consentimento explícito em dados de saúde.",
    legalBasis: "Art. 11, LGPD",
    required: true,
    status: "partial",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Princípio",
        content: `<p>Dados de saúde na Doctor8 são tratados principalmente com base na <strong>tutela da saúde</strong> (Art. 11, II, f). Consentimento específico e destacado é exigido para finalidades adicionais, conforme abaixo.</p>`,
      },
      {
        title: "2. Consentimentos específicos implementados",
        content: `<ul class="list-disc pl-5 space-y-2">
<li><strong>Telemedicina (TCLE):</strong> <a href="/docs/tcle-telemedicina" class="text-blue-600 underline">TCLE Telemedicina v1.2</a> — obrigatório antes de vídeo clínico.</li>
<li><strong>Psicologia / TDICs:</strong> templates CFP 09/2024 gerados no módulo de psicologia.</li>
<li><strong>Angels (humanitário):</strong> consentimento separado para contato pós-consulta.</li>
<li><strong>Gravação de vídeo:</strong> não automática; requer consentimento adicional se habilitada.</li>
<li><strong>Marketing:</strong> opt-in separado no cadastro.</li>
<li><strong>FHIR / apps terceiros:</strong> consentimento SMART on FHIR por aplicativo.</li>
</ul>`,
      },
      {
        title: "3. O que não pode ser genérico",
        content: `<p>Um único checkbox de "aceito tratamento de dados de saúde" não substitui consentimentos específicos para gravação, pesquisa, compartilhamento com terceiros não assistenciais ou uso secundário dos dados.</p>`,
      },
    ],
  },
  {
    slug: "politica-retencao-descarte",
    title: "Política de Retenção e Descarte de Prontuários",
    description: "Guarda mínima de prontuários e descarte documentado, em conformidade com CFM e LGPD.",
    legalBasis: "Resolução CFM nº 1.821/2007 e Art. 16, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Prazos de guarda",
        content: `<ul class="list-disc pl-5 space-y-2">
<li><strong>Prontuário médico:</strong> mínimo de <strong>20 anos</strong> a partir do último atendimento (CFM 1.821/2007 — confirmar interpretação com assessoria jurídica).</li>
<li><strong>Documentos psicológicos:</strong> mínimo de <strong>5 anos</strong> (CFP 06/2019), salvo disposição mais restritiva.</li>
<li><strong>Dados cadastrais:</strong> enquanto a conta estiver ativa + prazos fiscais/contratuais.</li>
<li><strong>Logs de auditoria:</strong> mínimo de 6 meses a 5 anos conforme criticidade e obrigação legal.</li>
<li><strong>Consentimentos:</strong> mantidos como evidência pelo prazo de prescrição de questionamentos.</li>
</ul>`,
      },
      {
        title: "2. Exclusão de conta pelo titular",
        content: `<p>A API de exclusão agenda eliminação em 30 dias. Dados sujeitos a retenção legal (prontuário sob responsabilidade do profissional/controlador) podem ser <strong>bloqueados ou anonimizados</strong> na conta do titular, mantendo-se o registro clínico pelo prazo regulatório.</p>
<p class="mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong>Ação pendente:</strong> alinhar comportamento da API de exclusão com esta política para evitar eliminação prematura de prontuários com obrigação de guarda.</p>`,
      },
      {
        title: "3. Descarte seguro",
        content: `<p>Após o prazo de retenção, dados são eliminados de produção e backups conforme ciclo do provedor. Mídias físicas, se houver, são destruídas de forma segura. O descarte é registrado com data e responsável.</p>`,
      },
    ],
  },
  {
    slug: "politica-telemedicina-cfm",
    title: "Política de Telemedicina e Conformidade com o CFM",
    description:
      "Requisitos operacionais para consultas remotas conforme Resolução CFM nº 2.314/2022.",
    legalBasis: "Resolução CFM nº 2.314/2022",
    required: true,
    status: "partial",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Escopo",
        content: `${COMPANY_BLOCK}
<p class="mt-4">Esta política complementa o <a href="/docs/tcle-telemedicina" class="text-blue-600 underline">TCLE de Telemedicina</a> e define requisitos operacionais da plataforma para teleconsultas médicas e multiprofissionais.</p>`,
      },
      {
        title: "2. Requisitos da plataforma",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Profissional com registro verificado e situação ativa no conselho.</li>
<li>TCLE aceito (versão vigente) antes de ingressar em sala de vídeo clínica.</li>
<li>Registro do atendimento no prontuário eletrônico.</li>
<li>Videoconferência em ambiente privado da plataforma (Daily.co ou Google Meet autorizado).</li>
<li>Janela de acesso: 10 minutos antes até 30 minutos após o horário agendado.</li>
<li>Prescrições com assinatura ICP-Brasil quando emitidas digitalmente.</li>
<li>Gravação de consulta <strong>não</strong> é padrão; somente com consentimento específico.</li>
</ul>`,
      },
      {
        title: "3. Salas de coordenação (meeting rooms)",
        content: `<p>As salas do Anfiteatro (<code>/anfiteatro</code>) são para <strong>briefings, treinamentos e coordenação</strong> — não substituem consulta clínica com paciente. Teleconsultas com pacientes ocorrem exclusivamente em salas vinculadas a agendamentos ou filas clínicas.</p>`,
      },
      {
        title: "4. Emergências e limitações",
        content: `<p>Telemedicina não substitui atendimento presencial de urgência/emergência. O profissional deve orientar encaminhamento presencial quando identificar risco iminente. A qualidade depende da conexão do paciente e do ambiente privado.</p>`,
      },
    ],
  },
  {
    slug: "compliance-anvisa-samd",
    title: "Posicionamento — Compliance ANVISA (SaMD)",
    description:
      "Análise preliminar de enquadramento como Software como Dispositivo Médico (RDC 658/2022).",
    legalBasis: "RDC ANVISA nº 658/2022",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Natureza do software",
        content: `<p>A Doctor8 é uma <strong>plataforma de gestão em saúde e telemedicina</strong>: prontuário eletrônico, agenda, teleconsulta, prescrição e módulos administrativos. Não realiza diagnóstico autônomo nem substitui decisão clínica do profissional.</p>`,
      },
      {
        title: "2. Análise preliminar de enquadramento",
        content: `<p><strong>Posição atual (preliminar):</strong> a Doctor8, em sua configuração principal, atua como <strong>sistema de informação em saúde / prontuário eletrônico</strong>, não como Software como Dispositivo Médico (SaMD) que define ou influencia diretamente diagnóstico ou tratamento sem profissional.</p>
<p class="mt-2">Funcionalidades de IA (sugestão de notas, transcrição) operam como <strong>apoio ao profissional</strong>, que permanece responsável pela validação clínica.</p>`,
      },
      {
        title: "3. Riscos de reclassificação",
        content: `<p>Reavaliar enquadramento se a plataforma passar a oferecer:</p>
<ul class="list-disc pl-5 space-y-2 mt-2">
<li>Diagnóstico automatizado sem supervisão profissional.</li>
<li>Algoritmos que determinam conduta clínica de forma autônoma.</li>
<li>Monitoramento de dispositivos médicos integrados com função diagnóstica.</li>
</ul>`,
      },
      {
        title: "4. Próxima ação regulatória",
        content: `<p class="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">Solicitar <strong>parecer formal</strong> de consultoria regulatória (ANVISA/CFM) para confirmar não aplicabilidade da RDC 658/2022 ou definir classe de risco e obrigações de registro caso algum módulo seja considerado SaMD.</p>`,
      },
    ],
  },
];
