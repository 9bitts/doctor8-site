/**
 * Catálogo genérico de cannabis medicinal por composição (sem marcas).
 * Usado pelo seed data/cannabis/seed.json e pelos testes.
 */

import type { DetalhesCannabis, MedicinaNaturalItemRecord, StatusRegulatorio } from "./item-types";
import { buildMedicinaNaturalSearchText } from "./search-text";

const FONTES = [
  { fonte: "RDC ANVISA nº 327/2019", edicao: "2019" },
  { fonte: "RDC ANVISA nº 660/2022", edicao: "2022" },
  { fonte: "RDC ANVISA nº 1.015/2026", edicao: "2026" },
];

const CONTRAINDICACOES =
  "Hipersensibilidade a canabinoides ou excipientes. Gestação e lactação. Cautela em hepatopatia grave.";

const PRECAUCOES =
  "Iniciar com dose baixa e titular gradualmente (start low, go slow). Monitorar função hepática em uso prolongado ou doses elevadas. Evitar condução de veículos até estabelecer tolerância.";

const INTERACOES =
  "Anticonvulsivantes (clobazam, valproato — risco de sedação e elevação de níveis séricos). Varfarina e anticoagulantes (monitorar INR). Inibidores e indutores de CYP3A4 e CYP2C19 (ex.: fluconazol, rifampicina, carbamazepina). Depressores do SNC (opioides, benzodiazepínicos, álcool — potencialização de sedação).";

const ALERTA_GESTACAO =
  "Contraindicado na gestação e lactação. Uso pediátrico apenas sob supervisão especializada, conforme indicação clínica e normas vigentes.";

const INDICACOES_GERAIS =
  "Dor crônica neuropática e nociceptiva, epilepsia refratária, ansiedade, insônia, TEA, Parkinson, fibromialgia, náusea associada à quimioterapia.";

const INDICACOES_ODONTO =
  "DTM (disfunção temporomandibular), bruxismo, dor orofacial, ansiedade pré-operatória odontológica.";

type OilSpec = {
  slug: string;
  nome: string;
  nomesAlternativos: string[];
  detalhes: DetalhesCannabis;
  posologia?: string;
  indicacoesExtra?: string;
  statusRegulatorio?: StatusRegulatorio;
};

function posologiaOleo(mgMl: number): string {
  const doseInicial = mgMl <= 20 ? "0,1 mL" : mgMl <= 50 ? "0,2 mL" : "0,1–0,2 mL";
  return `Via oral ou sublingual. Iniciar com ${doseInicial} 2x/dia; titular semanalmente conforme resposta clínica (start low, go slow). Frasco 30 mL.`;
}

function posologiaCapsula(mg: number): string {
  return `Via oral. Iniciar com ${mg <= 10 ? "1 cápsula" : "1 cápsula"} à noite; titular conforme resposta (start low, go slow).`;
}

function buildOilRecord(spec: OilSpec): MedicinaNaturalItemRecord {
  const { detalhes } = spec;
  const searchParts = [
    spec.nome,
    ...spec.nomesAlternativos,
    detalhes.espectro.replace(/_/g, " "),
    detalhes.canabinoideDominante,
    detalhes.formaFarmaceutica,
    detalhes.proporcaoCbdThc,
    detalhes.concentracaoCbdMgMl != null ? `cbd ${detalhes.concentracaoCbdMgMl}` : "",
    detalhes.concentracaoThcMgMl != null ? `thc ${detalhes.concentracaoThcMgMl}` : "",
    detalhes.tipoReceituario === "A" ? "receituario a 1:1 full spectrum balanceado" : "receituario b",
  ];
  return {
    slug: spec.slug,
    nome: spec.nome,
    nomesAlternativos: spec.nomesAlternativos,
    nomeCientifico: null,
    categoriaPratica: "CANNABIS",
    indicacoes: `${INDICACOES_GERAIS} ${spec.indicacoesExtra ?? ""}`.trim(),
    contraindicacoes: CONTRAINDICACOES,
    precaucoes: PRECAUCOES,
    interacoesMedicamentosas: INTERACOES,
    posologia: spec.posologia ?? posologiaOleo(detalhes.concentracaoCbdMgMl ?? 10),
    viaAdministracao: ["oral", "sublingual"],
    statusRegulatorio: spec.statusRegulatorio ?? "PRODUTO_AUTORIZADO_ANVISA",
    fontes: FONTES,
    alertaGestacaoPediatria: ALERTA_GESTACAO,
    renisus: false,
    detalhesEspecificos: { ...detalhes, volumeEmbalagem: detalhes.volumeEmbalagem ?? "30 mL" },
    searchText: buildMedicinaNaturalSearchText(searchParts, spec.nomesAlternativos),
  };
}

