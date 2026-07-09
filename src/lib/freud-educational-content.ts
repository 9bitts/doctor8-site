import type { Lang } from "@/lib/i18n/translations";

export type FreudConcept = { title: string; body: string };
export type FreudProfession = {
  title: string;
  fields: { label: string; body: string }[];
  quote?: { text: string; author: string };
};
export type FreudWork = { year: string; title: string };
export type FreudTimelineEvent = { year: string; text: string };
export type FreudTimelineEra = { title: string; events: FreudTimelineEvent[] };

export type FreudEducationalContent = {
  introDesc: string;
  introQuote: string;
  whatIsTitle: string;
  whatIsBody: string;
  whatIsQuote: string;
  whatIsEssence: string;
  aboutTitle: string;
  aboutP1: string;
  aboutP2: string;
  aboutP3: string;
  conceptsTitle: string;
  conceptsIntro: string;
  concepts: FreudConcept[];
  methodTitle: string;
  methodIntro: string;
  methodItems: FreudConcept[];
  professionsTitle: string;
  professions: FreudProfession[];
  worksTitle: string;
  works: FreudWork[];
  worksFootnote: string;
  timelineTitle: string;
  timelineEras: FreudTimelineEra[];
};

const FREUD_WORKS: FreudWork[] = [
  { year: "1895", title: "Estudos sobre a Histeria (com Breuer)" },
  { year: "1899", title: "Interpretação dos Sonhos" },
  { year: "1901", title: "Psicopatologia da Vida Cotidiana" },
  { year: "1901", title: "Sobre a Psicanálise (Complementos)" },
  { year: "1901", title: "A Fragmentária de 1900 (Cartas sobre a técnica)" },
  { year: "1905", title: "Três Ensaios sobre a Teoria da Sexualidade" },
  { year: "1905", title: "Fragmento de uma Análise de Caso de Histeria" },
  { year: "1905", title: 'Um Caso de Moral Sexual "Civilizada"' },
  { year: "1905", title: "O Humor" },
  { year: "1909", title: "Análise de Fobia (Caso do Pequeno Hans)" },
  { year: "1910", title: "Leonardo da Vinci e uma Lembrança da sua Infância" },
  { year: "1911", title: "Formulações sobre os Dois Princípios do Acontecer Psíquico" },
  { year: "1911", title: "Notas Psicanalíticas sobre um Relato Autobiográfico (Schreber)" },
  { year: "1912", title: "Recomendações aos Médicos que Exercem a Psicanálise" },
  { year: "1913", title: "Totem e Tabu" },
  { year: "1913", title: "Sobre o Início do Tratamento" },
  { year: "1914", title: "O Interesse pela Psicanálise" },
  { year: "1914", title: "Sobre o Narcisismo: uma Introdução" },
  { year: "1914", title: "Recordar, Repetir e Elaborar" },
  { year: "1915", title: "Conferências Introdutórias sobre Psicanálise (I)" },
  { year: "1916", title: "Conferências Introdutórias sobre Psicanálise (II)" },
  { year: "1917", title: "Luto e Melancolia" },
  { year: "1917", title: "Conferências Introdutórias sobre Psicanálise (III)" },
  { year: "1918", title: 'História de uma Neurose Infantil ("Homem dos Lobos")' },
  { year: "1919", title: "O Estranho" },
  { year: "1920", title: "Além do Princípio do Prazer" },
  { year: "1921", title: "Psicologia das Massas e Análise do Eu" },
  { year: "1923", title: "O Ego e o Id" },
  { year: "1923", title: "O Problema Econômico do Masoquismo" },
  { year: "1924", title: "Neuroses e Psicoses" },
  { year: "1925", title: "Algumas Consequências Psíquicas da Diferença Anatômica entre os Sexos" },
  { year: "1926", title: "Inibições, Sintomas e Angústia" },
  { year: "1930", title: "O Mal-Estar na Civilização" },
  { year: "1932", title: "Novas Conferências Introdutórias sobre Psicanálise" },
  { year: "1933", title: "Por que a Guerra?" },
  { year: "1937", title: "Análise Terminável e Interminável" },
  { year: "1938", title: "Moisés e o Monoteísmo" },
  { year: "1939", title: "Esboço de Psicanálise" },
  { year: "1940", title: "Uma Dificuldade da Psicanálise (e outros textos póstumos)" },
];

