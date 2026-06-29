// Canonical profession/specialty values (stored in DB) with localized labels.

import type { Lang } from "@/lib/i18n/translations";

export const PSYCHOANALYSIS_SPECIALTY = "Psychoanalysis";

export const PROFESSION_GROUPS: { groupKey: string; options: string[] }[] = [
  { groupKey: "set.profGroup.medical", options: [
    "Acupuncture", "Allergy and Immunology", "Anesthesiology", "Angiology", "Cardiology", "Cardiovascular Surgery",
    "Hand Surgery", "Head and Neck Surgery", "Digestive System Surgery", "General Surgery", "Pediatric Surgery",
    "Plastic Surgery", "Thoracic Surgery", "Vascular Surgery", "Internal Medicine", "Coloproctology", "Dermatology",
    "Endocrinology and Metabolism", "Endoscopy", "Gastroenterology", "Medical Genetics", "Geriatrics",
    "Gynecology and Obstetrics", "Hematology and Hemotherapy", "Homeopathy", "Infectious Diseases", "Mastology",
    "Family and Community Medicine", "Physical Medicine and Rehabilitation", "Occupational Medicine", "Sports Medicine",
    "Emergency Medicine", "Legal Medicine and Forensics", "Nuclear Medicine", "Intensive Care Medicine",
    "Preventive and Social Medicine", "Nephrology", "Neurosurgery", "Neurology", "Nutrology", "Ophthalmology", "Oncology",
    "Orthopedics and Traumatology", "Otorhinolaryngology (ENT)", "Pathology", "Clinical Pathology / Laboratory Medicine",
    "Pediatrics", "Pneumology", "Psychiatry", "Radiology and Diagnostic Imaging", "Radiotherapy", "Rheumatology", "Urology",
    "Cannabis Medicine", "General Practice",
  ]},
  { groupKey: "set.profGroup.psychology", options: [
    "Psychologist", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
  ]},
  { groupKey: "set.profGroup.nutrition", options: ["Nutritionist", "Dietitian", "Sports Nutritionist"] },
  { groupKey: "set.profGroup.rehab", options: [
    "Physiotherapist", "Occupational Therapist", "Speech Therapist (Speech-Language Pathologist)",
    "Osteopath", "Chiropractor",
  ]},
  { groupKey: "set.profGroup.nursing", options: ["Nurse", "Nurse Practitioner", "Midwife", "Obstetric Nurse"] },
  { groupKey: "set.profGroup.dentistry", options: [
    "Dentist (General)", "Orthodontist", "Endodontist", "Periodontist",
    "Oral and Maxillofacial Surgeon", "Pediatric Dentist",
  ]},
  { groupKey: "set.profGroup.other", options: [
    "Pharmacist", "Biomedical Scientist", "Physical Educator / Personal Trainer", "Social Worker (Health)",
    "Optometrist", "Podiatrist", "Acupuncturist (non-medical)", "Naturopath", "Veterinarian", "Other",
  ]},
];