function buildRecord(
  base: Omit<MedicinaNaturalItemRecord, "searchText">,
  extraSearch: string[] = [],
): MedicinaNaturalItemRecord {
  return {
    ...base,
    searchText: buildMedicinaNaturalSearchText(
      [base.nome, ...extraSearch],
      base.nomesAlternativos,
    ),
  };
}

/** Gera os ~50 itens genéricos do catálogo de cannabis medicinal. */
export function buildCannabisCatalogItems(): MedicinaNaturalItemRecord[] {
  const items: MedicinaNaturalItemRecord[] = [];

  for (const mg of [10, 20, 50, 100, 150, 200]) {
    items.push(
      buildOilRecord({
        slug: `cannabis-oleo-cbd-isolado-${mg}-mg-ml`,
        nome: `Óleo CBD isolado ${mg} mg/mL`,
        nomesAlternativos: [`Canabidiol ${mg} mg/mL`, `CBD isolado ${mg}`, `CBD ${(mg / 10).toFixed(mg >= 100 ? 0 : 1)}%`],
        detalhes: {
          espectro: "isolado",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "oleo",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
        statusRegulatorio: mg <= 200 ? "MEDICAMENTO_REGISTRADO" : "PRODUTO_AUTORIZADO_ANVISA",
      }),
    );
  }

  for (const mg of [20, 50, 100, 150, 200]) {
    items.push(
      buildOilRecord({
        slug: `cannabis-oleo-cbd-broad-${mg}-mg-ml`,
        nome: `Óleo CBD broad spectrum ${mg} mg/mL`,
        nomesAlternativos: [`CBD broad spectrum ${mg} mg/mL`, `Canabidiol broad ${mg}`, "THC não detectável"],
        detalhes: {
          espectro: "broad_spectrum",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "oleo",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
      }),
    );
  }

  for (const mg of [6, 17, 23, 36, 50, 79, 100, 150, 200]) {
    items.push(
      buildOilRecord({
        slug: `cannabis-oleo-cbd-full-${mg}-mg-ml`,
        nome: `Óleo CBD full spectrum ${mg} mg/mL`,
        nomesAlternativos: [`Canabidiol full spectrum ${mg} mg/mL`, `CBD full spectrum ${mg}`, "THC ≤ 0,2%"],
        detalhes: {
          espectro: "full_spectrum",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          concentracaoThcMgMl: Math.max(0.1, mg * 0.004),
          proporcaoCbdThc: "≥20:1",
          formaFarmaceutica: "oleo",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
      }),
    );
  }

  for (const [cbd, thc] of [
    [10, 10],
    [15, 15],
    [25, 25],
    [5, 5],
  ] as const) {
    items.push(
      buildOilRecord({
        slug: `cannabis-oleo-balanceado-${cbd}-${thc}-mg-ml`,
        nome: `Óleo balanceado CBD:THC ${cbd}:${thc} mg/mL (full spectrum)`,
        nomesAlternativos: [`CBD ${cbd} + THC ${thc} mg/mL`, `${cbd}:${thc}`, "1:1", "full spectrum balanceado"],
        detalhes: {
          espectro: "full_spectrum",
          canabinoideDominante: "balanceado",
          concentracaoCbdMgMl: cbd,
          concentracaoThcMgMl: thc,
          proporcaoCbdThc: "1:1",
          formaFarmaceutica: "oleo",
          tipoReceituario: "A",
          thcAcimaLimite: true,
        },
        indicacoesExtra: INDICACOES_ODONTO,
      }),
    );
  }

  items.push(
    buildOilRecord({
      slug: "cannabis-oleo-thc-dominante-25-1",
      nome: "Óleo THC-dominante full spectrum 25 mg/mL THC : 1 mg/mL CBD",
      nomesAlternativos: ["THC 25 mg/mL", "25:1 THC:CBD", "THC dominante"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "THC",
        concentracaoCbdMgMl: 1,
        concentracaoThcMgMl: 25,
        proporcaoCbdThc: "1:25",
        formaFarmaceutica: "oleo",
        tipoReceituario: "A",
        thcAcimaLimite: true,
      },
      posologia: "Via oral ou sublingual. Iniciar com 0,05–0,1 mL à noite; titular conforme resposta (start low, go slow). Frasco 30 mL.",
    }),
    buildOilRecord({
      slug: "cannabis-oleo-thc-dominante-50-mg-ml",
      nome: "Óleo THC-dominante full spectrum 50 mg/mL",
      nomesAlternativos: ["THC 50 mg/mL", "THC full spectrum 50"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "THC",
        concentracaoThcMgMl: 50,
        concentracaoCbdMgMl: 2,
        proporcaoCbdThc: "1:25",
        formaFarmaceutica: "oleo",
        tipoReceituario: "A",
        thcAcimaLimite: true,
      },
      posologia: "Via oral ou sublingual. Iniciar com 0,05 mL à noite; titular conforme resposta (start low, go slow). Frasco 30 mL.",
    }),
    buildOilRecord({
      slug: "cannabis-oleo-thc-10-mg-ml",
      nome: "Óleo THC full spectrum 10 mg/mL",
      nomesAlternativos: ["THC 10 mg/mL", "Canabinol tetrahidrocanabinol 10"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "THC",
        concentracaoThcMgMl: 10,
        concentracaoCbdMgMl: 1,
        formaFarmaceutica: "oleo",
        tipoReceituario: "A",
        thcAcimaLimite: true,
      },
    }),
    buildOilRecord({
      slug: "cannabis-oleo-cbg-cbd-20-20-mg-ml",
      nome: "Óleo CBG 20 mg/mL + CBD 20 mg/mL (full spectrum)",
      nomesAlternativos: ["CBG 20 + CBD 20", "Canabigerol", "CBG dominante"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "CBG",
        concentracaoCbdMgMl: 20,
        concentracaoThcMgMl: 0.4,
        outrosCanabinoides: "CBG 20 mg/mL",
        proporcaoCbdThc: "50:1",
        formaFarmaceutica: "oleo",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
    buildOilRecord({
      slug: "cannabis-oleo-cbn-cbd-insomnia",
      nome: "Óleo CBN 10 mg/mL + CBD 20 mg/mL (insônia)",
      nomesAlternativos: ["CBN 10 + CBD 20", "Canabinol insônia", "CBN para sono"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "CBN",
        concentracaoCbdMgMl: 20,
        concentracaoThcMgMl: 0.4,
        outrosCanabinoides: "CBN 10 mg/mL",
        formaFarmaceutica: "oleo",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
      indicacoesExtra: "Insônia, distúrbios do sono.",
    }),
    buildOilRecord({
      slug: "cannabis-oleo-cbd-isolado-300-mg-ml",
      nome: "Óleo CBD isolado 300 mg/mL",
      nomesAlternativos: ["Canabidiol 300 mg/mL", "CBD 30%"],
      detalhes: {
        espectro: "isolado",
        canabinoideDominante: "CBD",
        concentracaoCbdMgMl: 300,
        formaFarmaceutica: "oleo",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
    buildOilRecord({
      slug: "cannabis-oleo-cbd-full-300-mg-ml",
      nome: "Óleo CBD full spectrum 300 mg/mL",
      nomesAlternativos: ["CBD full spectrum 300", "Canabidiol 300 mg/mL full"],
      detalhes: {
        espectro: "full_spectrum",
        canabinoideDominante: "CBD",
        concentracaoCbdMgMl: 300,
        concentracaoThcMgMl: 0.6,
        formaFarmaceutica: "oleo",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
  );

  for (const [tipo, mg] of [
    ["isolado", 10],
    ["isolado", 25],
    ["isolado", 50],
    ["broad", 10],
    ["broad", 25],
    ["broad", 50],
    ["full", 25],
  ] as const) {
    items.push(
      buildRecord({
        slug: `cannabis-capsula-cbd-${tipo}-${mg}-mg`,
        nome: `Cápsula CBD ${tipo === "isolado" ? "isolado" : tipo === "broad" ? "broad spectrum" : "full spectrum"} ${mg} mg`,
        nomesAlternativos: [`CBD cápsula ${mg} mg`, `Canabidiol ${mg} mg cápsula`],
        nomeCientifico: null,
        categoriaPratica: "CANNABIS",
        indicacoes: `${INDICACOES_GERAIS} ${tipo === "full" ? INDICACOES_ODONTO : ""}`.trim(),
        contraindicacoes: CONTRAINDICACOES,
        precaucoes: PRECAUCOES,
        interacoesMedicamentosas: INTERACOES,
        posologia: posologiaCapsula(mg),
        viaAdministracao: ["oral"],
        statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
        fontes: FONTES,
        alertaGestacaoPediatria: ALERTA_GESTACAO,
        renisus: false,
        detalhesEspecificos: {
          espectro: tipo === "isolado" ? "isolado" : tipo === "broad" ? "broad_spectrum" : "full_spectrum",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "capsula",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        } satisfies DetalhesCannabis,
      }),
    );
  }

  items.push(
    buildRecord({
      slug: "cannabis-capsula-balanceada-10-10-mg",
      nome: "Cápsula balanceada CBD 10 mg + THC 10 mg",
      nomesAlternativos: ["CBD 10 + THC 10 cápsula", "1:1 cápsula"],
      nomeCientifico: null,
      categoriaPratica: "CANNABIS",
      indicacoes: `${INDICACOES_GERAIS} ${INDICACOES_ODONTO}`,
      contraindicacoes: CONTRAINDICACOES,
      precaucoes: PRECAUCOES,
      interacoesMedicamentosas: INTERACOES,
      posologia: "Via oral. Iniciar com 1 cápsula à noite; titular conforme resposta (start low, go slow).",
      viaAdministracao: ["oral"],
      statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
      fontes: FONTES,
      alertaGestacaoPediatria: ALERTA_GESTACAO,
      renisus: false,
      detalhesEspecificos: {
        espectro: "full_spectrum",
        canabinoideDominante: "balanceado",
        concentracaoCbdMgMl: 10,
        concentracaoThcMgMl: 10,
        proporcaoCbdThc: "1:1",
        formaFarmaceutica: "capsula",
        tipoReceituario: "A",
        thcAcimaLimite: true,
      },
    }),
  );

  for (const mg of [10, 25]) {
    items.push(
      buildRecord({
        slug: `cannabis-goma-cbd-${mg}-mg`,
        nome: `Goma CBD ${mg} mg`,
        nomesAlternativos: [`CBD goma ${mg} mg`, `Canabidiol goma ${mg}`],
        nomeCientifico: null,
        categoriaPratica: "CANNABIS",
        indicacoes: INDICACOES_GERAIS,
        contraindicacoes: CONTRAINDICACOES,
        precaucoes: PRECAUCOES,
        interacoesMedicamentosas: INTERACOES,
        posologia: `Via oral. Iniciar com 1 goma (${mg} mg CBD) à noite; titular conforme resposta.`,
        viaAdministracao: ["oral"],
        statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
        fontes: FONTES,
        alertaGestacaoPediatria: ALERTA_GESTACAO,
        renisus: false,
        detalhesEspecificos: {
          espectro: "isolado",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "goma",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
      }),
    );
    items.push(
      buildRecord({
        slug: `cannabis-pastilha-cbd-${mg}-mg`,
        nome: `Pastilha sublingual CBD ${mg} mg`,
        nomesAlternativos: [`CBD pastilha ${mg} mg`, `Canabidiol pastilha ${mg}`],
        nomeCientifico: null,
        categoriaPratica: "CANNABIS",
        indicacoes: INDICACOES_GERAIS,
        contraindicacoes: CONTRAINDICACOES,
        precaucoes: PRECAUCOES,
        interacoesMedicamentosas: INTERACOES,
        posologia: `Via sublingual. 1 pastilha (${mg} mg CBD) 1–2x/dia; titular conforme resposta.`,
        viaAdministracao: ["sublingual"],
        statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
        fontes: FONTES,
        alertaGestacaoPediatria: ALERTA_GESTACAO,
        renisus: false,
        detalhesEspecificos: {
          espectro: "isolado",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "goma",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
      }),
    );
  }

  items.push(
    buildRecord({
      slug: "cannabis-goma-cbd-broad-10-mg",
      nome: "Goma CBD broad spectrum 10 mg",
      nomesAlternativos: ["CBD broad goma 10", "THC não detectável goma"],
      nomeCientifico: null,
      categoriaPratica: "CANNABIS",
      indicacoes: INDICACOES_GERAIS,
      contraindicacoes: CONTRAINDICACOES,
      precaucoes: PRECAUCOES,
      interacoesMedicamentosas: INTERACOES,
      posologia: "Via oral. 1 goma (10 mg CBD) à noite; titular conforme resposta.",
      viaAdministracao: ["oral"],
      statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
      fontes: FONTES,
      alertaGestacaoPediatria: ALERTA_GESTACAO,
      renisus: false,
      detalhesEspecificos: {
        espectro: "broad_spectrum",
        canabinoideDominante: "CBD",
        concentracaoCbdMgMl: 10,
        formaFarmaceutica: "goma",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
  );

  for (const mg of [100, 250, 500]) {
    items.push(
      buildRecord({
        slug: `cannabis-creme-cbd-${mg}-mg`,
        nome: `Creme/pomada CBD ${mg} mg/embalagem`,
        nomesAlternativos: [`CBD tópico ${mg} mg`, `Canabidiol creme ${mg}`],
        nomeCientifico: null,
        categoriaPratica: "CANNABIS",
        indicacoes: `Dor localizada, inflamação cutânea adjuvante, artrite periférica tópica. ${INDICACOES_ODONTO}`,
        contraindicacoes: CONTRAINDICACOES,
        precaucoes: "Uso dermatológico externo. Evitar mucosas e olhos.",
        interacoesMedicamentosas: null,
        posologia: `Aplicar camada fina na área afetada 2–3x/dia (${mg} mg CBD por embalagem).`,
        viaAdministracao: ["topica"],
        statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
        fontes: FONTES,
        alertaGestacaoPediatria: ALERTA_GESTACAO,
        renisus: false,
        detalhesEspecificos: {
          espectro: "isolado",
          canabinoideDominante: "CBD",
          concentracaoCbdMgMl: mg,
          formaFarmaceutica: "topico",
          volumeEmbalagem: "30 g",
          tipoReceituario: "B",
          thcAcimaLimite: false,
        },
      }),
    );
  }

  items.push(
    buildRecord({
      slug: "cannabis-pomada-cbg-150-mg",
      nome: "Pomada CBG 150 mg/embalagem",
      nomesAlternativos: ["CBG tópico", "Canabigerol pomada"],
      nomeCientifico: null,
      categoriaPratica: "CANNABIS",
      indicacoes: "Dor musculoesquelética localizada, inflamação cutânea adjuvante.",
      contraindicacoes: CONTRAINDICACOES,
      precaucoes: "Uso dermatológico externo.",
      interacoesMedicamentosas: null,
      posologia: "Aplicar camada fina 2x/dia na área afetada.",
      viaAdministracao: ["topica"],
      statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
      fontes: FONTES,
      alertaGestacaoPediatria: ALERTA_GESTACAO,
      renisus: false,
      detalhesEspecificos: {
        espectro: "full_spectrum",
        canabinoideDominante: "CBG",
        outrosCanabinoides: "CBG 150 mg/embalagem",
        formaFarmaceutica: "topico",
        volumeEmbalagem: "30 g",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
    buildRecord({
      slug: "cannabis-spray-sublingual-cbd-25-mg-ml",
      nome: "Spray sublingual CBD 25 mg/mL",
      nomesAlternativos: ["CBD spray 25", "Canabidiol spray sublingual"],
      nomeCientifico: null,
      categoriaPratica: "CANNABIS",
      indicacoes: INDICACOES_GERAIS,
      contraindicacoes: CONTRAINDICACOES,
      precaucoes: PRECAUCOES,
      interacoesMedicamentosas: INTERACOES,
      posologia: "Via sublingual. 1 jato (≈0,1 mL = 2,5 mg CBD) 2x/dia; titular conforme resposta.",
      viaAdministracao: ["sublingual"],
      statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
      fontes: FONTES,
      alertaGestacaoPediatria: ALERTA_GESTACAO,
      renisus: false,
      detalhesEspecificos: {
        espectro: "isolado",
        canabinoideDominante: "CBD",
        concentracaoCbdMgMl: 25,
        formaFarmaceutica: "spray_sublingual",
        volumeEmbalagem: "15 mL",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
    buildRecord({
      slug: "cannabis-spray-sublingual-cbd-broad-25-mg-ml",
      nome: "Spray sublingual CBD broad spectrum 25 mg/mL",
      nomesAlternativos: ["CBD broad spray 25", "THC não detectável spray"],
      nomeCientifico: null,
      categoriaPratica: "CANNABIS",
      indicacoes: INDICACOES_GERAIS,
      contraindicacoes: CONTRAINDICACOES,
      precaucoes: PRECAUCOES,
      interacoesMedicamentosas: INTERACOES,
      posologia: "Via sublingual. 1 jato 2x/dia; titular conforme resposta.",
      viaAdministracao: ["sublingual"],
      statusRegulatorio: "PRODUTO_AUTORIZADO_ANVISA",
      fontes: FONTES,
      alertaGestacaoPediatria: ALERTA_GESTACAO,
      renisus: false,
      detalhesEspecificos: {
        espectro: "broad_spectrum",
        canabinoideDominante: "CBD",
        concentracaoCbdMgMl: 25,
        formaFarmaceutica: "spray_sublingual",
        volumeEmbalagem: "15 mL",
        tipoReceituario: "B",
        thcAcimaLimite: false,
      },
    }),
  );

  return items;
}

export function buildCannabisSeedJson(): {
  _meta: Record<string, string>;
  itens: MedicinaNaturalItemRecord[];
} {
  return {
    _meta: {
      fonte: "Doctor8 — catálogo genérico por composição",
      data: "2026-07-14",
      observacao:
        "Catálogo genérico por composição — sem marcas, conforme prática de mercado e RDC 327/2019",
    },
    itens: buildCannabisCatalogItems(),
  };
}
