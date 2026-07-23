import {
  EMPLOYER_REGISTER,
  LABORATORY_REGISTER,
  ORGANIZATION_REGISTER,
  PHARMACY_STORE_REGISTER,
  PROFESSIONAL_REGISTER,
  PSYCHOLOGIST_REGISTER,
} from "@/lib/auth-portals";
import { doctor8ContactWhatsAppHref } from "@/lib/doctor8-contact-whatsapp";

export type MarketingStrategySlug =
  | "paciente"
  | "medico"
  | "psicologo"
  | "farmacia"
  | "laboratorio"
  | "empresa"
  | "clinica"
  | "verticais"
  | "cursos"
  | "humanitario";

export type MarketingStrategyTool = {
  kind: "criar" | "operar";
  label: string;
};

export type MarketingStrategyPage = {
  slug: MarketingStrategySlug;
  navLabel: string;
  order: number;
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  /** Como a Doctor8 se apresenta para este público */
  pitch: {
    headline: string;
    body: string;
    promises: string[];
  };
  presentation: {
    title: string;
    points: { title: string; body: string }[];
  };
  channels: { name: string; role: string }[];
  journey: { step: string; title: string; body: string }[];
  tools: MarketingStrategyTool[];
  metrics: string[];
  dependencies: string;
  ctas: {
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
    product?: { label: string; href: string };
  };
  whatsappMessage: string;
};

export const MARKETING_STRATEGY_META = {
  title: "Doctor8 — Estratégias de distribuição por público",
  description:
    "Como apresentamos a Doctor8 para pacientes, médicos, psicólogos, farmácias, laboratórios, empresas, clínicas e parceiros — pitch, canais, jornada e métricas.",
};