const LABELS: Record<string, Record<Lang, string>> = {
  "Acupuncture": { en: "Acupuncture", pt: "Acupuntura", es: "Acupuntura" },
  "Allergy and Immunology": { en: "Allergy and Immunology", pt: "Alergia e Imunologia", es: "Alergia e Inmunología" },
  "Anesthesiology": { en: "Anesthesiology", pt: "Anestesiologia", es: "Anestesiología" },
  "Angiology": { en: "Angiology", pt: "Angiologia", es: "Angiología" },
  "Cardiology": { en: "Cardiology", pt: "Cardiologia", es: "Cardiología" },
  "Cardiovascular Surgery": { en: "Cardiovascular Surgery", pt: "Cirurgia Cardiovascular", es: "Cirugía Cardiovascular" },
  "Hand Surgery": { en: "Hand Surgery", pt: "Cirurgia da Mão", es: "Cirugía de la Mano" },
  "Head and Neck Surgery": { en: "Head and Neck Surgery", pt: "Cirurgia de Cabeça e Pescoço", es: "Cirugía de Cabeza y Cuello" },
  "Digestive System Surgery": { en: "Digestive System Surgery", pt: "Cirurgia do Aparelho Digestivo", es: "Cirugía del Aparato Digestivo" },
  "General Surgery": { en: "General Surgery", pt: "Cirurgia Geral", es: "Cirugía General" },
  "Pediatric Surgery": { en: "Pediatric Surgery", pt: "Cirurgia Pediátrica", es: "Cirugía Pediátrica" },
  "Plastic Surgery": { en: "Plastic Surgery", pt: "Cirurgia Plástica", es: "Cirugía Plástica" },
  "Thoracic Surgery": { en: "Thoracic Surgery", pt: "Cirurgia Torácica", es: "Cirugía Torácica" },
  "Vascular Surgery": { en: "Vascular Surgery", pt: "Cirurgia Vascular", es: "Cirugía Vascular" },
  "Internal Medicine": { en: "Internal Medicine", pt: "Clínica Médica", es: "Medicina Interna" },
  "Coloproctology": { en: "Coloproctology", pt: "Coloproctologia", es: "Coloproctología" },
  "Dermatology": { en: "Dermatology", pt: "Dermatologia", es: "Dermatología" },
  "Endocrinology and Metabolism": { en: "Endocrinology and Metabolism", pt: "Endocrinologia e Metabologia", es: "Endocrinología y Metabolismo" },
  "Endoscopy": { en: "Endoscopy", pt: "Endoscopia", es: "Endoscopia" },
  "Gastroenterology": { en: "Gastroenterology", pt: "Gastroenterologia", es: "Gastroenterología" },
  "Medical Genetics": { en: "Medical Genetics", pt: "Genética Médica", es: "Genética Médica" },
  "Geriatrics": { en: "Geriatrics", pt: "Geriatria", es: "Geriatría" },
  "Gynecology and Obstetrics": { en: "Gynecology and Obstetrics", pt: "Ginecologia e Obstetrícia", es: "Ginecología y Obstetricia" },
  "Hematology and Hemotherapy": { en: "Hematology and Hemotherapy", pt: "Hematologia e Hemoterapia", es: "Hematología y Hemoterapia" },
  "Homeopathy": { en: "Homeopathy", pt: "Homeopatia", es: "Homeopatía" },
  "Infectious Diseases": { en: "Infectious Diseases", pt: "Infectologia", es: "Enfermedades Infecciosas" },
  "Mastology": { en: "Mastology", pt: "Mastologia", es: "Mastología" },
  "Family and Community Medicine": { en: "Family and Community Medicine", pt: "Medicina de Família e Comunidade", es: "Medicina Familiar y Comunitaria" },
  "Physical Medicine and Rehabilitation": { en: "Physical Medicine and Rehabilitation", pt: "Medicina Física e Reabilitação", es: "Medicina Física y Rehabilitación" },
  "Occupational Medicine": { en: "Occupational Medicine", pt: "Medicina do Trabalho", es: "Medicina del Trabajo" },
  "Sports Medicine": { en: "Sports Medicine", pt: "Medicina Esportiva", es: "Medicina Deportiva" },
  "Emergency Medicine": { en: "Emergency Medicine", pt: "Medicina de Emergência", es: "Medicina de Emergencia" },
  "Legal Medicine and Forensics": { en: "Legal Medicine and Forensics", pt: "Medicina Legal e Forense", es: "Medicina Legal y Forense" },
  "Nuclear Medicine": { en: "Nuclear Medicine", pt: "Medicina Nuclear", es: "Medicina Nuclear" },
  "Intensive Care Medicine": { en: "Intensive Care Medicine", pt: "Medicina Intensiva", es: "Medicina Intensiva" },
  "Preventive and Social Medicine": { en: "Preventive and Social Medicine", pt: "Medicina Preventiva e Social", es: "Medicina Preventiva y Social" },
  "Nephrology": { en: "Nephrology", pt: "Nefrologia", es: "Nefrología" },
  "Neurosurgery": { en: "Neurosurgery", pt: "Neurocirurgia", es: "Neurocirugía" },
  "Neurology": { en: "Neurology", pt: "Neurologia", es: "Neurología" },
  "Nutrology": { en: "Nutrology", pt: "Nutrologia", es: "Nutrología" },
  "Ophthalmology": { en: "Ophthalmology", pt: "Oftalmologia", es: "Oftalmología" },
  "Oncology": { en: "Oncology", pt: "Oncologia", es: "Oncología" },
  "Orthopedics and Traumatology": { en: "Orthopedics and Traumatology", pt: "Ortopedia e Traumatologia", es: "Ortopedia y Traumatología" },
  "Otorhinolaryngology (ENT)": { en: "Otorhinolaryngology (ENT)", pt: "Otorrinolaringologia", es: "Otorrinolaringología" },
  "Pathology": { en: "Pathology", pt: "Patologia", es: "Patología" },
  "Clinical Pathology / Laboratory Medicine": { en: "Clinical Pathology / Laboratory Medicine", pt: "Patologia Clínica / Medicina Laboratorial", es: "Patología Clínica / Medicina de Laboratorio" },
  "Pediatrics": { en: "Pediatrics", pt: "Pediatria", es: "Pediatría" },
  "Pneumology": { en: "Pneumology", pt: "Pneumologia", es: "Neumología" },
  "Psychiatry": { en: "Psychiatry", pt: "Psiquiatria", es: "Psiquiatría" },
  "Radiology and Diagnostic Imaging": { en: "Radiology and Diagnostic Imaging", pt: "Radiologia e Diagnóstico por Imagem", es: "Radiología e Imagen Diagnóstica" },
  "Radiotherapy": { en: "Radiotherapy", pt: "Radioterapia", es: "Radioterapia" },
  "Rheumatology": { en: "Rheumatology", pt: "Reumatologia", es: "Reumatología" },
  "Urology": { en: "Urology", pt: "Urologia", es: "Urología" },
  "Cannabis Medicine": { en: "Cannabis Medicine", pt: "Cannabis Medicinal", es: "Cannabis Medicinal" },
  "General Practice": { en: "General Practice", pt: "Clínico Geral", es: "Medicina General" },
  "Psychology": { en: "Psychology", pt: "Psicologia", es: "Psicología" },
  "Nutrition": { en: "Nutrition", pt: "Nutrição", es: "Nutrición" },
  "Psychologist": { en: "Psychologist", pt: "Psicólogo", es: "Psicólogo" },
  "Psychoanalyst": { en: "Psychoanalyst", pt: "Psicanalista", es: "Psicoanalista" },
  "Neuropsychologist": { en: "Neuropsychologist", pt: "Neuropsicólogo", es: "Neuropsicólogo" },
  "Psychotherapist": { en: "Psychotherapist", pt: "Psicoterapeuta", es: "Psicoterapeuta" },
  "Behavioral Therapist": { en: "Behavioral Therapist", pt: "Terapeuta Comportamental", es: "Terapeuta Conductual" },
  "Nutritionist": { en: "Nutritionist", pt: "Nutricionista", es: "Nutricionista" },
  "Dietitian": { en: "Dietitian", pt: "Dietista", es: "Dietista" },
  "Sports Nutritionist": { en: "Sports Nutritionist", pt: "Nutricionista Esportivo", es: "Nutricionista Deportivo" },
  "Physiotherapist": { en: "Physiotherapist", pt: "Fisioterapeuta", es: "Fisioterapeuta" },
  "Occupational Therapist": { en: "Occupational Therapist", pt: "Terapeuta Ocupacional", es: "Terapeuta Ocupacional" },
  "Speech Therapist (Speech-Language Pathologist)": { en: "Speech Therapist (Speech-Language Pathologist)", pt: "Fonoaudiólogo", es: "Logopeda" },
  "Osteopath": { en: "Osteopath", pt: "Osteopata", es: "Osteópata" },
  "Chiropractor": { en: "Chiropractor", pt: "Quiropraxista", es: "Quiropráctico" },
  "Nurse": { en: "Nurse", pt: "Enfermeiro", es: "Enfermero" },
  "Nurse Practitioner": { en: "Nurse Practitioner", pt: "Enfermeiro Especialista", es: "Enfermero Especialista" },
  "Midwife": { en: "Midwife", pt: "Parteira", es: "Partera" },
  "Obstetric Nurse": { en: "Obstetric Nurse", pt: "Enfermeiro Obstétrico", es: "Enfermero Obstétrico" },
  "Dentist (General)": { en: "Dentist (General)", pt: "Dentista (Geral)", es: "Dentista (General)" },
  "Orthodontist": { en: "Orthodontist", pt: "Ortodontista", es: "Ortodoncista" },
  "Endodontist": { en: "Endodontist", pt: "Endodontista", es: "Endodoncista" },
  "Periodontist": { en: "Periodontist", pt: "Periodontista", es: "Periodoncista" },
  "Oral and Maxillofacial Surgeon": { en: "Oral and Maxillofacial Surgeon", pt: "Cirurgião Bucomaxilofacial", es: "Cirujano Bucomaxilofacial" },
  "Pediatric Dentist": { en: "Pediatric Dentist", pt: "Dentista Pediátrico", es: "Dentista Pediátrico" },
  "Pharmacist": { en: "Pharmacist", pt: "Farmacêutico", es: "Farmacéutico" },
  "Biomedical Scientist": { en: "Biomedical Scientist", pt: "Biomédico", es: "Científico Biomédico" },
  "Physical Educator / Personal Trainer": { en: "Physical Educator / Personal Trainer", pt: "Educador Físico / Personal Trainer", es: "Educador Físico / Entrenador Personal" },
  "Social Worker (Health)": { en: "Social Worker (Health)", pt: "Assistente Social (Saúde)", es: "Trabajador Social (Salud)" },
  "Optometrist": { en: "Optometrist", pt: "Optometrista", es: "Optometrista" },
  "Podiatrist": { en: "Podiatrist", pt: "Podólogo", es: "Podólogo" },
  "Acupuncturist (non-medical)": { en: "Acupuncturist (non-medical)", pt: "Acupunturista (não médico)", es: "Acupunturista (no médico)" },
  "Naturopath": { en: "Naturopath", pt: "Naturopata", es: "Naturopata" },
  "Veterinarian": { en: "Veterinarian", pt: "Veterinário", es: "Veterinario" },
  "Other": { en: "Other", pt: "Outro", es: "Otro" },
  [PSYCHOANALYSIS_SPECIALTY]: { en: "Psychoanalysis", pt: "Psicanálise", es: "Psicoanálisis" },
};

