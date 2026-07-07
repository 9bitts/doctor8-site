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

const BAI_OPTIONS = [
  { value: 0, labelPt: "Absolutamente não", labelEn: "Not at all", labelEs: "Absolutamente no" },
  { value: 1, labelPt: "Levemente", labelEn: "Mildly", labelEs: "Levemente" },
  { value: 2, labelPt: "Moderadamente", labelEn: "Moderately", labelEs: "Moderadamente" },
  { value: 3, labelPt: "Gravemente", labelEn: "Severely", labelEs: "Gravemente" },
];

const DASS_OPTIONS = [
  { value: 0, labelPt: "Não se aplicou", labelEn: "Did not apply", labelEs: "No se aplicó" },
  { value: 1, labelPt: "Aplicou-se em parte", labelEn: "Applied somewhat", labelEs: "Se aplicó en parte" },
  { value: 2, labelPt: "Aplicou-se em boa parte", labelEn: "Applied considerably", labelEs: "Se aplicó bastante" },
  { value: 3, labelPt: "Aplicou-se muito", labelEn: "Applied very much", labelEs: "Se aplicó mucho" },
];

function q(id: string, pt: string, en: string, es: string): ScaleQuestion {
  return { id, textPt: pt, textEn: en, textEs: es };
}

const PHQ9_QUESTIONS: ScaleQuestion[] = [
  q("q1", "Pouco interesse ou prazer em fazer as coisas", "Little interest or pleasure in doing things", "Poco interés o placer en hacer las cosas"),
  q("q2", "Sentir-se para baixo, deprimido(a) ou sem esperança", "Feeling down, depressed, or hopeless", "Sentirse decaído, deprimido o sin esperanza"),
  q("q3", "Dificuldade para pegar no sono, permanecer dormindo ou dormir demais", "Trouble falling or staying asleep, or sleeping too much", "Dificultad para dormir o dormir demasiado"),
  q("q4", "Sentir-se cansado(a) ou com pouca energia", "Feeling tired or having little energy", "Sentirse cansado o con poca energía"),
  q("q5", "Falta de apetite ou comer demais", "Poor appetite or overeating", "Falta de apetito o comer en exceso"),
  q("q6", "Sentir-se mal consigo mesmo(a) ou achar que é um fracasso", "Feeling bad about yourself or that you are a failure", "Sentirse mal consigo mismo"),
  q("q7", "Dificuldade para se concentrar nas coisas", "Trouble concentrating on things", "Dificultad para concentrarse"),
  q("q8", "Lentidão para se movimentar ou falar, ou o oposto — muito agitado(a)", "Moving or speaking slowly, or being fidgety/restless", "Lentitud o inquietud"),
  q("q9", "Pensamentos de que seria melhor estar morto(a) ou de se machucar", "Thoughts that you would be better off dead or of hurting yourself", "Pensamientos de estar mejor muerto o de lastimarse"),
];

const GAD7_QUESTIONS: ScaleQuestion[] = [
  q("q1", "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)", "Feeling nervous, anxious, or on edge", "Sentirse nervioso o ansioso"),
  q("q2", "Não conseguir impedir ou controlar as preocupações", "Not being able to stop or control worrying", "No poder controlar las preocupaciones"),
  q("q3", "Preocupar-se demais com diversas coisas", "Worrying too much about different things", "Preocuparse demasiado"),
  q("q4", "Dificuldade para relaxar", "Trouble relaxing", "Dificultad para relajarse"),
  q("q5", "Ficar tão inquieto(a) que é difícil ficar parado(a)", "Being so restless that it is hard to sit still", "Estar tan inquieto que cuesta quedarse quieto"),
  q("q6", "Ficar facilmente irritado(a) ou aborrecido(a)", "Becoming easily annoyed or irritable", "Irritarse fácilmente"),
  q("q7", "Sentir medo como se algo horrível fosse acontecer", "Feeling afraid as if something awful might happen", "Sentir miedo como si algo horrible fuera a pasar"),
];

