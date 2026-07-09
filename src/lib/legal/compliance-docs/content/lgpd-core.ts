import type { ComplianceDoc } from "../types";
import { COMPANY_BLOCK } from "../utils";

export const lgpdCoreDocs: ComplianceDoc[] = [
  {
    slug: "politica-seguranca-informacao",
    title: "Política de Segurança da Informação (PSI)",
    description:
      "Diretrizes técnicas e organizacionais para proteger dados pessoais contra acessos não autorizados e incidentes.",
    legalBasis: "Art. 46 e Art. 48, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Objetivo e escopo",
        content: `${COMPANY_BLOCK}
<p class="mt-4">Esta Política de Segurança da Informação (PSI) estabelece diretrizes para proteção dos dados pessoais e dados sensíveis de saúde tratados pela plataforma Doctor8, em conformidade com a LGPD, normas do CFM/CFP aplicáveis à telemedicina e boas práticas de mercado.</p>
<p class="mt-2">Aplica-se a colaboradores, prestadores, operadores contratados e profissionais que utilizam a plataforma.</p>`,
      },
      {
        title: "2. Controles técnicos implementados",
        content: `<ul class="list-disc pl-5 space-y-2">
<li><strong>Criptografia:</strong> dados de saúde (PHI) criptografados em repouso com AES-256-GCM.</li>
<li><strong>Controle de acesso:</strong> autenticação por login/senha, papéis (RBAC) e segregação por perfil (paciente, profissional, empregador, admin).</li>
<li><strong>Sessão:</strong> timeout automático de 15 minutos de inatividade.</li>
<li><strong>Proteção de conta:</strong> bloqueio após 5 tentativas inválidas de login.</li>
<li><strong>Auditoria:</strong> registro de visualização, criação, alteração, exclusão, compartilhamento e exportação de dados sensíveis.</li>
<li><strong>Comunicação:</strong> HTTPS obrigatório, headers de segurança (CSP, HSTS).</li>
<li><strong>Arquivos:</strong> uploads sem endpoint genérico de leitura por ID (prevenção de IDOR).</li>
<li><strong>Residência de dados:</strong> armazenamento por região da conta (BR, US, EU) quando aplicável.</li>
</ul>`,
      },
      {
        title: "3. Gestão de credenciais e acessos",
        content: `<p>Acessos administrativos são restritos ao mínimo necessário. Senhas devem ser pessoais e intransferíveis. Chaves de API, tokens e segredos de produção são armazenados em variáveis de ambiente seguras, nunca em código-fonte.</p>
<p class="mt-2">Profissionais de saúde só acessam prontuários de pacientes vinculados ou com compartilhamento autorizado. Compartilhamentos de prontuário são registrados e podem ser revogados.</p>`,
      },
      {
        title: "4. Backup, continuidade e subprocessadores",
        content: `<p>Backups e infraestrutura são mantidos em provedores de nuvem com contratos de confidencialidade. Subprocessadores relevantes: AWS (hospedagem/armazenamento), Daily.co e Google (videoconferência), Stripe (pagamentos), Lacuna (assinatura ICP-Brasil).</p>
<p class="mt-2">A INFO8 avalia periodicamente a segurança dos fornecedores críticos e exige cláusulas de proteção de dados nos contratos.</p>`,
      },
      {
        title: "5. Incidentes e revisão",
        content: `<p>Incidentes de segurança seguem o <a href="/docs/plano-resposta-incidentes" class="text-blue-600 underline">Plano de Resposta a Incidentes</a>. Esta PSI é revisada anualmente ou quando houver mudança relevante na arquitetura ou regulamentação.</p>`,
      },
    ],
  },
  {
    slug: "programa-governanca-privacidade",
    title: "Programa de Governança em Privacidade",
    description:
      "Conjunto de práticas para demonstrar conformidade: responsabilidades, auditoria, gestão de riscos e monitoramento.",
    legalBasis: "Art. 50, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Estrutura de governança",
        content: `${COMPANY_BLOCK}
<p class="mt-4">O Programa de Governança em Privacidade da Doctor8 organiza papéis, processos e evidências para demonstrar conformidade com a LGPD e regulamentações setoriais de saúde.</p>
<ul class="list-disc pl-5 space-y-2 mt-3">
<li><strong>Controlador:</strong> INFO8 — define finalidades e bases legais do tratamento na plataforma.</li>
<li><strong>Encarregado (DPO):</strong> canal de comunicação com titulares e ANPD (ver <a href="/docs/designacao-encarregado-dpo" class="text-blue-600 underline">Designação do DPO</a>).</li>
<li><strong>Operadores:</strong> profissionais, clínicas, empregadores e farmácias que tratam dados de pacientes na plataforma, nos limites de suas atividades.</li>
<li><strong>Suboperadores:</strong> fornecedores de infraestrutura, vídeo, pagamento e assinatura digital.</li>
</ul>`,
      },
      {
        title: "2. Pilares do programa",
        content: `<ol class="list-decimal pl-5 space-y-2">
<li><strong>Inventário e ROPA:</strong> manutenção do <a href="/docs/registro-operacoes-tratamento" class="text-blue-600 underline">Registro de Operações de Tratamento</a>.</li>
<li><strong>Gestão de riscos:</strong> avaliações de impacto (DPIA) para tratamentos de alto risco.</li>
<li><strong>Políticas e procedimentos:</strong> documentação publicada em <a href="/docs" class="text-blue-600 underline">/docs</a>.</li>
<li><strong>Treinamento:</strong> capacitação periódica de equipe (ver Registros de Treinamento).</li>
<li><strong>Auditoria:</strong> revisão de logs e conformidade (ver Relatórios de Auditoria).</li>
<li><strong>Atendimento ao titular:</strong> canal e SLAs para direitos do Art. 18.</li>
</ol>`,
      },
      {
        title: "3. Ciclo de melhoria contínua",
        content: `<p>O programa segue o ciclo: mapear → avaliar riscos → implementar controles → monitorar → revisar. Mudanças relevantes no produto (novos módulos, integrações ou fluxos de dados) disparam revisão do ROPA e, quando necessário, nova DPIA.</p>`,
      },
    ],
  },
  {
    slug: "registro-operacoes-tratamento",
    title: "Registro de Operações de Tratamento (ROPA)",
    description:
      "Inventário das operações de tratamento: finalidade, dados, base legal, titulares e medidas de segurança.",
    legalBasis: "Art. 37 e Resolução CD/ANPD nº 14/2024",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Cadastro e autenticação de usuários",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Finalidade</td><td>Criar conta, autenticar e gerenciar perfis na plataforma</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Titulares</td><td>Pacientes, profissionais, empregadores, farmácias, voluntários, Angels</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Dados</td><td>Nome, CPF/CNPJ, e-mail, telefone, senha (hash), foto, registro profissional</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Base legal</td><td>Execução de contrato (Art. 7º, V) e legítimo interesse em segurança (Art. 7º, IX)</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Retenção</td><td>Enquanto a conta estiver ativa + prazos legais</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Segurança</td><td>Hash de senha, RBAC, auditoria de acesso</td></tr>
</table>`,
      },
      {
        title: "2. Prontuário eletrônico e teleconsulta",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Finalidade</td><td>Prestação de serviços de saúde, registro clínico e telemedicina</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Titulares</td><td>Pacientes</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Dados</td><td>Dados sensíveis de saúde: anamnese, sintomas, diagnósticos (CID), prescrições, exames, notas de sessão, escalas psicológicas</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Base legal</td><td>Tutela da saúde (Art. 11, II, f) e execução de contrato/prestação de serviço de saúde</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Compartilhamento</td><td>Profissional vinculado, compartilhamento autorizado, exportação FHIR com consentimento</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Segurança</td><td>Criptografia AES-256-GCM, audit log, TCLE obrigatório para vídeo</td></tr>
</table>`,
      },
      {
        title: "3. Videoconferência clínica",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Finalidade</td><td>Realizar teleconsultas entre paciente e profissional</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Operadores</td><td>Daily.co (primário), Google Meet (alternativo)</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Dados</td><td>Áudio/vídeo em tempo real; metadados de sessão; gravação apenas se habilitada e consentida</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Base legal</td><td>Tutela da saúde + consentimento específico (TCLE)</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Transferência internacional</td><td>Possível (EUA) — ver Registro de Transferência Internacional</td></tr>
</table>`,
      },
      {
        title: "4. Módulo empresarial (NR-1, EAP, denúncias)",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Finalidade</td><td>Saúde ocupacional, pesquisas de clima, canal de denúncias, documentação PGR/PCMSO</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Titulares</td><td>Colaboradores de empresas clientes</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Dados</td><td>Dados de saúde ocupacional, respostas anonimizadas em grupo, denúncias (mínimos necessários)</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Base legal</td><td>Obrigação legal/regulatória, tutela da saúde, legítimo interesse com salvaguardas</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Segurança</td><td>Anonimização em pesquisas com grupo mínimo, exportação auditável</td></tr>
</table>`,
      },
      {
        title: "5. Campanhas humanitárias e Angels",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Finalidade</td><td>Triagem, teleconsulta voluntária e acompanhamento pós-consulta</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Dados</td><td>Triagem, necessidades básicas, consentimento para contato Angel</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Base legal</td><td>Tutela da saúde, consentimento específico para contato de Angels</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Risco</td><td>Alto — requer DPIA dedicada</td></tr>
</table>`,
      },
      {
        title: "6. Pagamentos e assinatura digital",
        content: `<p><strong>Stripe:</strong> dados de pagamento (cartão, PIX, boleto) — base: execução de contrato.</p>
<p class="mt-2"><strong>Lacuna:</strong> assinatura ICP-Brasil de prescrições e documentos — base: obrigação legal e execução de serviço de saúde.</p>`,
      },
    ],
  },
  {
    slug: "termo-consentimento",
    title: "Termo de Consentimento (cadastro e serviços)",
    description:
      "Consentimento livre, informado e inequívoco para tratamentos baseados em consentimento na plataforma.",
    legalBasis: "Art. 7º, I e Art. 8º, LGPD",
    required: true,
    status: "partial",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Consentimentos coletados na plataforma",
        content: `${COMPANY_BLOCK}
<p class="mt-4">A Doctor8 registra consentimentos versionados com data, IP e user-agent. Tipos implementados:</p>
<ul class="list-disc pl-5 space-y-2 mt-2">
<li><strong>Termos de Uso</strong> — obrigatório no cadastro.</li>
<li><strong>Política de Privacidade</strong> — obrigatório no cadastro.</li>
<li><strong>HIPAA Authorization</strong> — usuários da região US.</li>
<li><strong>GDPR Consent</strong> — usuários da região EU.</li>
<li><strong>Marketing</strong> — opcional.</li>
<li><strong>TCLE Telemedicina</strong> — obrigatório antes de teleconsulta por vídeo (ver documento específico).</li>
</ul>`,
      },
      {
        title: "2. Características do consentimento",
        content: `<p>O consentimento é:</p>
<ul class="list-disc pl-5 space-y-2 mt-2">
<li><strong>Livre:</strong> não condicionado a serviços não relacionados, salvo os estritamente necessários.</li>
<li><strong>Informado:</strong> precedido de informações claras na Política de Privacidade e TCLE.</li>
<li><strong>Inequívoco:</strong> manifestação afirmativa (checkbox/ação explícita).</li>
<li><strong>Revogável:</strong> o titular pode revogar a qualquer momento, sem prejuízo de tratamentos baseados em outras hipóteses legais.</li>
</ul>`,
      },
      {
        title: "3. Limitação — dados de saúde",
        content: `<p>Para a maior parte do prontuário e da teleconsulta, a base legal principal é a <strong>tutela da saúde</strong> (Art. 11, II, f), não o consentimento genérico. Consentimentos específicos aplicam-se a finalidades distintas: marketing, gravação de vídeo, contato de Angels, pesquisa ou compartilhamento facultativo.</p>`,
      },
    ],
  },
  {
    slug: "designacao-encarregado-dpo",
    title: "Designação do Encarregado (DPO)",
    description: "Nomeação formal do encarregado pelo tratamento de dados com contato divulgado publicamente.",
    legalBasis: "Art. 41, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Designação",
        content: `${COMPANY_BLOCK}
<p class="mt-4">A INFO8 designa o Encarregado pelo Tratamento de Dados Pessoais (Data Protection Officer — DPO) da plataforma Doctor8, nos termos do Art. 41 da Lei nº 13.709/2018 (LGPD).</p>
<p class="mt-2">O Encarregado atua como canal de comunicação entre a INFO8, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD).</p>`,
      },
      {
        title: "2. Atribuições",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Aceitar reclamações e comunicações dos titulares, prestar esclarecimentos e adotar providências.</li>
<li>Receber comunicações da ANPD e adotar providências.</li>
<li>Orientar colaboradores e contratados sobre práticas de proteção de dados.</li>
<li>Executar demais atribuições determinadas pelo controlador ou pela legislação.</li>
</ul>`,
      },
      {
        title: "3. Canais de contato",
        content: `<p><strong>E-mail do Encarregado (DPO):</strong> <a href="mailto:dpo@doctor8.org" class="text-blue-600 underline">dpo@doctor8.org</a></p>
<p class="mt-2"><strong>Controladoria / privacidade:</strong> <a href="mailto:controladoria@doctor8.com.br" class="text-blue-600 underline">controladoria@doctor8.com.br</a></p>
<p class="mt-2"><strong>Endereço:</strong> Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, CEP 30.320-595</p>
<p class="mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong>Nota interna:</strong> unificar todos os pontos de contato do site para o e-mail oficial do DPO e registrar o nome do encarregado neste documento após formalização interna.</p>`,
      },
    ],
  },
  {
    slug: "dpia",
    title: "DPIA — Avaliação de Impacto à Proteção de Dados",
    description:
      "Relatório de impacto para tratamentos de alto risco, incluindo dados sensíveis de saúde em escala.",
    legalBasis: "Art. 38 e Resolução CD/ANPD nº 4/2021",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Identificação do tratamento",
        content: `${COMPANY_BLOCK}
<p class="mt-4"><strong>Tratamento avaliado:</strong> plataforma Doctor8 — telemedicina, prontuário eletrônico, módulo empresarial e campanhas humanitárias.</p>
<p class="mt-2"><strong>Natureza:</strong> tratamento de dados sensíveis de saúde em larga escala, com transferências internacionais e compartilhamento com operadores.</p>
<p class="mt-2"><strong>Classificação de risco:</strong> <strong>ALTO</strong> — dados de saúde + escala + tecnologias de terceiros + fluxo humanitário com voluntários (Angels).</p>`,
      },
      {
        title: "2. Necessidade e proporcionalidade",
        content: `<p>O tratamento é necessário para viabilizar teleconsultas, prontuário eletrônico, prescrições digitais, saúde ocupacional e atendimento humanitário. A plataforma coleta apenas dados adequados e relevantes à finalidade, com minimização em fluxos de denúncia e pesquisas empresariais.</p>`,
      },
      {
        title: "3. Riscos identificados",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Vazamento de prontuário por acesso indevido.</li>
<li>Interceptação de videoconferência.</li>
<li>Transferência internacional sem salvaguardas adequadas.</li>
<li>Compartilhamento excessivo com Angels no fluxo humanitário.</li>
<li>Uso de IA em notas clínicas sem supervisão adequada.</li>
<li>Exclusão de conta incompatível com retenção legal de prontuário (CFM 10 anos).</li>
</ul>`,
      },
      {
        title: "4. Medidas de mitigação",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Criptografia AES-256-GCM em repouso; TLS em trânsito.</li>
<li>RBAC, audit log completo, TCLE obrigatório para vídeo.</li>
<li>Consentimento separado para Angels; dados limitados ao acompanhamento.</li>
<li>Contratos/DPA com subprocessadores; registro de transferências.</li>
<li>Revisão humana de conteúdo clínico assistido por IA.</li>
<li>Política de retenção alinhada a CFM/CFP (ver documento específico).</li>
</ul>`,
      },
      {
        title: "5. Conclusão e revisão",
        content: `<p>Com as medidas implementadas e as ações pendentes descritas em <a href="/docs" class="text-blue-600 underline">Próximos Passos</a>, o risco residual é considerado <strong>aceitável sob monitoramento contínuo</strong>. Esta DPIA deve ser revisada anualmente ou quando houver nova funcionalidade de alto impacto (ex.: gravação em nuvem habilitada em produção).</p>`,
      },
    ],
  },
  {
    slug: "mapeamento-fluxo-dados",
    title: "Mapeamento de Fluxo de Dados",
    description: "Inventário do ciclo de vida dos dados: coleta, uso, armazenamento, compartilhamento e descarte.",
    legalBasis: "Boa prática / accountability (Art. 50, LGPD)",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Coleta",
        content: `<ul class="list-disc pl-5 space-y-2">
<li><strong>Cadastro web/app:</strong> formulários de registro por papel (paciente, profissional, empregador).</li>
<li><strong>Intake humanitário:</strong> triagem e anamnese em campanhas (ex.: SOS Venezuela).</li>
<li><strong>Consulta:</strong> dados clínicos inseridos pelo profissional durante ou após teleconsulta.</li>
<li><strong>Integrações:</strong> Stripe (pagamento), Google Calendar (agenda), FHIR/SMART (portabilidade com consentimento).</li>
</ul>`,
      },
      {
        title: "2. Uso e armazenamento",
        content: `<p>Dados persistidos em banco relacional (PostgreSQL) com campos sensíveis criptografados. Arquivos (exames, anexos) em armazenamento objeto (S3) por região. Logs de auditoria em tabela dedicada.</p>`,
      },
      {
        title: "3. Compartilhamento",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Profissional ↔ paciente (vínculo com aceite do paciente).</li>
<li>Compartilhamento de prontuário entre profissionais (permissão VIEW/EDIT, revogável).</li>
<li>Subprocessadores: vídeo, nuvem, pagamento, assinatura.</li>
<li>Exportação FHIR/PDF pelo titular ou profissional autorizado.</li>
<li>Angels: subset de dados humanitários com consentimento específico.</li>
</ul>`,
      },
      {
        title: "4. Descarte",
        content: `<p>Solicitação de exclusão via API do titular agenda eliminação em 30 dias, respeitando retenções legais de prontuário. Backups seguem política de ciclo de vida do provedor de nuvem.</p>`,
      },
    ],
  },
  {
    slug: "procedimento-atendimento-titular",
    title: "Procedimento de Atendimento ao Titular",
    description: "Fluxo para garantir exercício dos direitos: acesso, correção, eliminação e portabilidade.",
    legalBasis: "Art. 18, LGPD",
    required: true,
    status: "partial",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Canais de solicitação",
        content: `<p>O titular pode exercer seus direitos por:</p>
<ul class="list-disc pl-5 space-y-2 mt-2">
<li><strong>E-mail:</strong> <a href="mailto:controladoria@doctor8.com.br" class="text-blue-600 underline">controladoria@doctor8.com.br</a> ou <a href="mailto:dpo@doctor8.org" class="text-blue-600 underline">dpo@doctor8.org</a></li>
<li><strong>Plataforma:</strong> exportação de dados em JSON (<code>GET /api/user/data</code>) e solicitação de exclusão (<code>DELETE /api/user/data</code>)</li>
<li><strong>Correção:</strong> edição direta no perfil e prontuário, ou solicitação ao suporte</li>
</ul>`,
      },
      {
        title: "2. Direitos atendidos",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Confirmação da existência de tratamento</li>
<li>Acesso aos dados (exportação JSON com PHI descriptografado)</li>
<li>Correção de dados incompletos ou desatualizados</li>
<li>Anonimização, bloqueio ou eliminação (com exceções legais)</li>
<li>Portabilidade (JSON e FHIR R4)</li>
<li>Informação sobre compartilhamentos</li>
<li>Revogação do consentimento</li>
</ul>`,
      },
      {
        title: "3. Prazos e verificação",
        content: `<p>Solicitações por e-mail serão respondidas em até <strong>15 dias</strong>, prorrogáveis por mais 15 dias mediante justificativa, conforme Art. 18, § 3º da LGPD.</p>
<p class="mt-2">A INFO8 poderá solicitar confirmação de identidade antes de atender pedidos sensíveis. Solicitações manifestamente infundadas ou abusivas poderão ser recusadas nos termos da lei.</p>`,
      },
      {
        title: "4. Exceções à eliminação",
        content: `<p>Prontuários e registros clínicos podem ser mantidos pelo prazo legal mínimo (CFM: 10 anos; CFP: 5 anos para documentos psicológicos), mesmo após exclusão da conta, quando o profissional ou a INFO8 tiver obrigação de guarda.</p>`,
      },
    ],
  },
  {
    slug: "plano-resposta-incidentes",
    title: "Plano de Resposta a Incidentes",
    description: "Fluxo de resposta a incidentes de segurança, incluindo comunicação à ANPD e aos titulares.",
    legalBasis: "Art. 48 e Resolução CD/ANPD nº 15/2024",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Definição de incidente",
        content: `<p>Incidente de segurança: evento adverso confirmado ou com indícios razoáveis que comprometa a confidencialidade, integridade ou disponibilidade de dados pessoais, ou que possa acarretar risco ou dano relevante aos titulares.</p>`,
      },
      {
        title: "2. Fases de resposta",
        content: `<ol class="list-decimal pl-5 space-y-2">
<li><strong>Detecção:</strong> alertas de infraestrutura, relatórios internos, titulares ou ANPD.</li>
<li><strong>Contenção:</strong> revogar acessos, isolar sistemas, rotacionar chaves, preservar evidências.</li>
<li><strong>Avaliação:</strong> natureza dos dados, volume, titulares afetados, gravidade e probabilidade de dano.</li>
<li><strong>Comunicação:</strong> ANPD em prazo razoável (orientação: 72h úteis para incidentes graves); titulares quando houver risco relevante.</li>
<li><strong>Recuperação:</strong> restauração segura, correção de vulnerabilidade.</li>
<li><strong>Lições aprendidas:</strong> registro do incidente e atualização de controles.</li>
</ol>`,
      },
      {
        title: "3. Equipe e registro",
        content: `<p><strong>Coordenação:</strong> DPO + liderança técnica INFO8.</p>
<p class="mt-2">Todo incidente confirmado gera registro com: data, descrição, dados afetados, medidas adotadas, comunicações realizadas e status de encerramento.</p>`,
      },
    ],
  },
  {
    slug: "registro-transferencia-internacional",
    title: "Registro de Transferência Internacional de Dados",
    description: "Documentação da base legal para transferências quando há uso de cloud ou serviços no exterior.",
    legalBasis: "Art. 33, LGPD e Resolução ANPD nº 19/2024",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Transferências identificadas",
        content: `<table class="w-full text-sm border-collapse mt-2">
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Daily.co</td><td>Videoconferência clínica — possível processamento nos EUA</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">AWS</td><td>Hospedagem e armazenamento — região configurável (BR/US/EU)</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Stripe</td><td>Pagamentos — processamento internacional</td></tr>
<tr class="border-b"><td class="py-2 pr-4 font-semibold">Google</td><td>Google Meet e Calendar — possível processamento nos EUA</td></tr>
<tr><td class="py-2 pr-4 font-semibold">Lacuna</td><td>Assinatura digital ICP-Brasil</td></tr>
</table>`,
      },
      {
        title: "2. Bases legais e salvaguardas",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Cláusulas contratuais padrão ou termos de proteção de dados dos fornecedores.</li>
<li>Consentimento específico do titular quando aplicável (ex.: TCLE para teleconsulta).</li>
<li>Seleção de região de dados na conta (US/EU) quando disponível.</li>
<li>Avaliação de país com nível adequado de proteção ou garantias suplementares.</li>
</ul>`,
      },
      {
        title: "3. Residência de dados na Doctor8",
        content: `<p>A plataforma suporta residência de dados por região da conta. Usuários BR devem preferir infraestrutura e subprocessadores com tratamento compatível com a LGPD. Detalhes adicionais constam da Política de Privacidade, seção de transferências internacionais.</p>`,
      },
    ],
  },
  {
    slug: "procedimento-anonimizacao",
    title: "Procedimento de Anonimização e Pseudonimização",
    description: "Técnicas para uso de dados de saúde em pesquisa, estatística ou melhoria de serviços.",
    legalBasis: "Art. 12, LGPD",
    required: true,
    status: "draft",
    lastUpdated: "Julho de 2026",
    sections: [
      {
        title: "1. Definições",
        content: `<p><strong>Pseudonimização:</strong> remoção ou substituição de identificadores diretos, mantendo possibilidade de reidentificação com informação adicional controlada.</p>
<p class="mt-2"><strong>Anonimização:</strong> tratamento irreversível que impede reidentificação do titular, nos termos do Art. 12.</p>`,
      },
      {
        title: "2. Casos de uso na Doctor8",
        content: `<ul class="list-disc pl-5 space-y-2">
<li>Pesquisas de clima empresarial com agregação e grupo mínimo de respondentes.</li>
<li>Estatísticas operacionais internas (volume de consultas, especialidades).</li>
<li>Suporte com IA: contexto configurado para excluir PII nas interações de ajuda.</li>
</ul>`,
      },
      {
        title: "3. Procedimento",
        content: `<ol class="list-decimal pl-5 space-y-2">
<li>Definir finalidade e base legal do uso estatístico/pesquisa.</li>
<li>Remover identificadores diretos (nome, CPF, e-mail, telefone).</li>
<li>Avaliar risco de reidentificação por dados indiretos.</li>
<li>Documentar técnica aplicada e aprovar com DPO antes de publicação externa.</li>
<li>Dados anonimizados corretamente estão fora do escopo da LGPD (Art. 12).</li>
</ol>`,
      },
    ],
  },
];
