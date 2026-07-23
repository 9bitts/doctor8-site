/** Landing de intenção: ansiedade — /ansiedade */

export const ANSIEDADE_WHATSAPP_E164 = "5531971720053";
export const ANSIEDADE_WHATSAPP_DISPLAY = "+55 31 97172-0053";

export function ansiedadeWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${ANSIEDADE_WHATSAPP_E164}`;
  const text = message?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const ANSIEDADE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vi a página /ansiedade da Doctor8 e quero marcar uma consulta / terapia sobre ansiedade.";

export const ANSIEDADE_LANDING = {
  meta: {
    title: "Ansiedade: terapia online com psicólogo | Doctor8",
    description:
      "Terapia online com psicólogos CRP para ansiedade, em plataforma alinhada ao CFP. Agende sessão ou use o plantão quando a angústia apertar — com acolhimento e continuidade.",
  },
  hero: {
    eyebrow: "Ansiedade · Cuidado com acolhimento",
    title: "Sua ansiedade merece escuta profissional",
    titleHighlight: "sem fila de meses",
    subtitle:
      "Terapia online com psicólogos CRP, em plataforma alinhada ao CFP. Quando a angústia aperta, há também plantão. Você não precisa esperar o colapso para pedir ajuda.",
    primaryCta: { label: "Agendar terapia", href: "/register" },
    secondaryCta: { label: "Falar no WhatsApp" },
    urgentCta: { label: "Preciso de atendimento agora", href: "/urgent" },
    browseCta: { label: "Buscar psicólogo", href: "/" },
    emergencyNote:
      "Risco de vida, ideação suicida ou crise grave? Ligue CVV 188 ou SAMU 192 — emergência, não teleconsulta.",
    image: {
      src: "/marketing/ansiedade/hero.webp",
      alt: "Pessoa em momento de reflexão calma junto à janela",
    },
  },
  whenToBook: {
    eyebrow: "Quando procurar",
    title: "Quando a ansiedade deixa de ser alerta e vira sofrimento",
    subtitle:
      "Um pouco de ansiedade protege. O excesso rouba sono, foco e relações. Marque se alguma destas situações for a sua.",
    items: [
      {
        title: "A mente não desliga",
        body: "Preocupação constante, antecipação do pior e dificuldade de controlar o pensamento pedem escuta profissional.",
      },
      {
        title: "Crises ou pânico",
        body: "Coração acelerado, falta de ar, medo de morrer ou de ‘enlouquecer’ — mesmo fora de perigo real — merecem avaliação.",
      },
      {
        title: "Sono e rotina quebrados",
        body: "Insônia, irritabilidade, evitação de lugares ou pessoas e queda no trabalho/estudos são sinais de alerta.",
      },
      {
        title: "Você está adiando há semanas",
        body: "Se a angústia já dura e piora a qualidade de vida, o melhor momento para começar é agora — não depois do colapso.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Como funciona",
    title: "Da primeira mensagem à sessão — com sigilo e continuidade",
    subtitle:
      "Não é um chat solto. É telepsicologia em plataforma alinhada ao CFP, com prontuário e caminho para outros profissionais na mesma rede.",
    image: {
      src: "/marketing/ansiedade/terapia.webp",
      alt: "Sessão de terapia online com psicólogo pela Doctor8",
    },
    steps: [
      {
        step: "01",
        title: "Agende ou peça plantão",
        body: "Escolha um psicólogo na agenda ou use o plantão quando a intensidade pedir atendimento mais rápido.",
      },
      {
        step: "02",
        title: "Sessão por vídeo",
        body: "Encontro seguro, com termos e orientação alinhados à prática ética da psicologia.",
      },
      {
        step: "03",
        title: "Continuidade",
        body: "Retornos, histórico protegido e, se fizer sentido, encaminhamento a psiquiatra ou clínico na rede.",
      },
      {
        step: "04",
        title: "Rede Doctor8",
        body: "Mesmo ecossistema de saúde: mental e físico no mesmo lugar quando você precisar.",
      },
    ],
  },
  whoHelps: {
    eyebrow: "Psicólogo ou psiquiatra?",
    title: "Quem te atende — sem mistério",
    subtitle:
      "Muitos começam com terapia. O psiquiatra entra quando os sintomas estão muito intensos ou podem precisar de medicação.",
    image: {
      src: "/marketing/ansiedade/acolhimento.webp",
      alt: "Momento de acolhimento e calma no cuidado com a ansiedade",
    },
    items: [
      {
        title: "Psicólogo",
        body: "Porta de entrada preferencial: psicoterapia (como TCC e outras abordagens) para entender gatilhos e construir estratégias no dia a dia.",
      },
      {
        title: "Psiquiatra",
        body: "Médico da saúde mental. Avalia e, se necessário, prescreve medicação — em geral junto com a terapia, não no lugar dela.",
      },
      {
        title: "Clínico geral",
        body: "Pode ajudar a descartar causas físicas (como tireoide) e orientar o encaminhamento certo.",
      },
      {
        title: "EAP da empresa",
        body: "Se sua empresa usa Doctor8, você pode ter sessões com cota corporativa — pergunte ao RH ou no WhatsApp.",
      },
    ],
  },
  whyOnline: {
    eyebrow: "Por que online",
    title: "Terapia online funciona — com profissional e método",
    image: {
      src: "/marketing/ansiedade/cuidado.webp",
      alt: "Pessoa caminhando ao ar livre, simbolizando continuidade do cuidado em saúde mental",
    },
    body: "Estudos mostram que a TCC e outras abordagens mediadas por vídeo podem reduzir sintomas de ansiedade com resultados comparáveis ao presencial em muitos casos leves e moderados. No Brasil, a telepsicologia é regulamentada pelo CFP — sigilo e ética não são opcionais.",
    bullets: [
      "Menos barreira para dar o primeiro passo",
      "Continuidade mesmo em viagem ou rotina apertada",
      "Plataforma com lembretes e prontuário protegido",
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Terapia online funciona para ansiedade?",
        a: "Para muitas pessoas, sim — especialmente com psicólogo qualificado e vínculo terapêutico. Casos graves ou de risco exigem avaliação presencial ou emergência.",
      },
      {
        q: "Preciso de psicólogo ou de psiquiatra?",
        a: "A maioria começa com psicólogo. Se as crises são intensas, incapacitantes ou você já usa (ou precisa avaliar) medicação, o psiquiatra entra no plano — muitas vezes em paralelo.",
      },
      {
        q: "O atendimento é sigiloso?",
        a: "Sim. A prática segue o Código de Ética do psicólogo e a regulamentação de serviços mediados por tecnologia (CFP), com proteção de dados (LGPD).",
      },
      {
        q: "O plantão substitui emergência?",
        a: "Não. Plantão é atendimento mais ágil na plataforma. Ideação suicida, risco a si ou a outros, ou crise médica → CVV 188 / SAMU 192.",
      },
      {
        q: "A Doctor8 vende remédio para ansiedade?",
        a: "Não. Medicação, quando indicada, é decisão médica (psiquiatra/clínico) após avaliação — nunca ‘receita sob demanda’ nesta página.",
      },
      {
        q: "Minha empresa tem EAP. Como uso?",
        a: "Se o RH disponibilizou Doctor8, use o acesso de colaborador ou fale no WhatsApp que a gente te orienta no caminho certo.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para dar o primeiro passo com acolhimento?",
    subtitle:
      "Agende terapia, fale no WhatsApp ou use o plantão se a angústia apertar agora — com os limites de emergência claros.",
    primary: { label: "Agendar terapia", href: "/register" },
    secondary: { label: "WhatsApp Doctor8" },
    urgent: { label: "Atendimento agora", href: "/urgent" },
    browse: { label: "Buscar especialistas", href: "/" },
  },
} as const;
