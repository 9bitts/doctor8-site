/** Canonical stored values (English) + i18n label keys for patient medical history. */

export type HistOption = { value: string; labelKey: string };

export const HIST_YES_NO: HistOption[] = [
  { value: "No", labelKey: "hist.opt.no" },
  { value: "Yes", labelKey: "hist.opt.yes" },
];

export const HIST_SEX: HistOption[] = [
  { value: "Female", labelKey: "hist.opt.sex.female" },
  { value: "Male", labelKey: "hist.opt.sex.male" },
  { value: "Intersex", labelKey: "hist.opt.sex.intersex" },
  { value: "Prefer not to say", labelKey: "hist.opt.sex.preferNotSay" },
];

export const HIST_MARITAL: HistOption[] = [
  { value: "Single", labelKey: "hist.opt.marital.single" },
  { value: "Married", labelKey: "hist.opt.marital.married" },
  { value: "Stable union", labelKey: "hist.opt.marital.stableUnion" },
  { value: "Divorced", labelKey: "hist.opt.marital.divorced" },
  { value: "Widowed", labelKey: "hist.opt.marital.widowed" },
  { value: "Other", labelKey: "hist.opt.other" },
];

export const HIST_BLOOD_TYPES: HistOption[] = [
  { value: "A+", labelKey: "hist.opt.blood.aPos" },
  { value: "A-", labelKey: "hist.opt.blood.aNeg" },
  { value: "B+", labelKey: "hist.opt.blood.bPos" },
  { value: "B-", labelKey: "hist.opt.blood.bNeg" },
  { value: "AB+", labelKey: "hist.opt.blood.abPos" },
  { value: "AB-", labelKey: "hist.opt.blood.abNeg" },
  { value: "O+", labelKey: "hist.opt.blood.oPos" },
  { value: "O-", labelKey: "hist.opt.blood.oNeg" },
  { value: "Unknown", labelKey: "hist.opt.unknown" },
];

export const HIST_DISABILITIES: HistOption[] = [
  { value: "Physical", labelKey: "hist.opt.disability.physical" },
  { value: "Visual", labelKey: "hist.opt.disability.visual" },
  { value: "Hearing", labelKey: "hist.opt.disability.hearing" },
  { value: "Intellectual", labelKey: "hist.opt.disability.intellectual" },
  { value: "None", labelKey: "hist.opt.none" },
];

export const HIST_CHRONIC: HistOption[] = [
  { value: "Hypertension", labelKey: "hist.opt.chronic.hypertension" },
  { value: "Diabetes", labelKey: "hist.opt.chronic.diabetes" },
  { value: "Asthma", labelKey: "hist.opt.chronic.asthma" },
  { value: "Obesity", labelKey: "hist.opt.chronic.obesity" },
  { value: "Thyroid disease", labelKey: "hist.opt.chronic.thyroid" },
  { value: "Chronic hepatitis", labelKey: "hist.opt.chronic.hepatitis" },
  { value: "Coronary disease", labelKey: "hist.opt.chronic.coronary" },
  { value: "Chronic kidney disease", labelKey: "hist.opt.chronic.kidney" },
  { value: "Cancer", labelKey: "hist.opt.chronic.cancer" },
  { value: "Immunodeficiency", labelKey: "hist.opt.chronic.immunodeficiency" },
  { value: "Other", labelKey: "hist.opt.other" },
];

export const HIST_SMOKING: HistOption[] = [
  { value: "Never", labelKey: "hist.opt.smoking.never" },
  { value: "Former smoker", labelKey: "hist.opt.smoking.former" },
  { value: "Current smoker", labelKey: "hist.opt.smoking.current" },
];

export const HIST_ALCOHOL: HistOption[] = [
  { value: "Never", labelKey: "hist.opt.alcohol.never" },
  { value: "Occasionally", labelKey: "hist.opt.alcohol.occasionally" },
  { value: "Weekly", labelKey: "hist.opt.alcohol.weekly" },
  { value: "Daily", labelKey: "hist.opt.alcohol.daily" },
];

