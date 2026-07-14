import type { Lang } from "@/lib/i18n/translations";

const T: Record<string, Record<Lang, string>> = {
  title: {
    pt: "Assistente por voz",
    en: "Voice assistant",
    es: "Asistente por voz",
  },
  subtitle: {
    pt: "Fale o que deseja fazer — confira antes de salvar",
    en: "Say what you want to do — review before saving",
    es: "Diga lo que desea hacer — revise antes de guardar",
  },
  openLabel: {
    pt: "Abrir assistente por voz",
    en: "Open voice assistant",
    es: "Abrir asistente por voz",
  },
  headerLabel: {
    pt: "Assistente de voz",
    en: "Voice assistant",
    es: "Asistente de voz",
  },
  consent: {
    pt: "Confirmo consentimento para uso de voz com IA nesta sessão (LGPD).",
    en: "I confirm consent for AI voice use in this session (privacy compliance).",
    es: "Confirmo consentimiento para uso de voz con IA en esta sesión.",
  },
  needConsent: {
    pt: "Marque o consentimento para continuar.",
    en: "Check consent to continue.",
    es: "Marque el consentimiento para continuar.",
  },
  speakHint: {
    pt: "Fale um comando clínico do seu portal",
    en: "Speak a clinical command for your portal",
    es: "Diga un comando clínico de su portal",
  },
  startRecording: {
    pt: "Toque para falar",
    en: "Tap to speak",
    es: "Toque para hablar",
  },
  stopRecording: {
    pt: "Parar de gravar",
    en: "Stop recording",
    es: "Detener grabación",
  },
  recording: {
    pt: "Gravando…",
    en: "Recording…",
    es: "Grabando…",
  },
  processing: {
    pt: "Processando comando…",
    en: "Processing command…",
    es: "Procesando comando…",
  },
  transcript: {
    pt: "Transcrição",
    en: "Transcript",
    es: "Transcripción",
  },
  understood: {
    pt: "Entendi",
    en: "Understood",
    es: "Entendí",
  },
  reviewHint: {
    pt: "Confira os dados antes de salvar na ferramenta.",
    en: "Review the data before saving in the tool.",
    es: "Revise los datos antes de guardar en la herramienta.",
  },
  apply: {
    pt: "Abrir e preencher",
    en: "Open and prefill",
    es: "Abrir y completar",
  },
  navigate: {
    pt: "Abrir ferramenta",
    en: "Open tool",
    es: "Abrir herramienta",
  },
  cancel: {
    pt: "Cancelar",
    en: "Cancel",
    es: "Cancelar",
  },
  close: {
    pt: "Fechar",
    en: "Close",
    es: "Cerrar",
  },
  closeAssistant: {
    pt: "Fechar assistente",
    en: "Close assistant",
    es: "Cerrar asistente",
  },
  editTranscript: {
    pt: "Editar transcrição",
    en: "Edit transcript",
    es: "Editar transcripción",
  },
  submitText: {
    pt: "Processar texto",
    en: "Process text",
    es: "Procesar texto",
  },
  micError: {
    pt: "Não foi possível acessar o microfone.",
    en: "Could not access the microphone.",
    es: "No se pudo acceder al micrófono.",
  },
  genericError: {
    pt: "Não foi possível processar. Tente novamente.",
    en: "Could not process. Please try again.",
    es: "No se pudo procesar. Inténtelo de nuevo.",
  },
  aiNotConfigured: {
    pt: "IA não configurada.",
    en: "AI not configured.",
    es: "IA no configurada.",
  },
  patient: {
    pt: "Paciente",
    en: "Patient",
    es: "Paciente",
  },
  medications: {
    pt: "Medicamentos",
    en: "Medications",
    es: "Medicamentos",
  },
  draft: {
    pt: "Rascunho clínico",
    en: "Clinical draft",
    es: "Borrador clínico",
  },
  openChart: {
    pt: "Abrir prontuário",
    en: "Open chart",
    es: "Abrir ficha",
  },
  copyDraft: {
    pt: "Copiar rascunho",
    en: "Copy draft",
    es: "Copiar borrador",
  },
  copied: {
    pt: "Copiado!",
    en: "Copied!",
    es: "¡Copiado!",
  },
  clarify: {
    pt: "Preciso de mais informações",
    en: "I need more information",
    es: "Necesito más información",
  },
  pasteFallback: {
    pt: "Ou digite / cole o comando:",
    en: "Or type / paste the command:",
    es: "O escriba / pegue el comando:",
  },
  "promoBanner.title": {
    pt: "Teste nossa assistente de IA",
    en: "Try our AI assistant",
    es: "Pruebe nuestra asistente de IA",
  },
  "promoBanner.desc": {
    pt: "Fale o comando — a IA transcreve e preenche o formulário. Você revisa e só salva ao confirmar. Botão roxo no canto inferior esquerdo ou Ctrl+Shift+V.",
    en: "Speak your command — AI transcribes and prefills the form. You review and save only when you confirm. Purple button bottom-left or Ctrl+Shift+V.",
    es: "Diga el comando — la IA transcribe y completa el formulario. Usted revisa y guarda al confirmar. Botón morado abajo a la izquierda o Ctrl+Shift+V.",
  },
  "promoBanner.cta": {
    pt: "Experimentar agora",
    en: "Try it now",
    es: "Probar ahora",
  },
  "promoBanner.examplePrefix": {
    pt: "Exemplo para sua área:",
    en: "Example for your area:",
    es: "Ejemplo para su área:",
  },
};

export function voiceT(key: string, lang: Lang): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}
