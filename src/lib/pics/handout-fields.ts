/** Plan-field mappings for patient handouts (practices without special rendering). */
export const HANDOUT_FIELD_MAP: Record<string, { labelKey: string; fieldKey: string }[]> = {
  antroposofia: [
    { labelKey: "it.tpl.antro.remedies", fieldKey: "remediesPrescribed" },
    { labelKey: "it.tpl.antro.orientations", fieldKey: "rhythmOrientations" },
  ],
  apiterapia: [
    { labelKey: "it.tpl.api.products", fieldKey: "productsUsed" },
    { labelKey: "it.tpl.api.cautions", fieldKey: "cautions" },
  ],
  bioenergetica: [
    { labelKey: "it.tpl.bioen.home", fieldKey: "homeExercises" },
    { labelKey: "it.tpl.bioen.frequency", fieldKey: "frequency" },
  ],
  constelacao_familiar: [
    { labelKey: "it.tpl.constel.insights", fieldKey: "insights" },
    { labelKey: "it.tpl.constel.integration", fieldKey: "integrationPlan" },
  ],
  cromoterapia: [
    { labelKey: "it.tpl.cromo.home", fieldKey: "homeApplication" },
    { labelKey: "it.tpl.cromo.cautions", fieldKey: "cautions" },
  ],
  danca_circular: [
    { labelKey: "it.tpl.dcircular.home", fieldKey: "homePractice" },
    { labelKey: "it.tpl.dcircular.frequency", fieldKey: "frequency" },
  ],
  geoterapia: [
    { labelKey: "it.tpl.geo.home", fieldKey: "homeUse" },
    { labelKey: "it.tpl.geo.cautions", fieldKey: "cautions" },
  ],
  imposicao_maos: [
    { labelKey: "it.tpl.impos.orientations", fieldKey: "spiritualOrientations" },
    { labelKey: "it.tpl.impos.frequency", fieldKey: "homeFrequency" },
  ],
  naturopatia: [
    { labelKey: "it.tpl.naturo.plan", fieldKey: "lifestylePlan" },
    { labelKey: "it.tpl.naturo.diet", fieldKey: "dietPlan" },
  ],
  osteopatia: [
    { labelKey: "it.tpl.osteo.home", fieldKey: "homeExercises" },
    { labelKey: "it.tpl.osteo.cautions", fieldKey: "cautions" },
  ],
  ozonioterapia: [
    { labelKey: "it.tpl.ozonio.postCare", fieldKey: "postSessionCare" },
  ],
  quiropraxia: [
    { labelKey: "it.tpl.quiro.home", fieldKey: "homeCare" },
    { labelKey: "it.tpl.quiro.cautions", fieldKey: "cautions" },
  ],
  terapia_comunitaria: [
    { labelKey: "it.tpl.tcom.insights", fieldKey: "collectiveInsights" },
    { labelKey: "it.tpl.tcom.followUp", fieldKey: "followUpActions" },
  ],
  termalismo: [
    { labelKey: "it.tpl.termal.postCare", fieldKey: "postBathCare" },
    { labelKey: "it.tpl.termal.cautions", fieldKey: "cautions" },
  ],
};

export function handoutFieldsHaveContent(
  practiceSlug: string,
  structured: Record<string, string | boolean>,
): boolean {
  const fields = HANDOUT_FIELD_MAP[practiceSlug];
  if (!fields) return false;
  return fields.some((f) => {
    const v = structured[f.fieldKey];
    return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
  });
}