const FREUD_TIMELINE_PT: FreudTimelineEra[] = [
  {
    title: "Infância e Formação (1856–1881)",
    events: [
      { year: "1856", text: "Nasce em Freiberg (atual República Tcheca), no dia 6 de maio." },
      { year: "1860", text: "Muda-se com a família para Viena, Áustria." },
      { year: "1873", text: "Ingressa na Faculdade de Medicina da Universidade de Viena." },
      { year: "1881", text: "Forma-se em Medicina, com foco em neuroanatomia." },
    ],
  },
  {
    title: "Descoberta do Inconsciente (1885–1900)",
    events: [
      { year: "1885", text: "Estuda em Paris com Jean-Martin Charcot, onde descobre a histeria e a hipnose." },
      { year: "1886", text: "Abre seu consultório em Viena e casa-se com Martha Bernays." },
      { year: "1895", text: 'Publica "Estudos sobre a Histeria" com Josef Breuer, marcando o início da psicanálise.' },
      { year: "1896", text: 'Usa o termo "psicanálise" pela primeira vez.' },
      { year: "1899", text: 'Publica "A Interpretação dos Sonhos" (pós-datado como ano 1900).' },
    ],
  },
  {
    title: "Consolidação do Movimento (1901–1920)",
    events: [
      { year: "1902", text: "Funda a Sociedade Psicológica das Quartas-Feiras, futura Sociedade Psicanalítica de Viena." },
      { year: "1905", text: 'Publica "Três Ensaios sobre a Teoria da Sexualidade".' },
      { year: "1909", text: "Viaja aos Estados Unidos para palestrar na Clark University, expandindo sua fama." },
      { year: "1910", text: "Funda a Associação Psicanalítica Internacional (IPA)." },
      { year: "1913", text: "Rompe definitivamente as relações teóricas com Carl Jung." },
      { year: "1920", text: 'Publica "Além do Princípio do Prazer", introduzindo o conceito de pulsão de morte.' },
    ],
  },
  {
    title: "Últimos Anos e Exílio (1923–1939)",
    events: [
      { year: "1923", text: 'Publica "O Ego e o Id", definindo a segunda tópica do aparelho psíquico.' },
      { year: "1923", text: "É diagnosticado com câncer no palato e passa pela primeira de dezenas de cirurgias." },
      { year: "1930", text: 'Publica "O Mal-Estar na Civilização".' },
      { year: "1938", text: "Foge de Viena para Londres após a anexação da Áustria pela Alemanha nazista." },
      { year: "1939", text: "Morre em Londres, no dia 23 de setembro, via eutanásia consentida devido ao câncer avançado." },
    ],
  },
];

