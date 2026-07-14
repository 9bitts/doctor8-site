import type { Lang } from "@/lib/i18n/translations";

export type GuidePortalId =
  | "professional"
  | "psychologist"
  | "nutritionist"
  | "nurse"
  | "pharmacist"
  | "dentist"
  | "psychoanalyst"
  | "integrative-therapist";

export type GuideFeature = {
  title: string;
  description: string;
  bullets?: string[];
};

export type GuideSection = {
  id: string;
  title: string;
  intro?: string;
  features: GuideFeature[];
  /** Portais que devem ver esta seção destacada no topo */
  highlightFor?: GuidePortalId[];
};

export type GuideContent = {
  pageTitle: string;
  pageSubtitle: string;
  tocTitle: string;
  yourPortalBadge: string;
  sections: GuideSection[];
};

const pt: GuideContent = {
  pageTitle: "Como Usar a Doctor8",
  pageSubtitle:
    "Guia completo da plataforma — o que cada profissão e cada paciente pode fazer, passo a passo.",
  tocTitle: "Índice",
  yourPortalBadge: "Seu portal",
  sections: [
    {
      id: "intro",
      title: "O que é a Doctor8",
      intro:
        "A Doctor8 é uma plataforma de saúde digital que conecta pacientes e profissionais de saúde para teleconsultas, prontuário eletrônico, prescrições digitais, gestão de clínicas e programas corporativos de bem-estar. Tudo em um só lugar, com segurança e conformidade (LGPD, CFM, CFP, CFF, CRO, COREN, CRN).",
      features: [
        {
          title: "Para quem serve",
          description:
            "Pacientes que buscam atendimento; médicos, psicólogos, enfermeiros, nutricionistas, farmacêuticos, dentistas, psicanalistas e terapeutas integrativos; clínicas; empresas (NR-1 e EAP); farmácias e laboratórios da rede.",
        },
        {
          title: "O que você encontra aqui",
          description:
            "Este guia explica cada função da plataforma, organizado por tipo de usuário. Use o índice à esquerda para ir direto ao que precisa.",
        },
      ],
    },
    {
      id: "primeiros-passos",
      title: "Primeiros passos (todos os profissionais)",
      intro: "Antes de atender, configure estes itens no seu painel.",
      features: [
        {
          title: "Dashboard",
          description: "Visão geral do seu dia: consultas, pendências, alertas e atalhos rápidos.",
          bullets: [
            "Acesse pelo menu lateral — é a página inicial do seu portal.",
            "Veja consultas de hoje, mensagens não lidas e itens que precisam de atenção.",
          ],
        },
        {
          title: "Perfil e registro profissional",
          description: "Complete CRM, CRP, COREN, CRN, CRF, CRO ou registro da sua categoria.",
          bullets: [
            "Vá em Meu Perfil → preencha dados pessoais, especialidade e número do conselho.",
            "Sem registro validado, algumas funções ficam bloqueadas.",
            "Configure foto, bio e valor da consulta.",
          ],
        },
        {
          title: "Disponibilidade",
          description: "Defina dias e horários em que pacientes podem agendar com você.",
          bullets: [
            "Menu Atender agora → Disponibilidade.",
            "Crie blocos de horário por dia da semana.",
            "Pacientes só veem slots dentro da sua agenda aberta.",
          ],
        },
        {
          title: "Conta e segurança",
          description: "Gerencie senha, e-mail, idioma, fuso horário e preferências.",
          bullets: [
            "Menu Conta → altere senha, verifique e-mail e configure notificações.",
            "Ative verificação por SMS para maior segurança.",
          ],
        },
        {
          title: "Checklist de configuração",
          description: "O painel mostra um checklist automático até você completar perfil, disponibilidade e primeiro paciente.",
        },
        {
          title: "Tour guiado",
          description: "Na primeira visita, um tour interativo apresenta o menu lateral. Você pode repetir pelo suporte.",
        },
        {
          title: "Assistente de suporte (IA)",
          description: "Botão flutuante no canto da tela — tire dúvidas sobre qualquer função da plataforma em tempo real.",
        },
      ],
    },
    {
      id: "pacientes",
      title: "Pacientes — tudo que o paciente pode fazer",
      intro: "Entenda o que seus pacientes veem e como interagem com a Doctor8.",
      features: [
        {
          title: "Cadastro e TCLE",
          description: "Pacientes se cadastram em doctor8.com.br, aceitam o Termo de Consentimento para Telemedicina (TCLE) e verificam e-mail.",
        },
        {
          title: "Atendimento imediato (Urgente)",
          description: "Fila paga de plantão — paciente entra na fila e é atendido pelo próximo profissional online (médico, psicólogo ou dentista).",
          bullets: [
            "Pagamento antes de entrar na fila.",
            "Vídeo via Daily.co dentro da plataforma.",
            "Profissional precisa estar online no Plantão (JIT).",
          ],
        },
        {
          title: "Agendar consulta",
          description: "Buscar profissionais no mapa ou diretório, ver perfil público (/dr/nome) e agendar horário disponível.",
          bullets: [
            "Pagamento online ou conforme configuração do profissional.",
            "Lembrete por WhatsApp e e-mail antes da consulta.",
            "Reagendamento gratuito com mais de 24h de antecedência.",
          ],
        },
        {
          title: "Teleconsulta (vídeo)",
          description: "Na hora da consulta, paciente entra pela agenda ou link — sala de vídeo segura com janela de ±10 minutos.",
        },
        {
          title: "Histórico médico",
          description: "Prontuário consolidado: diagnósticos, alergias, vacinas, exames, evoluções — tudo que os profissionais registraram.",
        },
        {
          title: "Prescrições e receitas",
          description: "Visualiza, baixa PDF e compartilha receitas digitais assinadas. Farmácias podem validar por QR Code.",
        },
        {
          title: "Pedidos de exame",
          description: "Solicitações de laboratório e imagem emitidas pelo profissional, com PDF para apresentar no laboratório.",
        },
        {
          title: "Documentos clínicos",
          description: "Atestados, relatórios, laudos e outros documentos emitidos pelos profissionais.",
        },
        {
          title: "Medicamentos",
          description: "Lista de medicamentos em uso com histórico de prescrições.",
        },
        {
          title: "Mensagens",
          description: "Chat assíncrono com profissionais vinculados — não substitui emergência.",
        },
        {
          title: "Nutrição, enfermagem e cuidado integrativo",
          description: "Paciente vê planos alimentares, diário alimentar, cuidados de enfermagem e registros de terapias integrativas compartilhados pelos profissionais.",
        },
        {
          title: "Farmácia e rede de preços",
          description: "Busca medicamentos na rede Doctor8, compara preços entre farmácias parceiras e faz pedidos.",
        },
        {
          title: "Club Doctor e clube de compras",
          description: "Programa de benefícios com selos e descontos em medicamentos.",
        },
        {
          title: "Recursos educacionais",
          description: "Materiais que o profissional compartilhou (artigos, vídeos, orientações).",
        },
        {
          title: "Apps conectados (FHIR)",
          description: "Paciente autoriza apps de saúde externos a acessar seus dados via padrão SMART on FHIR.",
        },
        {
          title: "Atendimento humanitário",
          description: "Campanhas gratuitas (ex.: SOS Venezuela) — triagem, fila de voluntários e consulta sem custo.",
        },
        {
          title: "Meus profissionais",
          description: "Lista de profissionais com quem o paciente já consultou ou está vinculado.",
        },
      ],
    },
    {
      id: "medicos",
      title: "Médicos",
      highlightFor: ["professional"],
      intro: "Portal do médico (CRM) — todas as especialidades médicas.",
      features: [
        {
          title: "Plantão (JIT)",
          description: "Atendimento imediato pago — fique online, receba pacientes da fila e atenda por vídeo.",
          bullets: [
            "Ative/desative com um clique.",
            "Defina pausa temporária sem sair da fila.",
            "Receba pagamento após a consulta.",
          ],
        },
        {
          title: "Agenda de consultas",
          description: "Veja consultas do dia, semana e mês. Confirme, cancele ou reagende.",
        },
        {
          title: "Pacientes e prontuário",
          description: "Lista de pacientes com prontuário eletrônico completo.",
          bullets: [
            "Diagnósticos com busca CID-10.",
            "Evoluções, anamnese, exame físico.",
            "Vacinas, alergias, antropometria.",
            "Compartilhar prontuário com colega.",
            "Convidar paciente para vincular.",
            "Exportar PDF do prontuário.",
          ],
        },
        {
          title: "Prontuários compartilhados",
          description: "Prontuários que colegas compartilharam com você — acesso somente leitura ou conforme permissão.",
        },
        {
          title: "Prescrições digitais",
          description: "Receitas com busca na base Anvisa, interações, PDF e assinatura digital ICP-Brasil.",
          bullets: [
            "Medicamentos, manipulados, controle especial.",
            "Envio por WhatsApp e e-mail ao paciente.",
            "Templates salvos para prescrições frequentes.",
          ],
        },
        {
          title: "Integrativa",
          description: "Módulo de práticas integrativas para médicos: fitoterapia, florais de Bach, homeopatia, aromaterapia, apiterapia e cannabis medicinal (RDC 1.015/2026).",
          bullets: [
            "Catálogo de monografias oficiais.",
            "Protocolos sugeridos com pré-preenchimento.",
            "Prescrição integrada ao prontuário.",
          ],
        },
        {
          title: "Chás medicinais",
          description: "Catálogo e estudo de chás com indicações e prescrição.",
        },
        {
          title: "Área de psicologia (para médicos)",
          description: "Módulos psicológicos embutidos: escalas, sessões, anamnese psicológica, documentos e receita saúde.",
        },
        {
          title: "Solicitação de exames",
          description: "Pedidos de laboratório e imagem com templates e PDF.",
        },
        {
          title: "Mensagens",
          description: "Chat com pacientes — responda quando conveniente, histórico preservado.",
        },
        {
          title: "Templates de documentos",
          description: "Modelos de atestados, relatórios e receitas para agilizar a rotina.",
        },
        {
          title: "Pesquisa científica (IA)",
          description: "Busca na literatura médica com assistente de IA para embasar condutas.",
        },
        {
          title: "Salas de reunião (anfiteatro)",
          description: "Salas de vídeo para grupos — supervisão, reuniões de equipe, aulas.",
        },
        {
          title: "Configurações de clínica",
          description: "Se atua em clínica com múltiplos profissionais, configure convênios e equipe.",
        },
        {
          title: "Biblioteca e cursos",
          description: "Compartilhe materiais educacionais com pacientes. Crie e venda cursos na plataforma.",
        },
        {
          title: "Financeiro",
          description: "Receitas de consultas, plantão e cursos. Histórico de pagamentos e repasses.",
        },
        {
          title: "Doctor Connection",
          description: "Assinatura profissional com benefícios: destaque no diretório, ferramentas avançadas.",
        },
        {
          title: "Clube de compras",
          description: "Compras coletivas de insumos e medicamentos com preços especiais.",
        },
        {
          title: "Notas de consulta com IA",
          description: "Durante ou após a consulta, a IA sugere notas estruturadas para o prontuário.",
        },
        {
          title: "Assinatura digital",
          description: "Assine prescrições e documentos com certificado ICP-Brasil (Lacuna).",
        },
        {
          title: "Voluntariado humanitário",
          description: "Atenda gratuitamente em campanhas — item fixo no menu lateral com coração Brasil-Venezuela.",
        },
      ],
    },
    {
      id: "psicologos",
      title: "Psicólogos",
      highlightFor: ["psychologist"],
      intro: "Portal exclusivo para psicólogos (CRP) — além de tudo do médico, módulos clínicos de psicologia.",
      features: [
        {
          title: "Tudo do portal médico, adaptado",
          description: "Agenda, pacientes, plantão (JIT), mensagens, financeiro, salas de reunião, pesquisa, biblioteca e cursos.",
        },
        {
          title: "Sessões clínicas",
          description: "Registro de sessões com formatos DAP, BIRP, SOAP e notas livres.",
          bullets: [
            "Histórico cronológico por paciente.",
            "Notas com IA (sugestão automática).",
          ],
        },
        {
          title: "Anamnese psicológica",
          description: "Formulários digitais de intake — envie link ao paciente para preencher antes da consulta.",
        },
        {
          title: "Escalas psicométricas",
          description: "PHQ-9, GAD-7, BAI, BDI-II, DASS-21 — aplique, acompanhe evolução e veja gráficos.",
        },
        {
          title: "Documentos psicológicos",
          description: "TCLE, relatórios psicológicos, termos e declarações com templates.",
        },
        {
          title: "Receita Saúde",
          description: "Emissão de receita para reembolso de planos de saúde (conforme regulamentação).",
        },
        {
          title: "Chat do prontuário (IA)",
          description: "Pergunte à IA sobre o histórico do paciente — respostas baseadas no prontuário.",
        },
        {
          title: "Google Calendar",
          description: "Sincronização bidirecional — consultas Doctor8 aparecem no seu Google Calendar.",
        },
        {
          title: "Compliance CFP",
          description: "Ferramentas de conformidade com resoluções do Conselho Federal de Psicologia.",
        },
        {
          title: "Rede empresas (EAP)",
          description: "Aceite convites de empresas para atender colaboradores no programa de Assistência Psicológica.",
          bullets: [
            "Veja empresas disponíveis em Empresas.",
            "Consultas EAP com faturamento automático para a empresa.",
          ],
        },
        {
          title: "Alertas de risco",
          description: "Sistema detecta indicadores de risco nas escalas e alerta o profissional.",
        },
      ],
    },
    {
      id: "nutricionistas",
      title: "Nutricionistas",
      highlightFor: ["nutritionist"],
      intro: "Portal para nutricionistas (CRN) — consultório nutricional completo.",
      features: [
        {
          title: "Agenda e pacientes",
          description: "Consultas agendadas, prontuário nutricional e mensagens — mesma base dos demais portais.",
        },
        {
          title: "Anamnese nutricional",
          description: "Histórico alimentar, hábitos, patologias, medicamentos e recordatório.",
        },
        {
          title: "Antropometria",
          description: "Registro de peso, altura, circunferências, dobras cutâneas e composição corporal com gráficos de evolução.",
        },
        {
          title: "Planos alimentares",
          description: "Monte planos com refeições, porções e substituições. Gere PDF para o paciente.",
        },
        {
          title: "Diário alimentar",
          description: "Paciente registra o que comeu; você analisa e orienta no retorno.",
        },
        {
          title: "Lista de compras",
          description: "Gere lista de compras a partir do plano alimentar.",
        },
      ],
    },
    {
      id: "enfermeiros",
      title: "Enfermeiros",
      highlightFor: ["nurse"],
      intro: "Portal para enfermeiros (COREN) — processo de enfermagem digital.",
      features: [
        {
          title: "SAE — Processo de Enfermagem",
          description: "Sistematização da Assistência de Enfermagem: histórico, diagnósticos NANDA, planejamento, implementação e avaliação.",
        },
        {
          title: "Escalas de avaliação",
          description: "Braden (úlcera por pressão), Morse (queda), escala de dor, Glasgow e outras.",
        },
        {
          title: "Prescrição de cuidados",
          description: "Planos de cuidado de enfermagem com intervenções e horários.",
        },
        {
          title: "Medicamentos (enfermagem)",
          description: "Prescrição de medicamentos no âmbito da enfermagem.",
        },
        {
          title: "Checagem de medicação",
          description: "Registro de administração — horário, dose, via, profissional responsável.",
        },
        {
          title: "SBAR",
          description: "Comunicação estruturada de passagem de plantão: Situação, Background, Avaliação, Recomendação.",
        },
        {
          title: "Monitoramento",
          description: "Sinais vitais, glicemia, balanço hídrico e outros parâmetros com gráficos.",
        },
      ],
    },
    {
      id: "farmaceuticos",
      title: "Farmacêuticos clínicos",
      highlightFor: ["pharmacist"],
      intro: "Portal para farmacêuticos (CRF) — telefarmácia conforme Resolução CFF 727.",
      features: [
        {
          title: "Revisão farmacêutica",
          description: "Análise completa da terapia medicamentosa do paciente — adequação, duplicidades, doses.",
        },
        {
          title: "Conciliação medicamentosa",
          description: "Compare listas de medicamentos de diferentes fontes e harmonize.",
        },
        {
          title: "Monitoramento terapêutico",
          description: "Acompanhe adesão, efeitos adversos e resultados de exames relacionados aos medicamentos.",
        },
        {
          title: "Prescrição farmacêutica",
          description: "Prescreva no âmbito da farmácia clínica (conforme legislação vigente).",
        },
        {
          title: "Educação em saúde",
          description: "Orientações ao paciente sobre uso correto de medicamentos.",
        },
        {
          title: "Dispensação",
          description: "Validação e registro de dispensação de medicamentos.",
        },
        {
          title: "Interações medicamentosas",
          description: "Verificação automática de interações entre fármacos.",
        },
        {
          title: "Intake pré-consulta",
          description: "Formulário que o paciente preenche antes da teleconsulta farmacêutica.",
        },
      ],
    },
    {
      id: "dentistas",
      title: "Dentistas",
      highlightFor: ["dentist"],
      intro: "Portal para cirurgiões-dentistas (CRO) — odontologia digital completa.",
      features: [
        {
          title: "Plantão (JIT) odontológico",
          description: "Atendimento imediato — mesmo fluxo do plantão médico, para urgências odontológicas.",
        },
        {
          title: "Anamnese odontológica",
          description: "Histórico médico-odontológico, hábitos, alergias e queixa principal.",
        },
        {
          title: "Odontograma",
          description: "Charting interativo FDI — registre condições, tratamentos e procedimentos por dente.",
        },
        {
          title: "Periodontograma",
          description: "Sondagem, sangramento, recessão e mobilidade por sextante.",
        },
        {
          title: "Plano de tratamento",
          description: "Planeje procedimentos com orçamento e acompanhe execução.",
        },
        {
          title: "Prótese",
          description: "Acompanhamento de trabalhos protéticos e laboratório.",
        },
        {
          title: "Ortodontia",
          description: "Módulo ortodôntico com registro de fases e aparelhos.",
        },
        {
          title: "Fotos clínicas",
          description: "Galeria de fotos intra e extraorais por paciente.",
        },
        {
          title: "Cadeiras / operatórios",
          description: "Gerencie cadeiras e vincule à agenda.",
        },
        {
          title: "Prescrições odontológicas",
          description: "Receitas e atestados específicos para odontologia.",
        },
      ],
    },
    {
      id: "psicanalistas",
      title: "Psicanalistas",
      highlightFor: ["psychoanalyst"],
      intro: "Portal dedicado com role própria — prontuário criptografado e ferramentas psicanalíticas.",
      features: [
        {
          title: "Analisandos",
          description: "Pacientes com prontuário criptografado de ponta a ponta — máxima confidencialidade.",
          bullets: [
            "Notas de sessão seguras.",
            "Histórico de sessões cronológico.",
          ],
        },
        {
          title: "Freud AI",
          description: "Assistente de IA com abordagem psicanalítica — apoio à reflexão clínica (não substitui supervisão).",
        },
        {
          title: "Agenda e disponibilidade",
          description: "Consultas presenciais ou online com gestão de horários.",
        },
        {
          title: "Mensagens",
          description: "Comunicação com analisandos.",
        },
        {
          title: "Biblioteca e pesquisa",
          description: "Recursos clínicos e busca na literatura psicanalítica.",
        },
        {
          title: "Salas de reunião",
          description: "Grupos, supervisão e intervisão por vídeo.",
        },
        {
          title: "Financeiro",
          description: "Controle de pagamentos de sessões.",
        },
        {
          title: "Notas de consulta com IA",
          description: "Sugestões de registro após a sessão.",
        },
      ],
    },
    {
      id: "terapeutas-integrativos",
      title: "Terapeutas integrativos",
      highlightFor: ["integrative-therapist"],
      intro: "Portal para terapeutas de práticas integrativas e complementares (PICS).",
      features: [
        {
          title: "Clientes",
          description: "Gestão de clientes com prontuário integrativo.",
        },
        {
          title: "Prescrições integrativas",
          description: "Receitas de fitoterapia, florais, homeopatia e outras práticas.",
        },
        {
          title: "Medicina natural",
          description: "5 práticas PICS: fitoterapia, florais de Bach, homeopatia, aromaterapia, apiterapia — catálogos e monografias.",
        },
        {
          title: "Fitoterapia, florais e chás",
          description: "Módulos dedicados com catálogo, referência e prescrição.",
        },
        {
          title: "Consultório (workspace)",
          description: "Tela de consulta com prontuário ao lado do vídeo — tudo em uma tela.",
        },
        {
          title: "Pesquisa e salas de reunião",
          description: "Literatura científica e vídeo para grupos.",
        },
      ],
    },
    {
      id: "consultas",
      title: "Consultas e telemedicina",
      intro: "Como funcionam os três tipos de atendimento na Doctor8.",
      features: [
        {
          title: "Consulta agendada",
          description: "Paciente escolhe horário → paga → recebe lembrete → entra na sala de vídeo no horário.",
          bullets: [
            "Reagendamento gratuito (>24h).",
            "Cancelamento com reembolso se futuro.",
            "Exportar para Google Calendar / .ics.",
          ],
        },
        {
          title: "Plantão JIT (imediato)",
          description: "Paciente entra na fila → profissional online chama o próximo → consulta por vídeo.",
          bullets: [
            "Pagamento antes de entrar.",
            "Profissional: ative o plantão no menu JIT.",
            "Fila com posição em tempo real.",
          ],
        },
        {
          title: "Humanitário (gratuito)",
          description: "Campanhas especiais — triagem, fila de voluntários, sem pagamento.",
          bullets: [
            "Profissionais voluntários atendem pelo menu Voluntariado Humanitário.",
            "Pode incluir handoff para WhatsApp ou Google Meet.",
          ],
        },
        {
          title: "Sala de vídeo",
          description: "Daily.co integrado — câmera, microfone, chat, compartilhamento de tela.",
          bullets: [
            "Janela de entrada: 10 min antes até 10 min depois.",
            "Google Meet como alternativa quando configurado.",
          ],
        },
        {
          title: "Intake pré-consulta",
          description: "Paciente preenche formulário de entrada dentro da janela da consulta.",
        },
        {
          title: "Notas e evolução",
          description: "Registre notas durante ou após — com sugestão de IA.",
        },
      ],
    },
    {
      id: "comunicacao",
      title: "Comunicação",
      features: [
        {
          title: "Mensagens in-app",
          description: "Chat assíncrono entre paciente e profissional — histórico preservado no prontuário.",
        },
        {
          title: "WhatsApp",
          description: "Lembretes de consulta, envio de receitas e documentos por template oficial Meta.",
          bullets: [
            "Automático antes da consulta.",
            "Profissional pode enviar documentos após a consulta.",
          ],
        },
        {
          title: "E-mail",
          description: "Confirmações, verificação de conta, recuperação de senha e envio de documentos.",
        },
        {
          title: "SMS",
          description: "Verificação de conta e recuperação de senha por código OTP.",
        },
        {
          title: "Notificações push",
          description: "Alertas no navegador para mensagens e consultas.",
        },
        {
          title: "Google Calendar",
          description: "Sincronização de agenda (psicólogos e profissionais que ativarem).",
        },
      ],
    },
    {
      id: "clinicas",
      title: "Clínicas e organizações",
      intro: "Portal /organization para gestão de clínicas com múltiplos profissionais.",
      features: [
        {
          title: "Dashboard da clínica",
          description: "Visão consolidada de consultas, receita e equipe.",
        },
        {
          title: "Agenda multi-profissional",
          description: "Consultas de todos os profissionais da clínica em um só lugar.",
        },
        {
          title: "Pacientes da clínica",
          description: "Cadastro centralizado de pacientes.",
        },
        {
          title: "Financeiro e razão",
          description: "Receitas, despesas e razão contábil.",
        },
        {
          title: "Convênios",
          description: "Gestão de planos de saúde e TISS (guias e lotes).",
        },
        {
          title: "RH e folha",
          description: "Gestão de colaboradores da clínica.",
        },
        {
          title: "Contabilidade e notas fiscais",
          description: "Exportações contábeis e emissão de notas.",
        },
        {
          title: "Compras e marketing",
          description: "Pedidos de compra e campanhas de marketing da clínica.",
        },
        {
          title: "Equipe",
          description: "Convide profissionais, defina papéis e permissões.",
        },
        {
          title: "Relatórios",
          description: "Analytics de atendimentos, faturamento e produtividade.",
        },
      ],
    },
    {
      id: "empresas",
      title: "Empresas (NR-1, EAP, PCMSO)",
      intro: "Portal /empresas para gestão de saúde ocupacional e bem-estar corporativo.",
      features: [
        {
          title: "Inventário de riscos (NR-1)",
          description: "Mapeie riscos psicossociais e ergonômicos conforme a nova NR-1.",
        },
        {
          title: "AEP — Avaliação Ergonômica",
          description: "Avaliação ergonômica preliminar digital.",
        },
        {
          title: "Plano de ação (PDCA)",
          description: "Planos de ação com ciclo PDCA para mitigação de riscos.",
        },
        {
          title: "Pesquisas (COPSOQ / HSE-IT)",
          description: "Aplique pesquisas de clima e risco psicossocial — link para colaboradores.",
        },
        {
          title: "EAP — Assistência Psicológica",
          description: "Colaboradores agendam consultas com psicólogos da rede Doctor8.",
        },
        {
          title: "Rede de psicólogos",
          description: "Convide e gerencie psicólogos que atendem seus colaboradores.",
        },
        {
          title: "PCMSO",
          description: "Programa de Controle Médico de Saúde Ocupacional — convite ao médico do trabalho.",
        },
        {
          title: "Exames e ASO",
          description: "Gestão de exames admissionais, periódicos e Atestado de Saúde Ocupacional.",
        },
        {
          title: "Trilhas de conteúdo",
          description: "Conteúdo de bem-estar para colaboradores (vídeos, artigos, exercícios).",
        },
        {
          title: "Canal de denúncias",
          description: "Canal confidencial de whistleblower para colaboradores.",
        },
        {
          title: "eSocial",
          description: "Exportação de eventos de saúde ocupacional para o eSocial.",
        },
        {
          title: "Faturamento EAP",
          description: "Cobrança por consulta realizada — modelo metered billing.",
        },
      ],
    },
    {
      id: "farmacias-labs",
      title: "Farmácias e laboratórios (rede B2B)",
      features: [
        {
          title: "Farmácia — painel",
          description: "Gestão da loja na rede Doctor8: estoque, pedidos, equipe.",
        },
        {
          title: "Validação de receita (QR)",
          description: "Escaneie QR Code da receita digital Doctor8 para validar autenticidade.",
        },
        {
          title: "Busca pública de preços",
          description: "Pacientes comparam preços de medicamentos em /farmacias/buscar.",
        },
        {
          title: "Farmacêutico da rede",
          description: "Fila de teleconsultas farmacêuticas para a rede de farmácias.",
        },
        {
          title: "Laboratório — painel",
          description: "Cadastro de exames e preços na rede.",
        },
        {
          title: "Busca de exames",
          description: "Pacientes comparam preços de exames em /laboratorios/buscar.",
        },
      ],
    },
    {
      id: "humanitario",
      title: "Humanitário e Angel",
      features: [
        {
          title: "Campanhas humanitárias",
          description: "Operações de saúde gratuita (ex.: SOS Venezuela) — triagem, fila e consulta.",
        },
        {
          title: "Voluntariado profissional",
          description: "Profissionais se inscrevem como voluntários e atendem na fila humanitária.",
          bullets: [
            "Item fixo no menu lateral (coração Brasil-Venezuela).",
            "Sem cobrança ao paciente.",
          ],
        },
        {
          title: "Programa Angel",
          description: "Voluntários leigos (Anjos) fazem acompanhamento humanizado pós-consulta.",
          bullets: [
            "Missões de follow-up.",
            "Certificado de participação.",
          ],
        },
        {
          title: "Paciente humanitário",
          description: "Painel simplificado com acesso à fila, receitas e mensagens.",
        },
      ],
    },
    {
      id: "financeiro",
      title: "Pagamentos e financeiro",
      features: [
        {
          title: "Pagamento de consultas",
          description: "Stripe — cartão de crédito. Paciente paga ao agendar ou entrar no plantão.",
        },
        {
          title: "Repasses ao profissional",
          description: "Após a consulta, valor repassado conforme política da plataforma.",
        },
        {
          title: "Painel financeiro",
          description: "Histórico de consultas pagas, plantão, cursos e assinaturas.",
        },
        {
          title: "Doctor Connection (assinatura pro)",
          description: "Plano mensal com benefícios extras para o profissional.",
        },
        {
          title: "Cursos (LMS)",
          description: "Profissional cria cursos, pacientes ou colegas compram e aprendem na plataforma.",
        },
        {
          title: "Clube de compras",
          description: "Descontos coletivos em medicamentos e insumos.",
        },
      ],
    },
    {
      id: "integracoes",
      title: "Integrações e ecossistema",
      features: [
        {
          title: "Rede Eight",
          description: "Rede de profissionais e serviços complementares — link externo no menu.",
        },
        {
          title: "Vital8 ERP",
          description: "ERP de gestão para clínicas, empresas, farmácias e laboratórios.",
        },
        {
          title: "SMART on FHIR",
          description: "Pacientes conectam apps de saúde externos com consentimento OAuth.",
        },
        {
          title: "Eight SSO",
          description: "Login único entre produtos do ecossistema Eight.",
        },
        {
          title: "Assinatura ICP-Brasil",
          description: "Lacuna — assinatura digital de prescrições e documentos com validade jurídica.",
        },
        {
          title: "Acura",
          description: "Integração com programa Acura de voluntariado e acompanhamento.",
        },
      ],
    },
  ],
};

