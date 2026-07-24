/** Landing content — Médicos Pela Vida × Doctor8 (`/medicospelavida`). */

export const MPV_URLS = {
  portal: "https://portal.medicospelavida.org.br/",
  cadastro: "https://portal.medicospelavida.org.br/cadastro",
  site: "https://medicospelavida.org.br/",
  termos: "https://portal.medicospelavida.org.br/termos-de-uso",
  whatsapp: "https://api.whatsapp.com/send?phone=5562996456625",
  telegram: "https://t.me/mpvc19oficial",
  youtube: "https://www.youtube.com/@mpvlives",
  email: "mailto:contato@medicospelavidacovid19.com.br",
  logo: "/partners/medicospelavida/logo-mpv.png",
} as const;

export const MPV_META = {
  title: "Médicos Pela Vida — Associação e parceria Doctor8",
  description:
    "Associe-se aos Médicos Pela Vida: comunidade, lives, informação científica independente e acesso à plataforma Doctor8 enquanto sua contribuição estiver em dia.",
} as const;

export const MPV_PLANOS = [
  {
    id: "bronze",
    name: "Bronze",
    label: "Plano básico de associação",
    monthly: "R$ 30",
    yearly: "R$ 300",
  },
  {
    id: "prata",
    name: "Prata",
    label: "Plano intermediário com benefícios adicionais",
    monthly: "R$ 50",
    yearly: "R$ 500",
  },
  {
    id: "ouro",
    name: "Ouro",
    label: "Plano premium com benefícios exclusivos",
    monthly: "R$ 100",
    yearly: "R$ 1.000",
  },
  {
    id: "diamante",
    name: "Diamante",
    label: "Contribuição personalizada a partir de R$ 1.500/ano",
    monthly: "R$ 125+",
    yearly: "R$ 1.500+",
  },
] as const;

export const MPV_POSTULADOS = [
  "Evidência importa — e a perspicácia clínica também.",
  "Protocolo é orientação, nunca imposição.",
  "Medicina autônoma, sem interferência indevida.",
  "Tratar o paciente como a si mesmo.",
] as const;

export const MPV_ASSOCIADO_GANHA = [
  {
    title: "Comunidade de colegas",
    body: "Rede de médicos e profissionais alinhados à ética e à autonomia do ato médico.",
  },
  {
    title: "Lives e atualização",
    body: "Comunica MPV e séries especiais — oncologia integrativa, saúde integral e debates clínicos.",
  },
  {
    title: "Conteúdo científico",
    body: "Análises, editoriais e estudos no portal editorial da associação.",
  },
  {
    title: "Participação institucional",
    body: "Atividades, eventos e, conforme o estatuto, voz nas deliberações da associação.",
  },
] as const;

export const MPV_DOCTOR8_BENEFITS = [
  {
    title: "Inteligência artificial",
    body: "Apoio na rotina de prescrição e na leitura de exames laboratoriais.",
  },
  {
    title: "Assinatura digital",
    body: "ICP-Brasil e provedores integrados para documentos com validade jurídica.",
  },
  {
    title: "Videochamadas",
    body: "Consulta remota integrada ao consultório virtual.",
  },
  {
    title: "Agenda e cadastro",
    body: "Horários, link de agendamento e fluxo de paciente na plataforma.",
  },
  {
    title: "Arquivo digital",
    body: "Histórico, exames e arquivos compartilhados com o paciente.",
  },
  {
    title: "Sala virtual MPV",
    body: "Encontros da associação no ecossistema Doctor8.",
  },
] as const;

export const MPV_STEPS = [
  {
    n: "01",
    title: "Escolha seu plano",
    body: "Bronze, Prata, Ouro ou Diamante — mensal ou anual.",
  },
  {
    n: "02",
    title: "Cadastre-se no portal MPV",
    body: "Você é redirecionado ao portal da associação para concluir o cadastro.",
  },
  {
    n: "03",
    title: "Pague na associação",
    body: "PIX ou cartão (Cielo) — o pagamento fica com a MPV.",
  },
  {
    n: "04",
    title: "Ative o Doctor8",
    body: "Enquanto a contribuição estiver em dia, você mantém o acesso à plataforma.",
  },
] as const;
