// Psychological scales — questions and scoring for the Psychologist Area.
// PHQ-9 and GAD-7 are public-domain screening tools commonly used in Brazil.

export type ScaleId = "PHQ9" | "GAD7" | "BAI" | "BDI2" | "DASS21";

export interface ScaleQuestion {
  id: string;
  textPt: string;
  textEn: string;
  textEs: string;
}

export interface ScaleDefinition {
  id: ScaleId;
  namePt: string;
  nameEn: string;
  nameEs: string;
  descriptionPt: string;
  descriptionEn: string;
  descriptionEs: string;
  options: { value: number; labelPt: string; labelEn: string; labelEs: string }[];
  questions: ScaleQuestion[];
  interpret: (score: number) => { levelPt: string; levelEn: string; levelEs: string };
}

const FREQ_OPTIONS = [
  { value: 0, labelPt: "Nenhum dia", labelEn: "Not at all", labelEs: "Ningún día" },
  { value: 1, labelPt: "Vários dias", labelEn: "Several days", labelEs: "Varios días" },
  { value: 2, labelPt: "Mais da metade dos dias", labelEn: "More than half the days", labelEs: "Más de la mitad de los días" },
  { value: 3, labelPt: "Quase todos os dias", labelEn: "Nearly every day", labelEs: "Casi todos los días" },
];

const PHQ9_QUESTIONS: ScaleQuestion[] = [
  { id: "q1", textPt: "Pouco interesse ou prazer em fazer as coisas", textEn: "Little interest or pleasure in doing things", textEs: "Poco interés o placer en hacer las cosas" },
  { id: "q2", textPt: "Sentir-se para baixo, deprimido(a) ou sem esperança", textEn: "Feeling down, depressed, or hopeless", textEs: "Sentirse decaído, deprimido o sin esperanza" },
  { id: "q3", textPt: "Dificuldade para pegar no sono, permanecer dormindo ou dormir demais", textEn: "Trouble falling or staying asleep, or sleeping too much", textEs: "Dificultad para dormir, permanecer dormido o dormir demasiado" },
  { id: "q4", textPt: "Sentir-se cansado(a) ou com pouca energia", textEn: "Feeling tired or having little energy", textEs: "Sentirse cansado o con poca energía" },
  { id: "q5", textPt: "Falta de apetite ou comer demais", textEn: "Poor appetite or overeating", textEs: "Falta de apetito o comer en exceso" },
  { id: "q6", textPt: "Sentir-se mal consigo mesmo(a) ou achar que é um fracasso", textEn: "Feeling bad about yourself or that you are a failure", textEs: "Sentirse mal consigo mismo o pensar que es un fracaso" },
  { id: "q7", textPt: "Dificuldade para se concentrar nas coisas", textEn: "Trouble concentrating on things", textEs: "Dificultad para concentrarse en las cosas" },
  { id: "q8", textPt: "Lentidão para se movimentar ou falar, ou o oposto — muito agitado(a)", textEn: "Moving or speaking slowly, or being fidgety/restless", textEs: "Lentitud al moverse o hablar, o lo contrario — muy inquieto" },
  { id: "q9", textPt: "Pensamentos de que seria melhor estar morto(a) ou de se machucar", textEn: "Thoughts that you would be better off dead or of hurting yourself", textEs: "Pensamientos de que estaría mejor muerto o de lastimarse" },
];

const GAD7_QUESTIONS: ScaleQuestion[] = [
  { id: "q1", textPt: "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)", textEn: "Feeling nervous, anxious, or on edge", textEs: "Sentirse nervioso, ansioso o muy tenso" },
  { id: "q2", textPt: "Não conseguir impedir ou controlar as preocupações", textEn: "Not being able to stop or control worrying", textEs: "No poder impedir o controlar las preocupaciones" },
  { id: "q3", textPt: "Preocupar-se demais com diversas coisas", textEn: "Worrying too much about different things", textEs: "Preocuparse demasiado por diversas cosas" },
  { id: "q4", textPt: "Dificuldade para relaxar", textEn: "Trouble relaxing", textEs: "Dificultad para relajarse" },
  { id: "q5", textPt: "Ficar tão inquieto(a) que é difícil ficar parado(a)", textEn: "Being so restless that it is hard to sit still", textEs: "Estar tan inquieto que es difícil quedarse quieto" },
  { id: "q6", textPt: "Ficar facilmente irritado(a) ou aborrecido(a)", textEn: "Becoming easily annoyed or irritable", textEs: "Irritarse o molestarse fácilmente" },
  { id: "q7", textPt: "Sentir medo como se algo horrível fosse acontecer", textEn: "Feeling afraid as if something awful might happen", textEs: "Sentir miedo como si algo horrible fuera a pasar" },
];

function phq9Interpret(score: number) {
  if (score <= 4) return { levelPt: "Mínima", levelEn: "Minimal", levelEs: "Mínima" };
  if (score <= 9) return { levelPt: "Leve", levelEn: "Mild", levelEs: "Leve" };
  if (score <= 14) return { levelPt: "Moderada", levelEn: "Moderate", levelEs: "Moderada" };
  if (score <= 19) return { levelPt: "Moderadamente grave", levelEn: "Moderately severe", levelEs: "Moderadamente grave" };
  return { levelPt: "Grave", levelEn: "Severe", levelEs: "Grave" };
}

function gad7Interpret(score: number) {
  if (score <= 4) return { levelPt: "Mínima", levelEn: "Minimal", levelEs: "Mínima" };
  if (score <= 9) return { levelPt: "Leve", levelEn: "Mild", levelEs: "Leve" };
  if (score <= 14) return { levelPt: "Moderada", levelEn: "Moderate", levelEs: "Moderada" };
  return { levelPt: "Grave", levelEn: "Severe", levelEs: "Grave" };
}

export const PSYCHOLOGY_SCALES: ScaleDefinition[] = [
  {
    id: "PHQ9",
    namePt: "PHQ-9 — Depressão",
    nameEn: "PHQ-9 — Depression",
    nameEs: "PHQ-9 — Depresión",
    descriptionPt: "Questionário de saúde do paciente — rastreamento de sintomas depressivos (últimas 2 semanas).",
    descriptionEn: "Patient Health Questionnaire — depression symptom screening (past 2 weeks).",
    descriptionEs: "Cuestionario de salud del paciente — detección de síntomas depresivos (últimas 2 semanas).",
    options: FREQ_OPTIONS,
    questions: PHQ9_QUESTIONS,
    interpret: phq9Interpret,
  },
  {
    id: "GAD7",
    namePt: "GAD-7 — Ansiedade",
    nameEn: "GAD-7 — Anxiety",
    nameEs: "GAD-7 — Ansiedad",
    descriptionPt: "Escala de transtorno de ansiedade generalizada (últimas 2 semanas).",
    descriptionEn: "Generalized Anxiety Disorder scale (past 2 weeks).",
    descriptionEs: "Escala de trastorno de ansiedad generalizada (últimas 2 semanas).",
    options: FREQ_OPTIONS,
    questions: GAD7_QUESTIONS,
    interpret: gad7Interpret,
  },
];

export function getScale(id: ScaleId): ScaleDefinition | undefined {
  return PSYCHOLOGY_SCALES.find((s) => s.id === id);
}

export function scoreScale(scaleId: ScaleId, responses: number[]): number {
  return responses.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
}