const en: GuideContent = {
  pageTitle: "How to Use Doctor8",
  pageSubtitle:
    "Complete platform guide — what each profession and each patient can do, step by step.",
  tocTitle: "Contents",
  yourPortalBadge: "Your portal",
  sections: pt.sections.map((s) => ({
    ...s,
    title: s.id === "intro" ? "What is Doctor8" :
      s.id === "primeiros-passos" ? "Getting started (all professionals)" :
      s.id === "pacientes" ? "Patients — everything patients can do" :
      s.id === "medicos" ? "Physicians" :
      s.id === "psicologos" ? "Psychologists" :
      s.id === "nutricionistas" ? "Nutritionists" :
      s.id === "enfermeiros" ? "Nurses" :
      s.id === "farmaceuticos" ? "Clinical pharmacists" :
      s.id === "dentistas" ? "Dentists" :
      s.id === "psicanalistas" ? "Psychoanalysts" :
      s.id === "terapeutas-integrativos" ? "Integrative therapists" :
      s.id === "consultas" ? "Consultations & telemedicine" :
      s.id === "comunicacao" ? "Communication" :
      s.id === "clinicas" ? "Clinics & organizations" :
      s.id === "empresas" ? "Employers (NR-1, EAP, PCMSO)" :
      s.id === "farmacias-labs" ? "Pharmacies & laboratories" :
      s.id === "humanitario" ? "Humanitarian & Angel" :
      s.id === "financeiro" ? "Payments & finance" :
      s.id === "integracoes" ? "Integrations & ecosystem" : s.title,
    intro: s.intro,
    features: s.features.map((f) => ({
      title: f.title,
      description: f.description,
      bullets: f.bullets,
    })),
  })),
};