export const HIST_EXERCISE: HistOption[] = [
  { value: "None", labelKey: "hist.opt.exercise.none" },
  { value: "1-2x per week", labelKey: "hist.opt.exercise.oneTwo" },
  { value: "3-4x per week", labelKey: "hist.opt.exercise.threeFour" },
  { value: "5+ per week", labelKey: "hist.opt.exercise.fivePlus" },
];

export const HIST_SLEEP: HistOption[] = [
  { value: "Good", labelKey: "hist.opt.sleep.good" },
  { value: "Fair", labelKey: "hist.opt.sleep.fair" },
  { value: "Poor", labelKey: "hist.opt.sleep.poor" },
];

export const HIST_MENSTRUAL: HistOption[] = [
  { value: "Altered flow", labelKey: "hist.opt.menstrual.alteredFlow" },
  { value: "Vaginal discharge", labelKey: "hist.opt.menstrual.discharge" },
  { value: "Hot flashes", labelKey: "hist.opt.menstrual.hotFlashes" },
  { value: "Absence of flow", labelKey: "hist.opt.menstrual.absence" },
  { value: "Menopause", labelKey: "hist.opt.menstrual.menopause" },
  { value: "Contraceptive use", labelKey: "hist.opt.menstrual.contraceptive" },
  { value: "IUD use", labelKey: "hist.opt.menstrual.iud" },
  { value: "Pregnancies", labelKey: "hist.opt.menstrual.pregnancies" },
  { value: "Abortions", labelKey: "hist.opt.menstrual.abortions" },
];

export const HIST_IMMUNOLOGY: HistOption[] = [
  { value: "Recurrent infections", labelKey: "hist.opt.immuno.recurrent" },
  { value: "Frequent antibiotic use", labelKey: "hist.opt.immuno.antibiotics" },
  { value: "Immunodeficiency", labelKey: "hist.opt.immuno.immunodeficiency" },
];

export const HIST_VACCINES: HistOption[] = [
  { value: "Hepatitis B", labelKey: "hist.opt.vaccine.hepB" },
  { value: "Measles", labelKey: "hist.opt.vaccine.measles" },
  { value: "Rubella", labelKey: "hist.opt.vaccine.rubella" },
  { value: "Mumps", labelKey: "hist.opt.vaccine.mumps" },
  { value: "MMR", labelKey: "hist.opt.vaccine.mmr" },
  { value: "COVID-19", labelKey: "hist.opt.vaccine.covid" },
  { value: "Tetanus", labelKey: "hist.opt.vaccine.tetanus" },
  { value: "Diphtheria", labelKey: "hist.opt.vaccine.diphtheria" },
  { value: "Yellow fever", labelKey: "hist.opt.vaccine.yellowFever" },
  { value: "HPV", labelKey: "hist.opt.vaccine.hpv" },
  { value: "Pneumonia", labelKey: "hist.opt.vaccine.pneumonia" },
  { value: "Influenza", labelKey: "hist.opt.vaccine.influenza" },
  { value: "Herpes Zoster", labelKey: "hist.opt.vaccine.herpesZoster" },
];

export const HIST_SUBSTANCES: HistOption[] = [
  { value: "Tobacco", labelKey: "hist.opt.substance.tobacco" },
  { value: "Alcohol", labelKey: "hist.opt.substance.alcohol" },
  { value: "Marijuana", labelKey: "hist.opt.substance.marijuana" },
  { value: "Cocaine", labelKey: "hist.opt.substance.cocaine" },
  { value: "Crack", labelKey: "hist.opt.substance.crack" },
  { value: "Amphetamines", labelKey: "hist.opt.substance.amphetamines" },
  { value: "Tattoos", labelKey: "hist.opt.substance.tattoos" },
  { value: "Chemical exposure", labelKey: "hist.opt.substance.chemical" },
  { value: "Heavy metals", labelKey: "hist.opt.substance.heavyMetals" },
  { value: "Other", labelKey: "hist.opt.other" },
];

