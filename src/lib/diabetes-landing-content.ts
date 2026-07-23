/** Landing de intenção: diabetes — /diabetes */

export const DIABETES_WHATSAPP_E164 = "5531971720053";
export const DIABETES_WHATSAPP_DISPLAY = "+55 31 97172-0053";

export function diabetesWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${DIABETES_WHATSAPP_E164}`;
  const text = message?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const DIABETES_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vi a página /diabetes da Doctor8 e quero marcar uma consulta sobre diabetes / glicose.";

export const DIABETES_LANDING = {
  meta: {
    title: "Diabetes: consulta online, exames e acompanhamento | Doctor8",
    description:
      "Controle sua glicose com consulta online, exames, receita digital e nutricionista. Endocrinologista ou clínico na Doctor8 — cuidado contínuo, não só o próximo remédio.",
  },
  hero: {
    eyebrow: "Diabetes · Cuidado contínuo",
    title: "Controle sua glicose com acompanhamento",
    titleHighlight: "não só com o próximo remédio",
    subtitle:
      "Diabetes tipo 2 cresce no Brasil. Com consulta online, exames, receita digital e nutricionista, você mantém o tratamento em dia — com histórico no prontuário.",
    primaryCta: { label: "Agendar consulta", href: "/register" },
    secondaryCta: { label: "Falar no WhatsApp" },
    browseCta: { label: "Buscar especialistas", href: "/" },
    emergencyNote:
      "Confusão, vômitos intensos, dor abdominal forte ou mal-estar grave? Ligue 192 — emergência, não teleconsulta.",
    image: {
      src: "/marketing/diabetes/hero.webp",
      alt: "Pessoa medindo a glicemia em casa com glicosímetro",
    },
  },
  whenToBook: {
    eyebrow: "Quando marcar",
    title: "Glicose alterada pede plano — não só ansiedade",
    subtitle:
      "Pré-diabetes e diabetes tipo 2 muitas vezes começam em silêncio. Marque se alguma destas situações for a sua.",
    items: [
      {
        title: "Glicemia ou HbA1c alterada",
        body: "Jejum ≥126 mg/dL ou hemoglobina glicada ≥6,5% pedem avaliação médica para confirmar e definir o plano.",
      },
      {
        title: "Sede, urina frequente ou formigamento",
        body: "Sede excessiva, urinar muito, formigamento nos pés ou visão embaçada merecem consulta — não só busca no Google.",
      },
      {
        title: "Acabou o remédio contínuo",
        body: "Metformina, insulina e outros tratamentos exigem acompanhamento. Renove com avaliação, não por conta própria.",
      },
      {
        title: "Pré-diabetes ou histórico na família",
        body: "Há tempo de agir com hábito, nutrição e retorno regular antes das complicações.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Como funciona",
    title: "Da consulta ao plano alimentar, no mesmo ecossistema",
    subtitle:
      "Não vendemos só receita. É cuidado contínuo: médico, exames, nutricionista e farmácia com histórico no prontuário.",
    image: {
      src: "/marketing/diabetes/consulta.webp",
      alt: "Paciente em teleconsulta sobre diabetes com médico pela Doctor8",
    },
    steps: [
      {
        step: "01",
        title: "Agende online",
        body: "Escolha clínico ou endocrinologista e o horário que cabe na sua rotina.",
      },
      {
        step: "02",
        title: "Consulta por vídeo",
        body: "Histórico, sintomas, medicações e exames. O médico define o próximo passo com segurança.",
      },
      {
        step: "03",
        title: "Exames e receita",
        body: "Pedido de exames quando preciso e receita digital válida na farmácia, se clinicamente indicado.",
      },
      {
        step: "04",
        title: "Nutrição e retorno",
        body: "Plano alimentar com nutricionista e acompanhamento para não abandonar o controle.",
      },
    ],
  },
  specialties: {
    eyebrow: "Quem pode te atender",
    title: "Rede certa para diabetes",
    subtitle:
      "O cuidado é multiprofissional. Muitos começam com o clínico; o endocrinologista entra quando o caso pede mais precisão.",
    items: [
      {
        title: "Clínico geral",
        body: "Porta de entrada: diagnóstico, início do tratamento e acompanhamento do tipo 2 estável.",
      },
      {
        title: "Endocrinologista",
        body: "Referência para tipo 1, controle difícil, insulina complexa ou dúvida sobre o tipo de diabetes.",
      },
      {
        title: "Nutricionista",
        body: "Plano alimentar realista — parte essencial do controle, não um ‘extra’.",
      },
      {
        title: "Farmácia e laboratório",
        body: "Receita digital, insumos e exames (glicemia, HbA1c) na rede Doctor8 quando disponível na sua cidade.",
      },
    ],
  },
  risks: {
    eyebrow: "Por que não deixar para depois",
    title: "Glicose alta cobra olhos, rins, nervos e coração",
    image: {
      src: "/marketing/diabetes/cuidado.webp",
      alt: "Pessoa caminhando ao ar livre, simbolizando cuidado contínuo com diabetes",
    },
    items: [
      { organ: "Olhos", body: "Retinopatia pode avançar em silêncio — rastreio e controle glicêmico protegem a visão." },
      { organ: "Rins", body: "Diabetes e pressão alta são causas líderes de doença renal no Brasil." },
      { organ: "Nervos e pés", body: "Formigamento, feridas que não cicatrizam e risco de úlcera pedem atenção precoce." },
      { organ: "Coração", body: "Risco cardiovascular sobe — por isso pressão, colesterol e glicose andam juntos no plano." },
    ],
  },
  nutrition: {
    eyebrow: "Nutrição + tratamento",
    title: "Comer bem faz parte do remédio",
    body: "Medicamento sem plano alimentar costuma frustrar. Na Doctor8 você conecta a consulta médica à orientação nutricional — com o mesmo histórico de saúde.",
    image: {
      src: "/marketing/diabetes/nutricao.webp",
      alt: "Consulta de nutrição com refeição saudável para controle de diabetes",
    },
    bullets: [
      "Orientação alimentar alinhada ao plano do médico",
      "Foco em adesão sustentável — não dieta milagrosa",
      "Retorno para ajustar o que funciona na sua rotina",
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Posso renovar receita de diabetes online?",
        a: "Sim, quando um médico avaliar seu caso e entender que a renovação é segura. A consulta (ou avaliação) vem antes da prescrição — não é automático.",
      },
      {
        q: "Preciso de endocrinologista ou clínico geral?",
        a: "Muitos com tipo 2 estável começam com o clínico. Tipo 1, controle difícil, insulina complexa ou dúvida de diagnóstico pedem endocrinologista. O médico orienta.",
      },
      {
        q: "A Doctor8 garante receita de Ozempic ou semaglutida?",
        a: "Não. GLP-1 e outros remédios só entram se houver indicação clínica após avaliação. Nosso foco é acompanhamento — não ‘receita sob demanda’.",
      },
      {
        q: "Serve para emergência ou cetoacidose?",
        a: "Não. Confusão, vômitos intensos, dor abdominal forte ou mal-estar grave exigem SAMU 192 ou pronto-socorro. Esta página é para orientação e continuidade.",
      },
      {
        q: "Diabetes tem cura?",
        a: "Na maioria dos casos tipo 2 é crônico: o objetivo é controle. Com medicação, alimentação, atividade e retorno, milhões de brasileiros vivem bem com a glicose estável.",
      },
      {
        q: "Também tenho pressão alta. O que fazer?",
        a: "Diabetes e hipertensão costumam andar juntos. Você pode começar por esta página ou pela landing de pressão alta — o importante é não ficar sem acompanhamento.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para controlar sua glicose com acompanhamento?",
    subtitle:
      "Agende agora ou fale no WhatsApp. Se também tem pressão alta, veja a página de hipertensão.",
    primary: { label: "Agendar consulta", href: "/register" },
    secondary: { label: "WhatsApp Doctor8" },
    browse: { label: "Buscar especialistas", href: "/" },
    crossLink: { label: "Ver página de pressão alta", href: "/hipertensao" },
  },
} as const;