export function getProfessionLabel(lang: Lang, value: string | null | undefined): string {
  if (!value) return "";
  return LABELS[value]?.[lang] ?? value;
}

export function specialtyMatchesSearch(lang: Lang, specialty: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return specialty.toLowerCase().includes(q) || getProfessionLabel(lang, specialty).toLowerCase().includes(q);
}

export const ALL_PROFESSION_VALUES = PROFESSION_GROUPS.flatMap((g) => g.options);

/** Legacy / free-text specialty values stored before canonical English keys. */
const LEGACY_SPECIALTY_ALIASES: Record<string, string> = {
  Psychology: "Psychologist",
  Nutrition: "Nutritionist",
  "Medicina Geral": "General Practice",
  "Clínico Geral": "General Practice",
  "Clinico Geral": "General Practice",
  Psicologia: "Psychologist",
  Nutrição: "Nutritionist",
  Nutricao: "Nutritionist",
  Fisioterapia: "Physiotherapist",
  Dentist: "Dentist (General)",
  "Dental Surgeon": "Dentist (General)",
  Dentista: "Dentist (General)",
  "Physical Therapist": "Physiotherapist",
  Nursing: "Nurse",
};

/** Map a stored specialty (canonical, localized, or legacy) to a PROFESSION_GROUPS value. */
export function canonicalProfessionValue(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (ALL_PROFESSION_VALUES.includes(s)) return s;

  const legacy = LEGACY_SPECIALTY_ALIASES[s];
  if (legacy) return legacy;

  for (const value of ALL_PROFESSION_VALUES) {
    const labels = LABELS[value];
    if (!labels) continue;
    if (labels.en === s || labels.pt === s || labels.es === s) return value;
  }

  return null;
}