export const HIST_INFECTIOUS: HistOption[] = [
  { value: "Tuberculosis", labelKey: "hist.opt.infectious.tuberculosis" },
  { value: "HIV/AIDS", labelKey: "hist.opt.infectious.hiv" },
  { value: "Hepatitis", labelKey: "hist.opt.infectious.hepatitis" },
  { value: "Schistosomiasis", labelKey: "hist.opt.infectious.schistosomiasis" },
  { value: "COVID-19", labelKey: "hist.opt.infectious.covid" },
];

export const HIST_REVIEW_SYSTEMS: { groupKey: string; items: HistOption[] }[] = [
  {
    groupKey: "hist.opt.group.skin",
    items: [
      { value: "Itching", labelKey: "hist.opt.sym.itching" },
      { value: "Skin spots", labelKey: "hist.opt.sym.skinSpots" },
      { value: "Weak/spotted nails", labelKey: "hist.opt.sym.weakNails" },
      { value: "Hair loss", labelKey: "hist.opt.sym.hairLoss" },
    ],
  },
  {
    groupKey: "hist.opt.group.digestive",
    items: [
      { value: "Difficulty swallowing", labelKey: "hist.opt.sym.swallowing" },
      { value: "Heartburn", labelKey: "hist.opt.sym.heartburn" },
      { value: "Nausea", labelKey: "hist.opt.sym.nausea" },
      { value: "Vomiting", labelKey: "hist.opt.sym.vomiting" },
      { value: "Excess gas", labelKey: "hist.opt.sym.gas" },
      { value: "Belching", labelKey: "hist.opt.sym.belching" },
      { value: "Constipation", labelKey: "hist.opt.sym.constipation" },
      { value: "Diarrhea", labelKey: "hist.opt.sym.diarrhea" },
      { value: "Blood in stool", labelKey: "hist.opt.sym.bloodStool" },
      { value: "Abdominal pain", labelKey: "hist.opt.sym.abdominalPain" },
      { value: "Rectal bleeding", labelKey: "hist.opt.sym.rectalBleeding" },
    ],
  },
  {
    groupKey: "hist.opt.group.hematology",
    items: [
      { value: "Easy bruising/bleeding", labelKey: "hist.opt.sym.bruising" },
      { value: "Anemia", labelKey: "hist.opt.sym.anemia" },
      { value: "Low platelets", labelKey: "hist.opt.sym.lowPlatelets" },
      { value: "Past transfusion", labelKey: "hist.opt.sym.transfusion" },
      { value: "Swollen lymph nodes", labelKey: "hist.opt.sym.lymphNodes" },
      { value: "Thrombosis history", labelKey: "hist.opt.sym.thrombosis" },
    ],
  },
  {
    groupKey: "hist.opt.group.endocrine",
    items: [
      { value: "Heat/cold intolerance", labelKey: "hist.opt.sym.tempIntolerance" },
      { value: "Excessive thirst", labelKey: "hist.opt.sym.thirst" },
      { value: "Excessive sweating", labelKey: "hist.opt.sym.sweating" },
      { value: "Fatigue", labelKey: "hist.opt.sym.fatigue" },
      { value: "Weight loss without diet", labelKey: "hist.opt.sym.weightLoss" },
      { value: "Loss of appetite", labelKey: "hist.opt.sym.appetiteLoss" },
      { value: "Increased appetite", labelKey: "hist.opt.sym.appetiteGain" },
      { value: "Weight gain", labelKey: "hist.opt.sym.weightGain" },
    ],
  },
  {
    groupKey: "hist.opt.group.neurology",
    items: [
      { value: "Headache", labelKey: "hist.opt.sym.headache" },
      { value: "Dizziness/vertigo", labelKey: "hist.opt.sym.dizziness" },
      { value: "Numbness/tingling", labelKey: "hist.opt.sym.numbness" },
      { value: "Seizures", labelKey: "hist.opt.sym.seizures" },
      { value: "Herniated disc", labelKey: "hist.opt.sym.herniatedDisc" },
    ],
  },
  {
    groupKey: "hist.opt.group.eyes",
    items: [
      { value: "Blurred vision", labelKey: "hist.opt.sym.blurredVision" },
      { value: "Eye discharge", labelKey: "hist.opt.sym.eyeDischarge" },
      { value: "Red/inflamed eyes", labelKey: "hist.opt.sym.redEyes" },
      { value: "Glaucoma", labelKey: "hist.opt.sym.glaucoma" },
      { value: "Vision deficit", labelKey: "hist.opt.sym.visionDeficit" },
      { value: "Corrective lenses", labelKey: "hist.opt.sym.correctiveLenses" },
    ],
  },
  {
    groupKey: "hist.opt.group.ent",
    items: [
      { value: "Hearing loss", labelKey: "hist.opt.sym.hearingLoss" },
      { value: "Tinnitus", labelKey: "hist.opt.sym.tinnitus" },
      { value: "Nosebleeds", labelKey: "hist.opt.sym.nosebleeds" },
      { value: "Sore throat", labelKey: "hist.opt.sym.soreThroat" },
      { value: "Voice change", labelKey: "hist.opt.sym.voiceChange" },
      { value: "Chronic cough", labelKey: "hist.opt.sym.chronicCough" },
      { value: "Past pneumonia", labelKey: "hist.opt.sym.pneumonia" },
    ],
  },
  {
    groupKey: "hist.opt.group.cardiology",
    items: [
      { value: "Chest pain", labelKey: "hist.opt.sym.chestPain" },
      { value: "Palpitations", labelKey: "hist.opt.sym.palpitations" },
      { value: "Shortness of breath", labelKey: "hist.opt.sym.shortnessBreath" },
      { value: "Heart murmur", labelKey: "hist.opt.sym.heartMurmur" },
      { value: "Ankle swelling", labelKey: "hist.opt.sym.ankleSwelling" },
    ],
  },
  {
    groupKey: "hist.opt.group.musculoskeletal",
    items: [
      { value: "Joint pain/swelling", labelKey: "hist.opt.sym.jointPain" },
      { value: "Joint stiffness", labelKey: "hist.opt.sym.jointStiffness" },
      { value: "Frequent cramps", labelKey: "hist.opt.sym.cramps" },
      { value: "Bone fractures", labelKey: "hist.opt.sym.fractures" },
    ],
  },
  {
    groupKey: "hist.opt.group.psychiatric",
    items: [
      { value: "Depression", labelKey: "hist.opt.sym.depression" },
      { value: "Anxiety", labelKey: "hist.opt.sym.anxiety" },
      { value: "Memory loss", labelKey: "hist.opt.sym.memoryLoss" },
      { value: "Sleep disturbance", labelKey: "hist.opt.sym.sleepDisturbance" },
      { value: "Mood swings", labelKey: "hist.opt.sym.moodSwings" },
      { value: "Irritability", labelKey: "hist.opt.sym.irritability" },
    ],
  },
  {
    groupKey: "hist.opt.group.genitourinary",
    items: [
      { value: "Difficulty urinating", labelKey: "hist.opt.sym.difficultyUrinating" },
      { value: "Painful urination", labelKey: "hist.opt.sym.painfulUrination" },
      { value: "Blood in urine", labelKey: "hist.opt.sym.bloodUrine" },
      { value: "Recurrent UTIs", labelKey: "hist.opt.sym.utis" },
      { value: "Kidney stones", labelKey: "hist.opt.sym.kidneyStones" },
    ],
  },
];
