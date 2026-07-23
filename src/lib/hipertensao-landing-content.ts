/** Landing de intenção: pressão alta / hipertensão — /hipertensao */

export const HIPERTENSAO_WHATSAPP_E164 = "5531971720053";
export const HIPERTENSAO_WHATSAPP_DISPLAY = "+55 31 97172-0053";

export function hipertensaoWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${HIPERTENSAO_WHATSAPP_E164}`;
  const text = message?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const HIPERTENSAO_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vi a página /hipertensao da Doctor8 e quero marcar uma consulta sobre pressão alta.";

export const HIPERTENSAO_LANDING = {
  meta: {
    title: "Pressão alta (hipertensão): consulta online e acompanhamento | Doctor8",
    description:
      "Controle sua pressão alta com consulta online, receita digital válida na farmácia e acompanhamento contínuo. Cardiologista ou clínico na Doctor8.",
  },
  hero: {
    eyebrow: "Pressão alta · Cuidado contínuo",
    title: "Controle sua pressão alta sem fila",
    titleHighlight: "médico, receita digital e acompanhamento",
    subtitle:
      "Hipertensão quase não dá sintoma. O risco está no silêncio. Avalie com clínico ou cardiologista online e mantenha o tratamento em dia.",
    primaryCta: { label: "Agendar consulta", href: "/register" },
    secondaryCta: { label: "Falar no WhatsApp" },
    browseCta: { label: "Buscar cardiologista", href: "/" },
    emergencyNote:
      "Dor no peito, falta de ar grave, perda de força ou fala alterada? Ligue 192 — emergência, não teleconsulta.",
    image: {
      src: "/marketing/hipertensao/hero.webp",
      alt: "Pessoa medindo a pressão arterial em casa com monitor digital",
    },
  },
  whenToBook: {
    eyebrow: "Quando marcar",
    title: "Mesmo sem sintoma, a pressão pode estar alta",
    subtitle:
      "A hipertensão é chamada de silenciosa porque muitas pessoas só descobrem em uma medição. Marque se alguma destas situações for a sua.",
    items: [
      {
        title: "Mediu 14 por 9 ou mais",
        body: "Valores iguais ou acima de 140/90 mmHg pedem avaliação médica — não só o aparelho de casa.",
      },
      {
        title: "Acabou o remédio contínuo",
        body: "Anti-hipertensivo é tratamento contínuo. Renove com avaliação, não por conta própria.",
      },
      {
        title: "Dor de cabeça, tontura ou zumbido",
        body: "Podem aparecer quando a pressão sobe muito. Um médico orienta o próximo passo com segurança.",
      },
      {
        title: "Histórico na família ou diabetes",
        body: "Risco maior pede acompanhamento regular — coração, rins e visão entram no radar.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Como funciona",
    title: "Da consulta à farmácia, no mesmo ecossistema",
    subtitle: "Não é só renovar receita. É cuidado contínuo com histórico no prontuário.",
    image: {
      src: "/marketing/hipertensao/consulta.webp",
      alt: "Paciente em teleconsulta com médico pela Doctor8",
    },
    steps: [
      {
        step: "01",
        title: "Agende online",
        body: "Escolha clínico ou cardiologista e o horário que cabe na sua rotina.",
      },
      {
        step: "02",
        title: "Consulta por vídeo",
        body: "Conte histórico, medicações e dúvidas. O médico avalia se precisa de exame ou ajuste.",
      },
      {
        step: "03",
        title: "Receita digital",
        body: "Prescrição válida para apresentar na farmácia — sem deslocamento só para ‘pegar papel’.",
      },
      {
        step: "04",
        title: "Acompanhe",
        body: "Retorno, lembretes e rede de farmácia/laboratório quando fizer sentido.",
      },
    ],
  },
  specialties: {
    eyebrow: "Quem pode te atender",
    title: "Rede certa para pressão alta",
    subtitle:
      "No Brasil, a maior parte dos hipertensos começa com o clínico. O cardiologista entra quando o risco ou o controle pedem.",
    items: [
      {
        title: "Clínico geral",
        body: "Porta de entrada: diagnóstico, início do tratamento e acompanhamento leve a moderado.",
      },
      {
        title: "Cardiologista",
        body: "Referência para risco cardiovascular alto, pressão difícil de controlar ou histórico cardíaco.",
      },
      {
        title: "Nutricionista",
        body: "Menos sal, peso e hábitos — apoio ao plano médico, não substituto da consulta.",
      },
      {
        title: "Farmácia na rede",
        body: "Dispensação com receita digital e proximidade quando a rede estiver ativa na sua cidade.",
      },
    ],
  },
  risks: {
    eyebrow: "Por que não deixar para depois",
    title: "Pressão alta não dói — mas cobra órgãos vitais",
    image: {
      src: "/marketing/hipertensao/cuidado.webp",
      alt: "Casal caminhando ao ar livre, simbolizando cuidado contínuo com a saúde",
    },
    items: [
      { organ: "Coração", body: "Infarto, insuficiência cardíaca e esforço constante do músculo cardíaco." },
      { organ: "Cérebro", body: "AVC e risco vascular — o silêncio da pressão pode custar função e autonomia." },
      { organ: "Rins", body: "Com o tempo, hipertensão e diabetes são causas líderes de doença renal." },
    ],
  },
  pharmacy: {
    eyebrow: "Receita + farmácia",
    title: "Tratamento contínuo sem burocracia desnecessária",
    body: "Depois da consulta, sua receita digital segue com você. Na Doctor8, o caminho consulta → prescrição → farmácia fica no mesmo ecossistema — com prontuário para o próximo retorno.",
    image: {
      src: "/marketing/hipertensao/farmacia.webp",
      alt: "Dispensação de medicamento com receita digital em farmácia",
    },
    bullets: [
      "Receita digital para uso contínuo, quando clinicamente indicado",
      "Histórico no prontuário para não recomeçar do zero a cada consulta",
      "Busca de farmácias da rede por proximidade",
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Posso renovar receita de remédio para pressão alta online?",
        a: "Sim, quando um médico avaliar seu caso e entender que a renovação é segura. Não é automático: a consulta (ou avaliação) vem antes da prescrição.",
      },
      {
        q: "A receita digital vale em qualquer farmácia?",
        a: "Receitas emitidas conforme as normas (incluindo assinatura digital quando aplicável) são aceitas nas farmácias do Brasil. Você também pode buscar farmácias da rede Doctor8.",
      },
      {
        q: "Serve para crise hipertensiva ou emergência?",
        a: "Não. Dor no peito, falta de ar grave, confusão, perda de força ou fala alterada exigem SAMU 192 ou pronto-socorro. Esta página é para acompanhamento e orientação.",
      },
      {
        q: "Preciso de cardiologista ou clínico geral?",
        a: "Muitos começam com o clínico. Se a pressão não controla, há diabetes, doença renal ou histórico cardíaco, o cardiologista (ou outro especialista) pode ser o caminho certo — o médico orienta.",
      },
      {
        q: "A hipertensão tem cura?",
        a: "Na maioria dos casos é crônica: o objetivo é controle. Com medicação, hábitos e retorno regular, milhões de brasileiros vivem bem com a pressão estável.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para controlar sua pressão com acompanhamento?",
    subtitle: "Agende agora ou fale no WhatsApp — a gente te encaminha para o próximo passo.",
    primary: { label: "Agendar consulta", href: "/register" },
    secondary: { label: "WhatsApp Doctor8" },
    browse: { label: "Buscar especialistas", href: "/" },
  },
} as const;
