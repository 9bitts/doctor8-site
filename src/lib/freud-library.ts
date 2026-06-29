export type FreudLibrarySection = {
  id: string;
  titleKey: string;
  introKey: string;
  items: { titleKey: string; bodyKey: string }[];
};

export const FREUD_LIBRARY_SECTIONS: FreudLibrarySection[] = [
  {
    id: "biography",
    titleKey: "pa.freud.section.biography",
    introKey: "pa.freud.section.biographyIntro",
    items: [
      { titleKey: "pa.freud.bio.early", bodyKey: "pa.freud.bio.earlyBody" },
      { titleKey: "pa.freud.bio.vienna", bodyKey: "pa.freud.bio.viennaBody" },
      { titleKey: "pa.freud.bio.movement", bodyKey: "pa.freud.bio.movementBody" },
      { titleKey: "pa.freud.bio.late", bodyKey: "pa.freud.bio.lateBody" },
    ],
  },
  {
    id: "concepts",
    titleKey: "pa.freud.section.concepts",
    introKey: "pa.freud.section.conceptsIntro",
    items: [
      { titleKey: "pa.freud.concept.unconscious", bodyKey: "pa.freud.concept.unconsciousBody" },
      { titleKey: "pa.freud.concept.drives", bodyKey: "pa.freud.concept.drivesBody" },
      { titleKey: "pa.freud.concept.oedipus", bodyKey: "pa.freud.concept.oedipusBody" },
      { titleKey: "pa.freud.concept.transference", bodyKey: "pa.freud.concept.transferenceBody" },
      { titleKey: "pa.freud.concept.defense", bodyKey: "pa.freud.concept.defenseBody" },
      { titleKey: "pa.freud.concept.dreams", bodyKey: "pa.freud.concept.dreamsBody" },
    ],
  },
  {
    id: "works",
    titleKey: "pa.freud.section.works",
    introKey: "pa.freud.section.worksIntro",
    items: [
      { titleKey: "pa.freud.work.hysteria", bodyKey: "pa.freud.work.hysteriaBody" },
      { titleKey: "pa.freud.work.dreams", bodyKey: "pa.freud.work.dreamsBody" },
      { titleKey: "pa.freud.work.jokes", bodyKey: "pa.freud.work.jokesBody" },
      { titleKey: "pa.freud.work.sexuality", bodyKey: "pa.freud.work.sexualityBody" },
      { titleKey: "pa.freud.work.pleasure", bodyKey: "pa.freud.work.pleasureBody" },
      { titleKey: "pa.freud.work.ego", bodyKey: "pa.freud.work.egoBody" },
      { titleKey: "pa.freud.work.civilization", bodyKey: "pa.freud.work.civilizationBody" },
    ],
  },
  {
    id: "legacy",
    titleKey: "pa.freud.section.legacy",
    introKey: "pa.freud.section.legacyIntro",
    items: [
      { titleKey: "pa.freud.legacy.schools", bodyKey: "pa.freud.legacy.schoolsBody" },
      { titleKey: "pa.freud.legacy.technique", bodyKey: "pa.freud.legacy.techniqueBody" },
      { titleKey: "pa.freud.legacy.culture", bodyKey: "pa.freud.legacy.cultureBody" },
    ],
  },
];

export const FREUD_SUGGESTED_QUESTIONS = [
  "pa.freud.suggest.1",
  "pa.freud.suggest.2",
  "pa.freud.suggest.3",
  "pa.freud.suggest.4",
] as const;