const pt: FreudEducationalContent = {
  introDesc: "Entenda os principais conceitos, obras e contribuições de Sigmund Freud e da psicanálise.",
  introQuote: "Não desejo suscitar convicções, o que desejo é estimular o pensamento e derrubar preconceitos.",
  whatIsTitle: "O que é psicanálise?",
  whatIsBody:
    "A psicanálise é um método de investigação do inconsciente e, ao mesmo tempo, um tratamento clínico. Fundada por Sigmund Freud, parte da premissa de que sintomas, atos falhos e sonhos revelam conflitos psíquicos inconscientes que podem ser elaborados por meio da fala.",
  whatIsQuote: "A psicanálise é, na verdade, um tratamento de cura pelas palavras.",
  whatIsEssence: "E, em essência, a cura pelo amor.",
  aboutTitle: "Sobre Sigmund Freud",
  aboutP1:
    "Sigmund Freud (1856–1939), nome de batismo Sigismund Schlomo Freud, foi um médico neurologista austríaco, fundador da psicanálise e principal responsável por seu desenvolvimento como teoria e método clínico. Além de médico, destacou-se como cientista, professor e escritor. Em 1930, recebeu o Prêmio Goethe de Literatura, uma das mais importantes honrarias culturais da Alemanha, em reconhecimento à qualidade e à influência de sua obra.",
  aboutP2:
    "Considerado um dos pensadores mais influentes do século XX, seu trabalho revolucionou a compreensão da mente humana e transformou profundamente a maneira como o ser humano passou a compreender a si mesmo. Ao propor que o comportamento humano é amplamente guiado por pensamentos, desejos e memórias ocultos na parte inconsciente da psique, mudou os paradigmas da psicologia e influenciou a cultura ocidental de forma definitiva.",
  aboutP3:
    "Seu legado permanece presente em diversas áreas do conhecimento — medicina, psicologia, filosofia, literatura, educação, antropologia, artes e política — e continua sendo fundamental para o estudo da mente e do comportamento humano.",
  conceptsTitle: "Os 4 conceitos fundamentais da psicanálise",
  conceptsIntro:
    "Os quatro conceitos fundamentais da psicanálise, postulados originalmente por Sigmund Freud e consolidados pelo psicanalista Jacques Lacan em seu Seminário 11, são: o inconsciente, a repetição, a transferência e a pulsão.",
  concepts: [
    {
      title: "Inconsciente",
      body: "A parte da mente que abriga desejos, memórias e traumas reprimidos, inacessíveis ao conhecimento consciente, mas que influenciam o comportamento e escolhas atuais do sujeito.",
    },
    {
      title: "Repetição",
      body: "O fenômeno em que o paciente, inconscientemente, repete padrões, ações ou situações traumáticas, em busca de elaboração ou resolução.",
    },
    {
      title: "Transferência",
      body: "O processo onde o paciente projeta no psicanalista sentimentos, desejos e expectativas originados em figuras importantes de seu passado, geralmente o pai, a mãe ou quem cumpriu essa função.",
    },
    {
      title: "Pulsão",
      body: "A força ou pressão psíquica que impele o sujeito a agir em busca de satisfação, situando-se no limite entre o biológico e o psíquico.",
    },
  ],
  methodTitle: "O método psicanalítico",
  methodIntro: "O método psicanalítico de Sigmund Freud baseia-se em uma trindade técnica:",
  methodItems: [
    {
      title: "Associação Livre",
      body: "Considerada a 'regra fundamental' da psicanálise, orienta o paciente a expressar tudo o que lhe vem à mente sem censuras, filtros ou julgamentos morais.",
    },
    {
      title: "Escuta (ou Atenção) Flutuante",
      body: "É a postura do analista frente ao discurso do paciente, suspendendo expectativas e preconceitos teóricos para acolher o inesperado.",
    },
    {
      title: "Interpretação",
      body: "É a intervenção do analista baseada no material produzido pela associação livre e filtrado pela escuta flutuante, tornando consciente o que era inconsciente.",
    },
  ],
  professionsTitle: "Diferença entre Psicólogo, Psicanalista e Psiquiatra",
  professions: [
    {
      title: "Psicólogo",
      fields: [
        { label: "Formação", body: "Graduação universitária de 5 anos em Psicologia." },
        {
          label: "Método",
          body: "Usa psicoterapias de diversas linhas teóricas (TCC, humanista, gestalt e outras) para tratar conflitos emocionais e distúrbios de personalidade.",
        },
        { label: "Restrição", body: "Não prescreve medicamentos." },
      ],
    },
    {
      title: "Psicanalista",
      fields: [
        {
          label: "Formação",
          body: "Graduação em qualquer área, acrescida de formação em Psicanálise (cerca de 3 a 4 anos) e estudo contínuo.",
        },
        {
          label: "Método",
          body: "A psicanálise utiliza o método da análise (ou cura pela fala), baseado na investigação do inconsciente por meio da fala, da associação livre e da análise de sonhos. A cura vem por acréscimo, não é o objetivo direto.",
        },
        { label: "Exigência", body: "Tripé psicanalítico: teoria, análise pessoal e supervisão de casos." },
        { label: "Restrição", body: "Não prescreve medicamentos." },
      ],
      quote: {
        text: "O paciente curado recupera-se mais facilmente dos transtornos provocados pelos acontecimentos perturbadores da vida. Aprendeu que nenhuma dor é definitiva, nem absoluta... Estar curado é poder reagir ao inesperado e reencontrar a capacidade de amar e de atuar.",
        author: "J. D. Nasio",
      },
    },
    {
      title: "Psiquiatra",
      fields: [
        { label: "Formação", body: "Graduação em Medicina com Residência em Psiquiatria." },
        { label: "Atuação", body: "Foca na saúde mental sob perspectiva estritamente médica e biológica." },
        {
          label: "Método",
          body: "Diagnostica doenças mentais e foca o tratamento no reequilíbrio químico do cérebro.",
        },
        { label: "Diferencial", body: "É o único dos três que pode receitar remédios, controlados ou não." },
      ],
    },
  ],
  worksTitle: "Obras completas de Freud (ordem cronológica)",
  works: FREUD_WORKS,
  worksFootnote:
    "Edição de referência: Freud, S. — Obras Completas. Edição Standard Brasileira das Obras Psicológicas Completas de Sigmund Freud (Tradução e organização da Imago Editora).",
  timelineTitle: "Linha do tempo",
  timelineEras: FREUD_TIMELINE_PT,
};

