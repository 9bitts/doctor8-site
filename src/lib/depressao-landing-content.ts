/** Landing de intenção: depressão — /depressao */

export const DEPRESSAO_WHATSAPP_E164 = "5531971720053";
export const DEPRESSAO_WHATSAPP_DISPLAY = "+55 31 97172-0053";

export function depressaoWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${DEPRESSAO_WHATSAPP_E164}`;
  const text = message?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const DEPRESSAO_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vi a página /depressao da Doctor8 e quero marcar uma consulta / terapia sobre depressão.";

export const DEPRESSAO_LANDING = {
  meta: {
    title: "Depressão: terapia e acompanhamento online | Doctor8",
    description:
      "Depressão tem tratamento. Terapia online com psicólogo CRP e, quando precisar, psiquiatra na mesma rede — plataforma alinhada ao CFP. Em crise: CVV 188 e SAMU 192.",
  },
  hero: {
    eyebrow: "Depressão · Há caminho",
    title: "Depressão tem tratamento",
    titleHighlight: "você não precisa carregar isso sozinho",
    subtitle:
      "Terapia online com psicólogo CRP e, quando fizer sentido, psiquiatra na mesma rede. Plataforma alinhada ao CFP. Se hoje só dá para um clique, esse clique já é cuidado.",
    primaryCta: { label: "Agendar ajuda", href: "/register" },
    secondaryCta: { label: "Falar no WhatsApp" },
    urgentCta: { label: "Preciso de atendimento agora", href: "/urgent" },
    browseCta: { label: "Buscar profissional", href: "/" },
    emergencyNote:
      "Pensamentos de morte, ideação suicida ou risco a si? Ligue CVV 188 (24h) ou SAMU 192 — emergência primeiro. Esta página é para acompanhamento.",
    image: {
      src: "/marketing/depressao/hero.webp",
      alt: "Pessoa em momento de quietude e reflexão, com dignidade e esperança",
    },
  },
  whenToBook: {
    eyebrow: "Sinais de que é hora",
    title: "Quando a tristeza vira peso que não passa",
    subtitle:
      "Procure ajuda profissional se os sinais duram cerca de duas semanas ou mais, ou se a rotina já ficou pesada demais.",
    items: [
      {
        title: "Tristeza ou vazio persistente",
        body: "Humor baixo, choro fácil ou sensação de ‘nada faz sentido’ que não alivia sozinha.",
      },
      {
        title: "Perda de prazer",
        body: "Atividades que antes importavam deixam de interessar — anedonia é um sinal clássico de depressão.",
      },
      {
        title: "Energia, sono e apetite",
        body: "Cansaço constante, dormir demais ou de menos, mudanças de apetite e peso sem explicação clara.",
      },
      {
        title: "Isolamento e desesperança",
        body: "Afastar-se de pessoas, culpa excessiva, visão negativa do futuro — ou pensamentos de morte (aí: 188/192).",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Como funciona",
    title: "Um passo de cada vez — com sigilo e continuidade",
    subtitle:
      "Não é atendimento descartável. É cuidado contínuo: psicólogo e/ou psiquiatra, prontuário protegido e retorno quando você precisar.",
    image: {
      src: "/marketing/depressao/consulta.webp",
      alt: "Consulta online de saúde mental com profissional pela Doctor8",
    },
    steps: [
      {
        step: "01",
        title: "Agende ou peça plantão",
        body: "Escolha psicólogo ou psiquiatra na agenda — ou use o plantão se não conseguir esperar.",
      },
      {
        step: "02",
        title: "Consulta por vídeo",
        body: "Encontro seguro, com termos e prática alinhada à ética profissional (CFP / medicina).",
      },
      {
        step: "03",
        title: "Plano combinado",
        body: "Terapia, e se indicado, avaliação médica para medicação — muitas vezes o melhor resultado é a combinação.",
      },
      {
        step: "04",
        title: "Continuidade",
        body: "Retornos, histórico protegido e rede Doctor8 se houver ansiedade, pressão alta ou diabetes junto.",
      },
    ],
  },
  whoHelps: {
    eyebrow: "Quem te atende",
    title: "Psicólogo e psiquiatra — juntos, não rivais",
    subtitle:
      "Leve a moderada muitas vezes começa com terapia. Moderada a grave costuma pedir médico — e a terapia continua sendo parte do caminho.",
    image: {
      src: "/marketing/depressao/acolhimento.webp",
      alt: "Momento de acolhimento e cuidado no tratamento da depressão",
    },
    items: [
      {
        title: "Psicólogo",
        body: "Psicoterapia (como TCC e outras abordagens) para pensamentos, emoções e reengajamento na vida — porta de entrada frequente.",
      },
      {
        title: "Psiquiatra",
        body: "Médico da saúde mental. Avalia e, se necessário, prescreve antidepressivos ou outros tratamentos — nunca ‘por conta própria’.",
      },
      {
        title: "Clínico geral",
        body: "Pode ajudar a investigar causas físicas e orientar o encaminhamento certo.",
      },
      {
        title: "EAP da empresa",
        body: "Se sua empresa usa Doctor8, pode haver sessões com cota corporativa — pergunte ao RH ou no WhatsApp.",
      },
    ],
  },
  whyOnline: {
    eyebrow: "Por que online",
    title: "Cuidado que cabe na energia que você tem hoje",
    image: {
      src: "/marketing/depressao/cuidado.webp",
      alt: "Pessoa caminhando ao ar livre, simbolizando continuidade e esperança no tratamento",
    },
    body: "Estudos mostram que a TCC e o acompanhamento remoto podem reduzir sintomas depressivos com resultados comparáveis ao presencial em muitos casos leves e moderados. No Brasil, telepsicologia é regulamentada pelo CFP. Casos graves ou de risco exigem emergência ou avaliação presencial.",
    bullets: [
      "Menos barreira quando a energia está baixa",
      "Continuidade sem deslocamento",
      "Mesma rede para terapia e médico, quando precisar",
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Terapia online funciona para depressão?",
        a: "Para muitos quadros leves e moderados, sim — com profissional qualificado e vínculo. Depressão grave, psicose ou risco suicida pedem emergência ou cuidado presencial especializado.",
      },
      {
        q: "Preciso de psicólogo ou de psiquiatra?",
        a: "Ambos podem ajudar. Terapia é base. Medicação, quando indicada, é decisão médica. A combinação costuma acelerar melhora e reduzir recaídas.",
      },
      {
        q: "Estou com pensamentos de morte. O que faço?",
        a: "Ligue agora para o CVV 188 (gratuito, 24h) ou SAMU 192 / emergência. Não fique sozinho. Depois, com segurança, marque acompanhamento na Doctor8.",
      },
      {
        q: "Posso renovar antidepressivo online?",
        a: "Só após avaliação médica. Não renovamos medicação sob demanda sem consulta. Segurança vem antes da agilidade.",
      },
      {
        q: "Também tenho ansiedade. Qual página usar?",
        a: "Ansiedade e depressão andam juntas com frequência. Você pode começar por esta ou pela landing de ansiedade — o importante é não ficar sem cuidado.",
      },
      {
        q: "Minha empresa tem EAP. Como uso?",
        a: "Se o RH disponibilizou Doctor8, use o acesso de colaborador ou fale no WhatsApp que a gente te orienta.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para dar o primeiro passo?",
    subtitle:
      "Agende ajuda, fale no WhatsApp ou use o plantão — e em crise, CVV 188 e SAMU 192 primeiro.",
    primary: { label: "Agendar ajuda", href: "/register" },
    secondary: { label: "WhatsApp Doctor8" },
    urgent: { label: "Atendimento agora", href: "/urgent" },
    browse: { label: "Buscar profissionais", href: "/" },
  },
} as const;