const es: GuideContent = {
  pageTitle: "Cómo Usar Doctor8",
  pageSubtitle:
    "Guía completa de la plataforma — qué puede hacer cada profesión y cada paciente, paso a paso.",
  tocTitle: "Índice",
  yourPortalBadge: "Su portal",
  sections: pt.sections.map((s) => ({
    ...s,
    title: s.id === "intro" ? "Qué es Doctor8" :
      s.id === "primeiros-passos" ? "Primeros pasos (todos los profesionales)" :
      s.id === "pacientes" ? "Pacientes — todo lo que el paciente puede hacer" :
      s.id === "medicos" ? "Médicos" :
      s.id === "psicologos" ? "Psicólogos" :
      s.id === "nutricionistas" ? "Nutricionistas" :
      s.id === "enfermeiros" ? "Enfermeros" :
      s.id === "farmaceuticos" ? "Farmacéuticos clínicos" :
      s.id === "dentistas" ? "Dentistas" :
      s.id === "psicanalistas" ? "Psicoanalistas" :
      s.id === "terapeutas-integrativos" ? "Terapeutas integrativos" :
      s.id === "consultas" ? "Consultas y telemedicina" :
      s.id === "comunicacao" ? "Comunicación" :
      s.id === "clinicas" ? "Clínicas y organizaciones" :
      s.id === "empresas" ? "Empresas (NR-1, EAP, PCMSO)" :
      s.id === "farmacias-labs" ? "Farmacias y laboratorios" :
      s.id === "humanitario" ? "Humanitario y Angel" :
      s.id === "financeiro" ? "Pagos y finanzas" :
      s.id === "integracoes" ? "Integraciones y ecosistema" : s.title,
    intro: s.intro,
    features: s.features.map((f) => ({
      title: f.title,
      description: f.description,
      bullets: f.bullets,
    })),
  })),
};

export const COMO_USAR_GUIDE: Record<Lang, GuideContent> = { pt, en, es };

export function detectPortalFromPath(pathname: string): GuidePortalId {
  if (pathname.startsWith("/psychologist")) return "psychologist";
  if (pathname.startsWith("/nutricionista")) return "nutritionist";
  if (pathname.startsWith("/enfermeiro")) return "nurse";
  if (pathname.startsWith("/farmaceutico")) return "pharmacist";
  if (pathname.startsWith("/odontologo")) return "dentist";
  if (pathname.startsWith("/psychoanalyst")) return "psychoanalyst";
  if (pathname.startsWith("/integrative-therapist")) return "integrative-therapist";
  return "professional";
}

export const COMO_USAR_HREF_BY_PORTAL: Record<GuidePortalId, string> = {
  professional: "/professional/como-usar",
  psychologist: "/psychologist/como-usar",
  nutritionist: "/nutricionista/como-usar",
  nurse: "/enfermeiro/como-usar",
  pharmacist: "/farmaceutico/como-usar",
  dentist: "/odontologo/como-usar",
  psychoanalyst: "/psychoanalyst/como-usar",
  "integrative-therapist": "/integrative-therapist/como-usar",
};