const BAI_QUESTIONS: ScaleQuestion[] = [
  q("q1", "Dormência ou formigamento", "Numbness or tingling", "Entumecimiento u hormigueo"),
  q("q2", "Sensação de calor", "Feeling hot", "Sensación de calor"),
  q("q3", "Tremor nas pernas", "Wobbliness in legs", "Temblor en las piernas"),
  q("q4", "Incapacidade de relaxar", "Unable to relax", "Incapacidad de relajarse"),
  q("q5", "Medo de que aconteça o pior", "Fear of worst happening", "Miedo de que pase lo peor"),
  q("q6", "Tontura ou atordoamento", "Dizzy or lightheaded", "Mareo o aturdimiento"),
  q("q7", "Coração acelerado ou disparado", "Heart pounding or racing", "Corazón acelerado"),
  q("q8", "Instável", "Unsteady", "Inestable"),
  q("q9", "Aterrorizado ou apavorado", "Terrified or afraid", "Aterrorizado"),
  q("q10", "Nervoso", "Nervous", "Nervioso"),
  q("q11", "Sensação de asfixia", "Feeling of choking", "Sensación de ahogo"),
  q("q12", "Mãos trêmulas", "Hands trembling", "Manos temblorosas"),
  q("q13", "Instável/trêmulo", "Shaky/unsteady", "Tembloroso"),
  q("q14", "Medo de perder o controle", "Fear of losing control", "Miedo de perder el control"),
  q("q15", "Dificuldade para respirar", "Difficulty breathing", "Dificultad para respirar"),
  q("q16", "Medo de morrer", "Fear of dying", "Miedo de morir"),
  q("q17", "Assustado", "Scared", "Asustado"),
  q("q18", "Indigestão ou desconforto abdominal", "Indigestion or discomfort in abdomen", "Indigestión"),
  q("q19", "Desmaio", "Faint or lightheaded", "Desmayo"),
  q("q20", "Rosto ruborizado", "Face flushed", "Cara sonrojada"),
  q("q21", "Suor (não devido ao calor)", "Perspiration (not due to heat)", "Sudoración"),
];

const BDI2_QUESTIONS: ScaleQuestion[] = [
  q("q1", "Tristeza", "Sadness", "Tristeza"),
  q("q2", "Pessimismo", "Pessimism", "Pesimismo"),
  q("q3", "Fracasso passado", "Past failure", "Fracaso pasado"),
  q("q4", "Perda de prazer", "Loss of pleasure", "Pérdida de placer"),
  q("q5", "Sentimentos de culpa", "Guilty feelings", "Culpa"),
  q("q6", "Sentimentos de punição", "Punishment feelings", "Castigo"),
  q("q7", "Autoaversão", "Self-dislike", "Autoaversión"),
  q("q8", "Autocrítica", "Self-criticalness", "Autocrítica"),
  q("q9", "Pensamentos ou desejos suicidas", "Suicidal thoughts or wishes", "Ideación suicida"),
  q("q10", "Choro", "Crying", "Llanto"),
  q("q11", "Agitação", "Agitation", "Agitación"),
  q("q12", "Perda de interesse", "Loss of interest", "Pérdida de interés"),
  q("q13", "Indecisão", "Indecisiveness", "Indecisión"),
  q("q14", "Desvalorização", "Worthlessness", "Desvalorización"),
  q("q15", "Perda de energia", "Loss of energy", "Pérdida de energía"),
  q("q16", "Mudanças no padrão de sono", "Sleep changes", "Cambios en el sueño"),
  q("q17", "Irritabilidade", "Irritability", "Irritabilidad"),
  q("q18", "Mudanças no apetite", "Appetite changes", "Cambios en el apetito"),
  q("q19", "Dificuldade de concentração", "Concentration difficulty", "Dificultad de concentración"),
  q("q20", "Cansaço ou fadiga", "Tiredness or fatigue", "Fatiga"),
  q("q21", "Perda de interesse por sexo", "Loss of interest in sex", "Pérdida de interés sexual"),
];