export const MARKETING_STRATEGIES: MarketingStrategyPage[] = [
  {
    slug: "paciente",
    navLabel: "Paciente",
    order: 1,
    meta: {
      title: "Estratégia Paciente — Doctor8",
      description:
        "Como apresentamos a Doctor8 ao paciente: teleconsulta, prontuário, Club e indicação.",
    },
    hero: {
      eyebrow: "Estratégia 01 · Demanda",
      title: "Paciente",
      subtitle:
        "Motor de liquidez da rede. Sem paciente ativo, médico, farmácia e lab não monetizam.",
    },
    pitch: {
      headline: "Cuidado de onde você estiver — com prontuário, receita e farmácia no mesmo lugar.",
      body: "Falamos na hora da dor (“preciso de médico agora / online / perto”) e na confiança depois da consulta (indicação para a família). A mensagem é simplicidade, acesso e continuidade — não “mais um app de saúde”.",
      promises: [
        "Consulta online ou plantão quando precisar",
        "Prontuário e receita digital no mesmo fluxo",
        "Club Doctor para continuidade e benefícios",
        "Indique alguém e todos saem ganhando",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Dor primeiro, produto depois",
          body: "Landings por intenção (ansiedade, teleconsulta hoje, receita digital) — não só “conheça a Doctor8”.",
        },
        {
          title: "Um caminho claro",
          body: "Agendar → consulta → receita/exame → farmácia/lab. Cada passo com CTA único.",
        },
        {
          title: "Confiança pós-consulta",
          body: "No momento de maior satisfação: “indique alguém da família” com crédito ou mês de Club.",
        },
        {
          title: "WhatsApp como concierge",
          body: "Deep link com contexto (origem, especialidade, campanha) — menos formulário, mais conversa.",
        },
      ],
    },
    channels: [
      { name: "SEO + páginas de intenção", role: "Descoberta orgânica na hora da busca" },
      { name: "Indique e ganhe", role: "Loop viral controlado entre famílias" },
      { name: "Convite EAP (empresa)", role: "Volume previsível via RH" },
      { name: "Ads com UTM", role: "Aquisição paga mensurável" },
      { name: "WhatsApp comercial", role: "Handoff humano e ativação" },
    ],
    journey: [
      { step: "01", title: "Descoberta", body: "Busca, anúncio, indicação ou link da empresa." },
      { step: "02", title: "Primeira ação", body: "Agendar ou falar no WhatsApp — sem fricção." },
      { step: "03", title: "Consulta", body: "Vídeo + prontuário; receita ou exame se preciso." },
      { step: "04", title: "Retenção", body: "Club + indicação + retorno quando precisar." },
    ],
    tools: [
      { kind: "criar", label: "Programa indique-e-ganhe com link pessoal" },
      { kind: "criar", label: "Landings de intenção por dor/sintoma" },
      { kind: "operar", label: "Remarketing de abandono de cadastro/agenda" },
      { kind: "operar", label: "CTA pós-consulta de indicação familiar" },
    ],
    metrics: [
      "CAC por canal",
      "% que agenda na 1ª sessão",
      "Taxa de indicação",
      "LTV Club",
    ],
    dependencies:
      "Médicos e psicólogos disponíveis na especialidade/cidade — senão a aquisição queima.",
    ctas: {
      primary: { label: "Ver landing pacientes", href: "/pacientes" },
      secondary: { label: "Landing pressão alta", href: "/hipertensao" },
      product: { label: "Landing depressão", href: "/depressao" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Paciente em /marketing/estrategias/paciente e quero alinhar a apresentação para esse público.",
  },
  {
    slug: "medico",
    navLabel: "Médico",
    order: 2,
    meta: {
      title: "Estratégia Médico — Doctor8",
      description:
        "Como apresentamos a Doctor8 ao médico: consultório digital, SEO de perfil e rede.",
    },
    hero: {
      eyebrow: "Estratégia 02 · Oferta âncora",
      title: "Médico",
      subtitle:
        "Âncora de oferta + SEO de perfil + distribuição própria. O profissional traz pacientes e ganha demanda da rede.",
    },
    pitch: {
      headline: "Seu consultório digital — agenda, prontuário, receitas e pacientes da rede.",
      body: "Não vendemos “só teleconsulta”. Vendemos presença (perfil público + embed), operação clínica e acesso a EAP, plantão e humanitário. O médico é canal: quem já tem audiência multiplica a Doctor8.",
      promises: [
        "Agenda, vídeo e prontuário em um fluxo",
        "Receitas com validade legal",
        "Perfil público com SEO por especialidade e cidade",
        "Embed no site do médico + kit de presença",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Consultório, não app avulso",
          body: "Mostre o ciclo completo: paciente chega → consulta → receita → farmácia/lab.",
        },
        {
          title: "Traga seus pacientes",
          body: "Kit (QR, link, bio Instagram, embed) no onboarding — o médico distribui a si mesmo.",
        },
        {
          title: "Demanda da rede",
          body: "EAP, plantão JIT e busca pública como gancho de ativação — sem prometer volume irreal.",
        },
        {
          title: "Indique um colega",
          body: "Rede profissional com benefício claro (destaque, período, acesso).",
        },
      ],
    },
    channels: [
      { name: "Perfil público SEO", role: "Descoberta paciente por especialidade×cidade" },
      { name: "Embed de agenda", role: "Distribuição no site do próprio médico" },
      { name: "Indique colega", role: "Crescimento da oferta" },
      { name: "Conteúdo pronto", role: "WhatsApp/Instagram com UTM do perfil" },
      { name: "Sociedades / CRM", role: "Outbound e credibilidade" },
    ],
    journey: [
      { step: "01", title: "Cadastro", body: "Profissão, CRM e verificação." },
      { step: "02", title: "Presença", body: "Perfil completo + embed + QR ativos." },
      { step: "03", title: "Primeiros pacientes", body: "Próprios + rede (busca/EAP)." },
      { step: "04", title: "Rede", body: "Indica colegas e usa farmácia/lab da Doctor8." },
    ],
    tools: [
      { kind: "criar", label: "Kit de presença no onboarding" },
      { kind: "criar", label: "Programa indique colega" },
      { kind: "operar", label: "Ativar embed + Google Business em todo médico novo" },
      { kind: "operar", label: "Outbound em sociedades médicas regionais" },
    ],
    metrics: [
      "% com perfil completo + embed ativo",
      "Pacientes trazidos vs. da rede",
      "NPS profissional",
      "Receitas/exames gerados na rede",
    ],
    dependencies:
      "Demanda local mínima na especialidade — senão o médico entra e some.",
    ctas: {
      primary: { label: "Ver landing especialistas", href: "/especialistas" },
      secondary: { label: "Cadastrar médico", href: PROFESSIONAL_REGISTER },
      product: { label: "Mapa do ecossistema", href: "/marketing" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Médico em /marketing/estrategias/medico e quero alinhar a apresentação para profissionais.",
  },
  {
    slug: "psicologo",
    navLabel: "Psicólogo",
    order: 3,
    meta: {
      title: "Estratégia Psicólogo — Doctor8",
      description:
        "Como apresentamos a Doctor8 ao psicólogo: telepsicologia CFP, EAP e plantão.",
    },
    hero: {
      eyebrow: "Estratégia 03 · Saúde mental",
      title: "Psicólogo",
      subtitle:
        "Vertical mais madura no marketing. Ponte entre B2C, EAP corporativo e atendimento humanitário.",
    },
    pitch: {
      headline: "Telepsicologia com compliance CFP — e escala corporativa via EAP.",
      body: "Apresentamos autoridade regulatória (CFP), operação clínica (escalas, anamnese, plantão) e volume via empresas. O psicólogo entra por autonomia B2C e cresce com credenciamento EAP.",
      promises: [
        "Telepsicologia alinhada ao CFP",
        "Escalas, anamnese digital e prontuário",
        "Rede EAP com empresas Doctor8",
        "Plantão / PFA em programas humanitários",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Compliance visível",
          body: "Landing `/psicologos` e páginas de compliance reduzem fricção ética e jurídica.",
        },
        {
          title: "Dois motores de demanda",
          body: "Paciente particular + colaborador EAP — deixe os dois caminhos explícitos.",
        },
        {
          title: "Pacote EAP-ready",
          body: "Perfil + disponibilidade + convite empresa em um onboarding.",
        },
        {
          title: "Encaminhamento médico→psi",
          body: "Tracking de indicação clínica entre especialidades da rede.",
        },
      ],
    },
    channels: [
      { name: "Landing /psicologos", role: "Top-of-funnel vertical" },
      { name: "Rede EAP", role: "Volume via RH" },
      { name: "SEO terapia online + cidade", role: "Demanda B2C local" },
      { name: "Clínicas de saúde mental", role: "Parceria e indicação" },
      { name: "SOS / PFA", role: "Ativação com propósito" },
    ],
    journey: [
      { step: "01", title: "Cadastro CRP", body: "Portal psicólogo e verificação." },
      { step: "02", title: "Agenda ativa", body: "Disponibilidade B2C e/ou EAP." },
      { step: "03", title: "Primeiras sessões", body: "Particular ou colaborador empresa." },
      { step: "04", title: "Rede", body: "Encaminhamentos e possível plantão." },
    ],
    tools: [
      { kind: "criar", label: "Pacote psicólogo EAP-ready" },
      { kind: "criar", label: "Encaminhamento médico→psicólogo com tracking" },
      { kind: "operar", label: "Parcerias clínicas e cursos CRP" },
      { kind: "operar", label: "Conteúdo SEO terapia online" },
    ],
    metrics: [
      "% na rede EAP",
      "Ocupação de agenda",
      "Conversão landing → cadastro → 1ª sessão",
      "Retenção de pacientes",
    ],
    dependencies:
      "Empresas ativas no EAP e pacientes B2C; compliance visível reduz fricção.",
    ctas: {
      primary: { label: "Ver landing psicólogos", href: "/psicologos" },
      secondary: { label: "Cadastrar psicólogo", href: PSYCHOLOGIST_REGISTER },
      product: { label: "Empresas / EAP", href: "/empresas" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Psicólogo em /marketing/estrategias/psicologo e quero alinhar a apresentação para esse público.",
  },
  {
    slug: "farmacia",
    navLabel: "Farmácia",
    order: 4,
    meta: {
      title: "Estratégia Farmácia — Doctor8",
      description:
        "Como apresentamos a Doctor8 à farmácia: receitas digitais, proximidade e balcão.",
    },
    hero: {
      eyebrow: "Estratégia 04 · Última milha",
      title: "Farmácia",
      subtitle:
        "Fecha o ciclo receita → dispensação. Presença física = alcance local na cidade-piloto.",
    },
    pitch: {
      headline: "Receba receitas Doctor8 por proximidade — valide, dispense e cresça com a rede.",
      body: "A farmácia entra grátis na rede, publica preços de balcão e aparece para pacientes perto dela. O pitch é volume de receita digital + kit de balcão (QR), não “mais um marketplace”.",
      promises: [
        "Cadastro na rede Doctor8",
        "Pacientes por proximidade",
        "Validação de receita digital",
        "Kit balcão (QR + impresso + WhatsApp)",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Cold start honesto",
          body: "Priorizar cidades com médicos ativos — não prometer pedidos onde não há receita fluindo.",
        },
        {
          title: "Balcão como mídia",
          body: "QR “receba receitas Doctor8” no ponto de venda e Status WhatsApp.",
        },
        {
          title: "Painel simples",
          body: "Pedidos da semana + taxa — clareza operacional para o proprietário.",
        },
        {
          title: "Associações e redes",
          body: "Cadastro em massa via CSV / parcerias regionais.",
        },
      ],
    },
    channels: [
      { name: "Cadastro /farmacias", role: "Self-serve + CSV" },
      { name: "Busca por proximidade", role: "Demanda do paciente no app" },
      { name: "Kit balcão", role: "Aquisição offline → digital" },
      { name: "WhatsApp parceiro", role: "Conversão comercial" },
      { name: "Associações regionais", role: "Escala de oferta" },
    ],
    journey: [
      { step: "01", title: "Cadastro loja", body: "CNPJ, endereço, catálogo básico." },
      { step: "02", title: "Ativação balcão", body: "QR e materiais no PDV." },
      { step: "03", title: "1º pedido", body: "Receita digital da rede Doctor8." },
      { step: "04", title: "Rotina", body: "Pedidos semanais + taxa transparente." },
    ],
    tools: [
      { kind: "criar", label: "Kit balcão (QR + impresso + Status)" },
      { kind: "criar", label: "Painel pedidos da semana + taxa" },
      { kind: "operar", label: "Cidade-piloto com volume mínimo de receitas" },
      { kind: "operar", label: "Parceria com associações de farmácias" },
    ],
    metrics: [
      "Farmácias ativas por cidade",
      "% receitas dispensadas na rede",
      "Tempo até o 1º pedido",
      "Ticket médio por dispensação",
    ],
    dependencies:
      "Chicken-egg: só escala se houver receita digital fluindo — médicos ativos primeiro.",
    ctas: {
      primary: { label: "Ver landing farmácias", href: "/farmacias" },
      secondary: { label: "Cadastrar farmácia", href: PHARMACY_STORE_REGISTER },
      product: { label: "Buscar farmácias", href: "/farmacias/buscar" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Farmácia em /marketing/estrategias/farmacia e quero cadastrar / alinhar a rede de drogarias.",
  },
  {
    slug: "laboratorio",
    navLabel: "Laboratório",
    order: 5,
    meta: {
      title: "Estratégia Laboratório — Doctor8",
      description:
        "Como apresentamos a Doctor8 ao laboratório: catálogo de exames e pedidos da rede.",
    },
    hero: {
      eyebrow: "Estratégia 05 · Exames",
      title: "Laboratório",
      subtitle:
        "Exames pedidos pelo médico Doctor8. Mesma lógica de rede local da farmácia — sem médico pedindo, o lab espera.",
    },
    pitch: {
      headline: "Publique exames e preços — receba pedidos dos médicos da rede Doctor8.",
      body: "O laboratório entra com catálogo claro e proximidade. O pitch para o dono do lab é demanda qualificada do médico digital; o pitch interno é: o fluxo de pedido de exame no consultório precisa apontar para a rede.",
      promises: [
        "Catálogo de exames e preços",
        "Pedidos vindos de médicos Doctor8",
        "Busca por proximidade",
        "Taxa por exame transparente",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Catálogo mínimo primeiro",
          body: "Exames mais pedidos publicados — depois expansão.",
        },
        {
          title: "Destaque no fluxo do médico",
          body: "Lab só converte se aparecer na hora do pedido de exame.",
        },
        {
          title: "Cidade-piloto com farmácia",
          body: "Ativar lab e farmácia juntos onde já há médicos.",
        },
        {
          title: "SEO e mapa",
          body: "Landing/sitemap mais visíveis (hoje o canal é fraco no nav).",
        },
      ],
    },
    channels: [
      { name: "Cadastro /laboratorios", role: "Self-serve + CSV" },
      { name: "Fluxo do médico", role: "Pedido de exame na consulta" },
      { name: "Busca proximidade", role: "Paciente escolhe onde coletar" },
      { name: "Redes / franquias", role: "Outbound B2B" },
      { name: "WhatsApp parceiro", role: "Conversão comercial" },
    ],
    journey: [
      { step: "01", title: "Cadastro", body: "Unidade, exames e preços." },
      { step: "02", title: "Catálogo ativo", body: "Visível para médicos da região." },
      { step: "03", title: "1º pedido", body: "Exame originado na teleconsulta." },
      { step: "04", title: "Rotina", body: "Volume semanal + taxa por exame." },
    ],
    tools: [
      { kind: "criar", label: "Catálogo mínimo + destaque no fluxo médico" },
      { kind: "criar", label: "Landing/SEO labs mais forte no mapa" },
      { kind: "operar", label: "Cidade-piloto junto com farmácia" },
      { kind: "operar", label: "Outbound labs de telemedicina" },
    ],
    metrics: [
      "Labs com catálogo completo",
      "Pedidos/mês",
      "% médicos que pedem exame na rede",
      "Tempo até 1º pedido",
    ],
    dependencies:
      "Médico pedindo exame no fluxo Doctor8 — senão o lab só cadastra e espera.",
    ctas: {
      primary: { label: "Ver landing laboratórios", href: "/laboratorios" },
      secondary: { label: "Cadastrar laboratório", href: LABORATORY_REGISTER },
      product: { label: "Buscar laboratórios", href: "/laboratorios/buscar" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Laboratório em /marketing/estrategias/laboratorio e quero publicar exames na Doctor8.",
  },
  {
    slug: "empresa",
    navLabel: "Empresa / RH",
    order: 6,
    meta: {
      title: "Estratégia Empresa / RH — Doctor8",
      description:
        "Como apresentamos a Doctor8 ao RH e SST: NR-1, EAP, PCMSO e eSocial.",
    },
    hero: {
      eyebrow: "Estratégia 06 · Ticket alto",
      title: "Empresa / RH",
      subtitle:
        "Volume previsível de colaboradores + compliance. Ciclo de venda mais longo, LTV maior.",
    },
    pitch: {
      headline: "NR-1, EAP, PCMSO e eSocial — compliance e saúde mental num contrato.",
      body: "Falamos a língua do RH e do SST: risco psicossocial, adesão, ROI e obrigação legal. A demo/piloto mostra adesão de colaboradores, não só slides de produto.",
      promises: [
        "Inventário NR-1 e plano de ação",
        "EAP com psicólogos CRP",
        "PCMSO / exames e eSocial",
        "Convites em lote para colaboradores",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Compliance + cuidado",
          body: "Não é só “benefício”: é obrigação NR-1 com resultado humano mensurável.",
        },
        {
          title: "Piloto com métrica",
          body: "30–60 dias com % de ativação e sessões EAP / 100 vidas.",
        },
        {
          title: "Portal do RH",
          body: "Uso, adesão e ROI visíveis — menos WhatsApp improvisado.",
        },
        {
          title: "Revenda",
          body: "Contadores, consultorias SST e corretoras como canal.",
        },
      ],
    },
    channels: [
      { name: "Outbound RH / SST", role: "Pipeline comercial" },
      { name: "Demo + piloto", role: "Prova de valor" },
      { name: "Convites CSV", role: "Ativação em massa" },
      { name: "Cases por vertical", role: "Confiança no ciclo longo" },
      { name: "Revenda SST/contador", role: "Escala indireta" },
    ],
    journey: [
      { step: "01", title: "Descoberta", body: "Outbound, indicação ou mapa /marketing." },
      { step: "02", title: "Demo", body: "NR-1 + EAP no mesmo tour." },
      { step: "03", title: "Piloto", body: "Convites colaboradores + métricas." },
      { step: "04", title: "Contrato", body: "Operação contínua e expansão de vidas." },
    ],
    tools: [
      { kind: "criar", label: "Portal parceiro RH (uso, adesão, ROI)" },
      { kind: "criar", label: "Playbook + one-pager + contrato padrão" },
      { kind: "criar", label: "Canal de revenda SST / contador" },
      { kind: "operar", label: "Piloto 30–60 dias com métrica de adesão" },
    ],
    metrics: [
      "Ciclo de venda",
      "% colaboradores ativados",
      "Sessões EAP / 100 vidas",
      "Churn empresarial",
    ],
    dependencies:
      "Rede de psicólogos e médicos SST na região da empresa.",
    ctas: {
      primary: { label: "Ver landing empresas", href: "/empresas" },
      secondary: { label: "Solicitar demo", href: EMPLOYER_REGISTER },
      product: { label: "Login empresa", href: "/empresas/login" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Empresa/RH em /marketing/estrategias/empresa. Sou RH/SST e quero entender NR-1 + EAP.",
  },
  {
    slug: "clinica",
    navLabel: "Clínica",
    order: 7,
    meta: {
      title: "Estratégia Clínica — Doctor8",
      description:
        "Como apresentamos a Doctor8 à clínica: multi-profissionais, faturamento e EAP.",
    },
    hero: {
      eyebrow: "Estratégia 07 · Multiplicador",
      title: "Clínica",
      subtitle:
        "Um CNPJ traz N profissionais. Maior gap de marketing hoje — proposta ainda diluída em Parceiros.",
    },
    pitch: {
      headline: "Sua clínica na rede Doctor8 — equipe, agenda, faturamento e EAP.",
      body: "A clínica precisa de página e pitch próprios: multi-profissionais, marca da clínica, credenciamento e pacientes. Não misturar com “parceiro genérico”.",
      promises: [
        "Cadastro por CNPJ",
        "Convite do time (médicos, psi, nutri…)",
        "Agenda e faturamento compartilhados",
        "Credenciamento na rede / EAP",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Landing dedicada",
          body: "Proposta isolada `/clinicas` (hoje o lead alto cai em `/parceiros`).",
        },
        {
          title: "Onboarding do time",
          body: "Clínica convida profissionais com código/link — um CNPJ, vários logins.",
        },
        {
          title: "Marca da clínica",
          body: "Presença pública da organização, não só do profissional avulso.",
        },
        {
          title: "Indicação interna",
          body: "Médico já na rede: “sua clínica também”.",
        },
      ],
    },
    channels: [
      { name: "Landing /clinicas (a criar)", role: "Top-of-funnel claro" },
      { name: "WhatsApp comercial", role: "Conversão de lead alto" },
      { name: "Indicação de profissionais", role: "Aquisição quente" },
      { name: "Listas regionais", role: "Outbound clínicas digitais" },
      { name: "Oferta presença + Google", role: "Pacote valor percebido" },
    ],
    journey: [
      { step: "01", title: "Lead clínica", body: "Landing ou WhatsApp “sou clínica”." },
      { step: "02", title: "CNPJ", body: "Cadastro organização." },
      { step: "03", title: "Time", body: "Convites multi-profissionais." },
      { step: "04", title: "Operação", body: "Agenda, pacientes e EAP." },
    ],
    tools: [
      { kind: "criar", label: "Landing /clinicas com proposta isolada" },
      { kind: "criar", label: "Onboarding: clínica convida time" },
      { kind: "operar", label: "Lista de clínicas digitais / redes" },
      { kind: "operar", label: "Oferta “clínica no Google + Doctor8”" },
    ],
    metrics: [
      "Clínicas ativas",
      "Profissionais por clínica",
      "Pacientes trazidos pela clínica",
      "Conversão lead → CNPJ ativo",
    ],
    dependencies:
      "Produto de organização estável + pitch separado de “parceiros”.",
    ctas: {
      primary: { label: "Ver parceiros (hoje)", href: "/parceiros" },
      secondary: { label: "Cadastrar organização", href: ORGANIZATION_REGISTER },
      product: { label: "Mapa completo", href: "/marketing#clinicas" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Clínica em /marketing/estrategias/clinica. Represento uma clínica e quero conversa comercial.",
  },
  {
    slug: "verticais",
    navLabel: "Verticais",
    order: 8,
    meta: {
      title: "Estratégia Verticais — Doctor8",
      description:
        "Como apresentamos nutricionista, dentista, enfermagem e farmacêutico na Doctor8.",
    },
    hero: {
      eyebrow: "Estratégia 08 · Oferta vertical",
      title: "Nutri · Odonto · Enfermagem · Farmacêutico",
      subtitle:
        "Produto clínico já existe; marketing ainda vive no hub de especialistas. Escalar só com demanda mínima.",
    },
    pitch: {
      headline: "Cada profissão com proposta própria — sem diluir no “especialista genérico”.",
      body: "Nutri (plano alimentar), odonto (odontograma/teleodontologia), enfermagem (SAE/telenfermagem) e farmacêutico (telefarmácia CFF — distinto da loja). Apresentação por conselho e por dor do paciente.",
      promises: [
        "Nutricionista: consulta + planos + prontuário",
        "Dentista: teleodontologia e odontograma",
        "Enfermeiro: SAE e telenfermagem",
        "Farmacêutico: telefarmácia (≠ drogaria)",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Landings no modelo /psicologos",
          body: "`/nutricionistas`, `/dentistas`, etc. — pitch e compliance por conselho.",
        },
        {
          title: "Separar loja × profissional",
          body: "Farmácia (PDV) ≠ farmacêutico (consulta). Evitar confusão no mapa.",
        },
        {
          title: "SEO por conselho",
          body: "CRN, CFO, COREN, CFF — autoridade e descoberta.",
        },
        {
          title: "Demanda antes de ads",
          body: "Só escalar aquisição paga quando houver busca/intenção na vertical.",
        },
      ],
    },
    channels: [
      { name: "Hub /especialistas", role: "Entrada atual" },
      { name: "Cadastro por profissão", role: "Self-serve já existente" },
      { name: "Landings verticais (a criar)", role: "Top-of-funnel dedicado" },
      { name: "Conteúdo conselhos", role: "SEO e autoridade" },
      { name: "Indicação entre profissionais", role: "Rede clínica" },
    ],
    journey: [
      { step: "01", title: "Descoberta", body: "Hub ou landing da profissão." },
      { step: "02", title: "Cadastro", body: "Portal específico + verificação." },
      { step: "03", title: "Presença", body: "Perfil público + agenda." },
      { step: "04", title: "Rede", body: "Pacientes próprios + encaminhamentos." },
    ],
    tools: [
      { kind: "criar", label: "Landings /nutricionistas, /dentistas, etc." },
      { kind: "criar", label: "Copy clara farmácia-loja vs farmacêutico" },
      { kind: "operar", label: "Conteúdo SEO por conselho profissional" },
      { kind: "operar", label: "Escalar ads só com demanda mínima" },
    ],
    metrics: [
      "Cadastros por vertical",
      "Perfis completos",
      "1ª consulta por profissão",
      "Encaminhamentos recebidos",
    ],
    dependencies:
      "Demanda mínima na vertical e diferenciação clara no marketing hub.",
    ctas: {
      primary: { label: "Ver especialistas", href: "/especialistas" },
      secondary: { label: "Cadastrar profissional", href: PROFESSIONAL_REGISTER },
      product: { label: "Mapa do ecossistema", href: "/marketing" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Verticais em /marketing/estrategias/verticais e quero alinhar nutri/odonto/enfermagem/farmacêutico.",
  },
  {
    slug: "cursos",
    navLabel: "Cursos",
    order: 9,
    meta: {
      title: "Estratégia Cursos — Doctor8",
      description:
        "Como apresentamos cursos e educadores na Doctor8: autoridade e retenção do profissional.",
    },
    hero: {
      eyebrow: "Estratégia 09 · Autoridade",
      title: "Cursos / Educador",
      subtitle:
        "Retenção e autoridade para quem já atende. Prioridade menor até a oferta clínica estar líquida.",
    },
    pitch: {
      headline: "Aprenda e ensine na rede — microlearning e EMC para quem cuida de gente.",
      body: "Para o profissional: cursos que elevam prática e credibilidade. Para o educador: publicar conteúdo no ecossistema Doctor Connection. Apresentação como benefício de rede, não produto isolado.",
      promises: [
        "Catálogo para quem já atende",
        "EMC / microlearning",
        "Doctor Connection (1 curso/mês no copy)",
        "Educador como parceiro de conteúdo",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Cross-sell no painel",
          body: "Curso aparece depois que o profissional já opera — retenção, não aquisição fria.",
        },
        {
          title: "Educador self-serve",
          body: "Onboarding “quero publicar curso” (hoje pouco claro).",
        },
        {
          title: "Autoridade compartilhada",
          body: "Conteúdo reforça SEO e confiança das outras landings.",
        },
        {
          title: "Prioridade relativa",
          body: "Depois de liquidez clínica (médico/psi/paciente) e B2B.",
        },
      ],
    },
    channels: [
      { name: "Catálogo /cursos", role: "Descoberta learner" },
      { name: "Painel do profissional", role: "Cross-sell" },
      { name: "Parceiros / educador", role: "Publicação de conteúdo" },
      { name: "Doctor Connection", role: "Assinatura / benefício" },
    ],
    journey: [
      { step: "01", title: "Profissional ativo", body: "Já atende na Doctor8." },
      { step: "02", title: "Descobre curso", body: "Painel ou catálogo." },
      { step: "03", title: "Consome / conclui", body: "Microlearning ou EMC." },
      { step: "04", title: "Educador", body: "Publica e amplia autoridade." },
    ],
    tools: [
      { kind: "criar", label: "Onboarding publicar curso" },
      { kind: "criar", label: "Cross-sell no painel profissional" },
      { kind: "operar", label: "Curadoria de catálogo inicial" },
      { kind: "operar", label: "Parcerias com educadores de saúde" },
    ],
    metrics: [
      "Cursos publicados",
      "Conclusões / mês",
      "% profissionais que consomem",
      "Educadores ativos",
    ],
    dependencies:
      "Oferta clínica líquida — curso sem rede ativa não retém.",
    ctas: {
      primary: { label: "Ver catálogo de cursos", href: "/cursos" },
      secondary: { label: "Área parceiros", href: "/parceiros" },
      product: { label: "Mapa completo", href: "/marketing" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Cursos em /marketing/estrategias/cursos e quero falar sobre educadores / catálogo.",
  },
  {
    slug: "humanitario",
    navLabel: "Humanitário",
    order: 10,
    meta: {
      title: "Estratégia Humanitário — Doctor8",
      description:
        "Como apresentamos programas humanitários Doctor8: SOS, Acura, voluntários e anjos.",
    },
    hero: {
      eyebrow: "Estratégia 10 · Propósito",
      title: "Humanitário",
      subtitle:
        "Marca, voluntários e impacto. Canal paralelo ao comercial — com UTM claro para não misturar funis.",
    },
    pitch: {
      headline: "Atendimento gratuito triado — médicos, psicólogos e anjos no mesmo propósito.",
      body: "Apresentamos impacto (SOS Venezuela, AcuraBrasil, atendimento humanitário) e caminho claro: paciente em vulnerabilidade, profissional voluntário, anjo de apoio. Tom de responsabilidade e solidariedade — alinhado à cultura Doctor8.",
      promises: [
        "Filas triadas de atendimento gratuito",
        "Voluntariado médico / psi / outras áreas",
        "Anjos de apoio pós-consulta",
        "Campanhas com PWA e i18n (PT/ES/EN)",
      ],
    },
    presentation: {
      title: "Como apresentamos",
      points: [
        {
          title: "Funil separado",
          body: "UTM e acquisitionChannel distintos do comercial — impacto ≠ CAC pago.",
        },
        {
          title: "Entrada única",
          body: "Unificar narrativa entre SOS, humanitarian e atendimento humanitário.",
        },
        {
          title: "Voluntário como herói",
          body: "Pitch de responsabilidade e serviço — não de marketing agressivo.",
        },
        {
          title: "Transparência de impacto",
          body: "Números de atendimentos e filas ao vivo quando possível.",
        },
      ],
    },
    channels: [
      { name: "Landings SOS / humanitário", role: "Entrada paciente e voluntário" },
      { name: "Campanhas e-mail/WhatsApp", role: "Mobilização" },
      { name: "Parceiros Acura", role: "Distribuição humanitária" },
      { name: "Banners no painel pro", role: "Convite a voluntariar" },
      { name: "PWA + i18n", role: "Alcance fronteiriço / diáspora" },
    ],
    journey: [
      { step: "01", title: "Campanha", body: "Descoberta por causa ou parceiro." },
      { step: "02", title: "Triagem", body: "Paciente ou voluntário no fluxo certo." },
      { step: "03", title: "Atendimento", body: "Consulta gratuita + registro." },
      { step: "04", title: "Anjo / continuidade", body: "Apoio humano pós-consulta." },
    ],
    tools: [
      { kind: "criar", label: "UTM / canal de aquisição humanitário completo" },
      { kind: "criar", label: "Hub único de programas humanitários" },
      { kind: "operar", label: "Campanhas com parceiros Acura/SOS" },
      { kind: "operar", label: "Ativação de voluntários no painel profissional" },
    ],
    metrics: [
      "Atendimentos gratuitos / mês",
      "Voluntários ativos",
      "Anjos engajados",
      "Origem por campanha (UTM)",
    ],
    dependencies:
      "Profissionais voluntários e operação de triagem — crescimento por campanha, não por ads comerciais.",
    ctas: {
      primary: { label: "SOS Venezuela", href: "/sos-venezuela" },
      secondary: { label: "Atendimento humanitário", href: "/atendimentohumanitario" },
      product: { label: "Área humanitária", href: "/humanitarian" },
    },
    whatsappMessage:
      "Olá, vi a estratégia Humanitário em /marketing/estrategias/humanitario e quero falar sobre voluntariado / programas.",
  },
];

export function getMarketingStrategy(
  slug: string,
): MarketingStrategyPage | undefined {
  return MARKETING_STRATEGIES.find((s) => s.slug === slug);
}

export function getMarketingStrategySlugs(): MarketingStrategySlug[] {
  return MARKETING_STRATEGIES.map((s) => s.slug);
}

export function marketingStrategyWhatsAppHref(message: string): string {
  return doctor8ContactWhatsAppHref(message);
}

export function getAdjacentStrategies(slug: MarketingStrategySlug): {
  prev?: MarketingStrategyPage;
  next?: MarketingStrategyPage;
} {
  const idx = MARKETING_STRATEGIES.findIndex((s) => s.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? MARKETING_STRATEGIES[idx - 1] : undefined,
    next: idx < MARKETING_STRATEGIES.length - 1 ? MARKETING_STRATEGIES[idx + 1] : undefined,
  };
}