const en: FreudEducationalContent = {
  introDesc: "Explore Sigmund Freud's key concepts, works and contributions to psychoanalysis.",
  introQuote: "I do not wish to arouse convictions; I wish to stimulate thought and to upset prejudices.",
  whatIsTitle: "What is psychoanalysis?",
  whatIsBody:
    "Psychoanalysis is both a method for investigating the unconscious and a clinical treatment. Founded by Sigmund Freud, it holds that symptoms, slips and dreams reveal unconscious psychic conflicts that can be worked through in speech.",
  whatIsQuote: "Psychoanalysis is, in fact, a treatment that cures through words.",
  whatIsEssence: "And, in essence, a cure through love.",
  aboutTitle: "About Sigmund Freud",
  aboutP1:
    "Sigmund Freud (1856–1939), born Sigismund Schlomo Freud, was an Austrian neurologist, founder of psychoanalysis and the main architect of its development as theory and clinical method. A physician, scientist, professor and writer, he received the Goethe Prize for Literature in 1930.",
  aboutP2:
    "Considered one of the most influential thinkers of the 20th century, his work revolutionized the understanding of the human mind by proposing that behavior is largely guided by thoughts, desires and memories hidden in the unconscious.",
  aboutP3:
    "His legacy remains present in medicine, psychology, philosophy, literature, education, anthropology, the arts and politics — and continues to be fundamental to the study of mind and human behavior.",
  conceptsTitle: "The 4 fundamental concepts of psychoanalysis",
  conceptsIntro:
    "The four fundamental concepts of psychoanalysis, originally postulated by Sigmund Freud and consolidated by Jacques Lacan in Seminar 11, are: the unconscious, repetition, transference and drive.",
  concepts: [
    {
      title: "Unconscious",
      body: "The part of the mind that harbors repressed desires, memories and traumas, inaccessible to conscious knowledge yet influencing present behavior and choices.",
    },
    {
      title: "Repetition",
      body: "The phenomenon in which the patient unconsciously repeats patterns, actions or traumatic situations in search of elaboration or resolution.",
    },
    {
      title: "Transference",
      body: "The process by which the patient projects onto the analyst feelings, desires and expectations originating in important figures from the past, usually parents or parental substitutes.",
    },
    {
      title: "Drive",
      body: "The psychic force or pressure that impels the subject to act in search of satisfaction, situated at the boundary between the biological and the psychic.",
    },
  ],
  methodTitle: "The psychoanalytic method",
  methodIntro: "Sigmund Freud's psychoanalytic method is based on a technical trinity:",
  methodItems: [
    {
      title: "Free Association",
      body: "Considered the 'fundamental rule' of psychoanalysis, it guides the patient to express everything that comes to mind without censorship, filters or moral judgment.",
    },
    {
      title: "Floating Attention",
      body: "The analyst's stance toward the patient's discourse, suspending expectations and theoretical prejudices to welcome the unexpected.",
    },
    {
      title: "Interpretation",
      body: "The analyst's intervention based on material produced through free association and filtered by floating attention, making conscious what was unconscious.",
    },
  ],
  professionsTitle: "Difference between Psychologist, Psychoanalyst and Psychiatrist",
  professions: [
    {
      title: "Psychologist",
      fields: [
        { label: "Training", body: "Five-year university degree in Psychology." },
        {
          label: "Method",
          body: "Uses psychotherapies from diverse theoretical lines (CBT, humanistic, gestalt and others) to treat emotional conflicts and personality disorders.",
        },
        { label: "Limitation", body: "Cannot prescribe medication." },
      ],
    },
    {
      title: "Psychoanalyst",
      fields: [
        {
          label: "Training",
          body: "Degree in any field plus psychoanalytic training (about 3–4 years) and continuous study.",
        },
        {
          label: "Method",
          body: "Psychoanalysis uses the analytic method (talking cure), investigating the unconscious through speech, free association and dream analysis. Cure comes as a by-product, not as a direct goal.",
        },
        { label: "Requirement", body: "Psychoanalytic tripod: theory, personal analysis and case supervision." },
        { label: "Limitation", body: "Cannot prescribe medication." },
      ],
      quote: {
        text: "The cured patient recovers more easily from disorders caused by disturbing life events. They have learned that no pain is definitive or absolute... To be cured is to react to the unexpected and regain the capacity to love and act.",
        author: "J. D. Nasio",
      },
    },
    {
      title: "Psychiatrist",
      fields: [
        { label: "Training", body: "Medical degree with residency in Psychiatry." },
        { label: "Practice", body: "Focuses on mental health from a strictly medical and biological perspective." },
        {
          label: "Method",
          body: "Diagnoses mental illness and focuses treatment on rebalancing brain chemistry.",
        },
        { label: "Difference", body: "The only one of the three who can prescribe medication, controlled or not." },
      ],
    },
  ],
  worksTitle: "Freud's complete works (chronological order)",
  works: FREUD_WORKS.map((w) => ({
    year: w.year,
    title: w.title
      .replace("Estudos sobre a Histeria", "Studies on Hysteria")
      .replace("Interpretação dos Sonhos", "The Interpretation of Dreams")
      .replace("Psicopatologia da Vida Cotidiana", "Psychopathology of Everyday Life")
      .replace("Três Ensaios sobre a Teoria da Sexualidade", "Three Essays on the Theory of Sexuality")
      .replace("Além do Princípio do Prazer", "Beyond the Pleasure Principle")
      .replace("O Ego e o Id", "The Ego and the Id")
      .replace("O Mal-Estar na Civilização", "Civilization and Its Discontents")
      .replace("Esboço de Psicanálise", "An Outline of Psychoanalysis"),
  })),
  worksFootnote:
    "Reference edition: Freud, S. — Complete Works. Brazilian Standard Edition of the Complete Psychological Works of Sigmund Freud (Imago Editora).",
  timelineTitle: "Timeline",
  timelineEras: [
    {
      title: "Childhood and Training (1856–1881)",
      events: [
        { year: "1856", text: "Born in Freiberg (now Czech Republic) on May 6." },
        { year: "1860", text: "Moves with his family to Vienna, Austria." },
        { year: "1873", text: "Enters the Faculty of Medicine at the University of Vienna." },
        { year: "1881", text: "Graduates in Medicine, focusing on neuroanatomy." },
      ],
    },
    {
      title: "Discovery of the Unconscious (1885–1900)",
      events: [
        { year: "1885", text: "Studies in Paris with Jean-Martin Charcot, discovering hysteria and hypnosis." },
        { year: "1886", text: "Opens his practice in Vienna and marries Martha Bernays." },
        { year: "1895", text: 'Publishes "Studies on Hysteria" with Josef Breuer, marking the birth of psychoanalysis.' },
        { year: "1896", text: 'Uses the term "psychoanalysis" for the first time.' },
        { year: "1899", text: 'Publishes "The Interpretation of Dreams" (post-dated 1900).' },
      ],
    },
    {
      title: "Consolidation of the Movement (1901–1920)",
      events: [
        { year: "1902", text: "Founds the Wednesday Psychological Society, later the Vienna Psychoanalytic Society." },
        { year: "1905", text: 'Publishes "Three Essays on the Theory of Sexuality".' },
        { year: "1909", text: "Travels to the United States to lecture at Clark University, expanding his fame." },
        { year: "1910", text: "Founds the International Psychoanalytical Association (IPA)." },
        { year: "1913", text: "Breaks definitively with Carl Jung." },
        { year: "1920", text: 'Publishes "Beyond the Pleasure Principle", introducing the death drive.' },
      ],
    },
    {
      title: "Final Years and Exile (1923–1939)",
      events: [
        { year: "1923", text: 'Publishes "The Ego and the Id", defining the structural model.' },
        { year: "1923", text: "Diagnosed with palate cancer; undergoes the first of many surgeries." },
        { year: "1930", text: 'Publishes "Civilization and Its Discontents".' },
        { year: "1938", text: "Flees Vienna for London after Austria's annexation by Nazi Germany." },
        { year: "1939", text: "Dies in London on September 23, by physician-assisted euthanasia due to advanced cancer." },
      ],
    },
  ],
};