const DASS21_QUESTIONS: ScaleQuestion[] = [
  q("q1", "Achei difícil me acalmar", "I found it hard to wind down", "Me costó calmarme"),
  q("q2", "Percebi que estava com a boca seca", "I was aware of dryness of my mouth", "Boca seca"),
  q("q3", "Não consegui vivenciar nenhum sentimento positivo", "I couldn't seem to experience positive feelings", "Sin sentimientos positivos"),
  q("q4", "Tive dificuldade em respirar", "I found it difficult to breathe", "Dificultad para respirar"),
  q("q5", "Achei difícil ter iniciativa para fazer as coisas", "I found it difficult to work up initiative", "Sin iniciativa"),
  q("q6", "Tive a tendência de reagir de forma exagerada", "I tended to over-react to situations", "Reaccionar exageradamente"),
  q("q7", "Senti tremores", "I experienced trembling", "Temblores"),
  q("q8", "Senti que estava sempre nervoso", "I felt that I was using a lot of nervous energy", "Mucha energía nerviosa"),
  q("q9", "Preocupei-me com situações em que pudesse entrar em pânico", "I was worried about situations in which I might panic", "Miedo al pánico"),
  q("q10", "Senti que não tinha nada a desejar", "I felt that I had nothing to look forward to", "Sin perspectivas"),
  q("q11", "Senti-me agitado", "I found myself getting agitated", "Agitación"),
  q("q12", "Achei difícil relaxar", "I found it difficult to relax", "Dificultad para relajarse"),
  q("q13", "Senti-me triste e deprimido", "I felt down-hearted and blue", "Triste y deprimido"),
  q("q14", "Fui intolerante com coisas que me impediam de continuar", "I was intolerant of anything that kept me from getting on", "Intolerancia a interrupciones"),
  q("q15", "Senti que estava perto do pânico", "I felt I was close to panic", "Cerca del pánico"),
  q("q16", "Não consegui entusiasmar-me com nada", "I was unable to become enthusiastic about anything", "Sin entusiasmo"),
  q("q17", "Senti que não valia muito como pessoa", "I felt I wasn't worth much as a person", "Sin valor personal"),
  q("q18", "Senti que estava um pouco emotivo/sensível demais", "I felt that I was rather touchy", "Muy sensible"),
  q("q19", "Estava ciente do meu coração acelerado sem esforço físico", "I was aware of the action of my heart without physical exertion", "Corazón acelerado"),
  q("q20", "Senti medo sem motivo", "I felt scared without any good reason", "Miedo sin motivo"),
  q("q21", "Senti que a vida não tinha sentido", "I felt that life was meaningless", "Vida sin sentido"),
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

function baiInterpret(score: number) {
  if (score <= 7) return { levelPt: "Mínima", levelEn: "Minimal", levelEs: "Mínima" };
  if (score <= 15) return { levelPt: "Leve", levelEn: "Mild", levelEs: "Leve" };
  if (score <= 25) return { levelPt: "Moderada", levelEn: "Moderate", levelEs: "Moderada" };
  return { levelPt: "Grave", levelEn: "Severe", levelEs: "Grave" };
}

function bdi2Interpret(score: number) {
  if (score <= 13) return { levelPt: "Mínima", levelEn: "Minimal", levelEs: "Mínima" };
  if (score <= 19) return { levelPt: "Leve", levelEn: "Mild", levelEs: "Leve" };
  if (score <= 28) return { levelPt: "Moderada", levelEn: "Moderate", levelEs: "Moderada" };
  return { levelPt: "Grave", levelEn: "Severe", levelEs: "Grave" };
}

function dass21Interpret(score: number) {
  if (score <= 20) return { levelPt: "Normal", levelEn: "Normal", levelEs: "Normal" };
  if (score <= 40) return { levelPt: "Leve", levelEn: "Mild", levelEs: "Leve" };
  if (score <= 60) return { levelPt: "Moderado", levelEn: "Moderate", levelEs: "Moderado" };
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
  {
    id: "BAI",
    namePt: "BAI — Inventário de Ansiedade de Beck",
    nameEn: "BAI — Beck Anxiety Inventory",
    nameEs: "BAI — Inventario de Ansiedad de Beck",
    descriptionPt: "Avalia sintomas de ansiedade somática e cognitiva (última semana).",
    descriptionEn: "Assesses somatic and cognitive anxiety symptoms (past week).",
    descriptionEs: "Evalúa síntomas de ansiedad somática y cognitiva (última semana).",
    options: BAI_OPTIONS,
    questions: BAI_QUESTIONS,
    interpret: baiInterpret,
  },
  {
    id: "BDI2",
    namePt: "BDI-II — Inventário de Depressão de Beck",
    nameEn: "BDI-II — Beck Depression Inventory",
    nameEs: "BDI-II — Inventario de Depresión de Beck",
    descriptionPt: "Rastreamento de sintomas depressivos (últimas 2 semanas).",
    descriptionEn: "Depression symptom screening (past 2 weeks).",
    descriptionEs: "Detección de síntomas depresivos (últimas 2 semanas).",
    options: BAI_OPTIONS,
    questions: BDI2_QUESTIONS,
    interpret: bdi2Interpret,
  },
  {
    id: "DASS21",
    namePt: "DASS-21 — Depressão, Ansiedade e Estresse",
    nameEn: "DASS-21 — Depression, Anxiety and Stress",
    nameEs: "DASS-21 — Depresión, Ansiedad y Estrés",
    descriptionPt: "Triagem de depressão, ansiedade e estresse (última semana).",
    descriptionEn: "Screens depression, anxiety and stress (past week).",
    descriptionEs: "Tamiza depresión, ansiedad y estrés (última semana).",
    options: DASS_OPTIONS,
    questions: DASS21_QUESTIONS,
    interpret: dass21Interpret,
  },
];

export function getScale(id: ScaleId): ScaleDefinition | undefined {
  return PSYCHOLOGY_SCALES.find((s) => s.id === id);
}

export function scoreScale(scaleId: ScaleId, responses: number[]): number {
  return responses.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
}