const es: FreudEducationalContent = {
  ...en,
  introDesc: "Conozca los principales conceptos, obras y contribuciones de Sigmund Freud y del psicoanálisis.",
  introQuote: "No deseo suscitar convicciones; deseo estimular el pensamiento y derribar prejuicios.",
  whatIsTitle: "¿Qué es el psicoanálisis?",
  whatIsBody:
    "El psicoanálisis es un método de investigación del inconsciente y, al mismo tiempo, un tratamiento clínico. Fundado por Sigmund Freud, parte de la premisa de que síntomas, actos fallidos y sueños revelan conflictos psíquicos inconscientes.",
  whatIsQuote: "El psicoanálisis es, en verdad, un tratamiento de cura por las palabras.",
  whatIsEssence: "Y, en esencia, la cura por el amor.",
  aboutTitle: "Sobre Sigmund Freud",
  conceptsTitle: "Los 4 conceptos fundamentales del psicoanálisis",
  conceptsIntro:
    "Los cuatro conceptos fundamentales del psicoanálisis, postulados por Sigmund Freud y consolidados por Jacques Lacan en su Seminario 11, son: el inconsciente, la repetición, la transferencia y la pulsión.",
  concepts: [
    {
      title: "Inconsciente",
      body: "La parte de la mente que alberga deseos, memorias y traumas reprimidos, inaccesibles al conocimiento consciente, pero que influyen en el comportamiento actual.",
    },
    {
      title: "Repetición",
      body: "El fenómeno en que el paciente repite inconscientemente patrones, acciones o situaciones traumáticas en busca de elaboración o resolución.",
    },
    {
      title: "Transferencia",
      body: "El proceso en que el paciente proyecta en el psicoanalista sentimientos, deseos y expectativas originados en figuras importantes de su pasado.",
    },
    {
      title: "Pulsión",
      body: "La fuerza o presión psíquica que impulsa al sujeto a actuar en busca de satisfacción, en el límite entre lo biológico y lo psíquico.",
    },
  ],
  methodTitle: "El método psicoanalítico",
  methodIntro: "El método psicoanalítico de Sigmund Freud se basa en una trinidad técnica:",
  methodItems: [
    {
      title: "Asociación Libre",
      body: "Considerada la 'regla fundamental' del psicoanálisis, orienta al paciente a expresar todo lo que le viene a la mente sin censuras ni juicios morales.",
    },
    {
      title: "Escucha Flotante",
      body: "Es la postura del analista ante el discurso del paciente, suspendiendo expectativas y prejuicios teóricos para acoger lo inesperado.",
    },
    {
      title: "Interpretación",
      body: "Es la intervención del analista basada en el material producido por la asociación libre, haciendo consciente lo que era inconsciente.",
    },
  ],
  professionsTitle: "Diferencia entre Psicólogo, Psicoanalista y Psiquiatra",
  professions: [
    {
      title: "Psicólogo",
      fields: [
        { label: "Formación", body: "Licenciatura universitaria de 5 años en Psicología." },
        { label: "Método", body: "Usa psicoterapias de diversas líneas teóricas para tratar conflictos emocionales." },
        { label: "Restricción", body: "No prescribe medicamentos." },
      ],
    },
    {
      title: "Psicoanalista",
      fields: [
        { label: "Formación", body: "Licenciatura en cualquier área, más formación en Psicoanálisis (3–4 años) y estudio continuo." },
        { label: "Método", body: "Utiliza el método de la cura por la palabra, investigando el inconsciente mediante la asociación libre y el análisis de sueños." },
        { label: "Exigencia", body: "Trípode psicoanalítico: teoría, análisis personal y supervisión de casos." },
        { label: "Restricción", body: "No prescribe medicamentos." },
      ],
      quote: {
        text: "El paciente curado se recupera más fácilmente de los trastornos provocados por acontecimientos perturbadores. Aprendió que ningún dolor es definitivo... Estar curado es poder reaccionar a lo inesperado y reencontrar la capacidad de amar y actuar.",
        author: "J. D. Nasio",
      },
    },
    {
      title: "Psiquiatra",
      fields: [
        { label: "Formación", body: "Licenciatura en Medicina con Residencia en Psiquiatría." },
        { label: "Actuación", body: "Se enfoca en la salud mental desde una perspectiva médica y biológica." },
        { label: "Método", body: "Diagnostica enfermedades mentales y enfoca el tratamiento en el reequilibrio químico cerebral." },
        { label: "Diferencial", body: "Es el único de los tres que puede recetar medicamentos." },
      ],
    },
  ],
  worksTitle: "Obras completas de Freud (orden cronológico)",
  worksFootnote:
    "Edición de referencia: Freud, S. — Obras Completas. Edición Standard Brasileña (Imago Editora).",
  timelineTitle: "Línea de tiempo",
  timelineEras: [
    {
      title: "Infancia y Formación (1856–1881)",
      events: [
        { year: "1856", text: "Nace en Freiberg (actual República Checa), el 6 de mayo." },
        { year: "1860", text: "Se muda con su familia a Viena, Austria." },
        { year: "1873", text: "Ingresa a la Facultad de Medicina de la Universidad de Viena." },
        { year: "1881", text: "Se gradúa en Medicina, con enfoque en neuroanatomía." },
      ],
    },
    {
      title: "Descubrimiento del Inconsciente (1885–1900)",
      events: [
        { year: "1885", text: "Estudia en París con Jean-Martin Charcot, descubriendo la histeria y la hipnosis." },
        { year: "1886", text: "Abre su consultorio en Viena y se casa con Martha Bernays." },
        { year: "1895", text: 'Publica "Estudios sobre la Histeria" con Josef Breuer.' },
        { year: "1896", text: 'Usa el término "psicoanálisis" por primera vez.' },
        { year: "1899", text: 'Publica "La Interpretación de los Sueños" (posdatado 1900).' },
      ],
    },
    {
      title: "Consolidación del Movimiento (1901–1920)",
      events: [
        { year: "1902", text: "Fundó la Sociedad Psicológica de los Miércoles." },
        { year: "1905", text: 'Publica "Tres Ensayos sobre Teoría Sexual".' },
        { year: "1909", text: "Viaja a Estados Unidos para conferenciar en la Universidad Clark." },
        { year: "1910", text: "Fundó la Asociación Psicoanalítica Internacional (IPA)." },
        { year: "1913", text: "Rompe definitivamente con Carl Jung." },
        { year: "1920", text: 'Publica "Más allá del Principio del Placer".' },
      ],
    },
    {
      title: "Últimos Años y Exilio (1923–1939)",
      events: [
        { year: "1923", text: 'Publica "El Yo y el Ello".' },
        { year: "1923", text: "Es diagnosticado con cáncer de paladar." },
        { year: "1930", text: 'Publica "El Malestar en la Cultura".' },
        { year: "1938", text: "Huye de Viena a Londres tras la anexión de Austria." },
        { year: "1939", text: "Muere en Londres el 23 de septiembre." },
      ],
    },
  ],
};

const BY_LANG: Record<Lang, FreudEducationalContent> = { pt, en, es };

export function getFreudEducationalContent(lang: Lang): FreudEducationalContent {
  return BY_LANG[lang] ?? pt;
}
