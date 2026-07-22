import type { Lang } from "@/lib/i18n/translations";
import { chartActionUrl } from "@/lib/video-chart-nav";
import { generateStructuredFormPrefill } from "./generate-structured-prefill";
import { formRouteForType, resolveFormType } from "./form-type-resolver";
import {
  appointmentsRouteForPortal,
  patientChartRouteForPortal,
  patientsRouteForPortal,
  prescriptionsRouteForPortal,
} from "./portal-resolver";
import { parseVoiceIntent } from "./parse-intent";
import { buildPrescriptionPrefill, resolvePatientById, resolvePatientMatches } from "./resolve-entities";
import { sanitizeExamItems } from "./sanitize-exam-items";
import { resolveSkillRoute } from "./skill-registry";
import { resolveEffectiveSkillsPortal } from "./voice-profile";
import type { ParsedVoiceIntent, VoicePortalId, VoiceProcessResult, PatientMatch } from "./types";
import type { VoiceAssistantAuth } from "./voice-assistant-auth";

function msg(lang: Lang, pt: string, en: string, es: string): string {
  if (lang === "es") return es;
  if (lang === "en") return en;
  return pt;
}

function reviewFields(transcript: string, intent?: ParsedVoiceIntent | null) {
  const cleaned = intent?.cleanedCommand?.trim();
  return {
    transcript,
    reviewText: cleaned || transcript,
  };
}

function buildRouteWithPatient(
  basePath: string,
  patientRecordId?: string,
  extra?: Record<string, string>,
): string {
  if (!patientRecordId) return basePath;
  return chartActionUrl(basePath, patientRecordId, { extra });
}

export async function processVoiceCommand(params: {
  auth: VoiceAssistantAuth;
  lang: Lang;
  portalId: VoicePortalId;
  pathname?: string;
  transcript: string;
  sessionPatientRecordId?: string;
}): Promise<VoiceProcessResult> {
  const { auth, lang, portalId, transcript } = params;
  const skillsPortal = resolveEffectiveSkillsPortal(
    params.pathname,
    auth.profile,
    portalId,
  );
  const chartPortal = portalId === "PROFESSIONAL" ? "PROFESSIONAL" : skillsPortal;

  const intent = await parseVoiceIntent({
    lang,
    portalId,
    skillsPortalId: skillsPortal,
    profile: auth.profile,
    transcript,
  });

  if (intent.confidence < 0.35) {
    return {
      action: "unknown",
      message: msg(
        lang,
        "Não entendi bem. Pode repetir ou editar a transcrição?",
        "I didn't understand well. Could you repeat or edit the transcript?",
        "No entendí bien. ¿Puede repetir o editar la transcripción?",
      ),
      ...reviewFields(transcript, intent),
    };
  }

  const skillRoute = intent.targetRoute || resolveSkillRoute(skillsPortal, intent.skillId, auth.profile);

  if (intent.skillId === "navigate") {
    const route = skillRoute || resolveSkillRoute(skillsPortal, "navigate", auth.profile);
    if (!route) {
      return {
        action: "unknown",
        message: msg(lang, "Não encontrei essa ferramenta no seu portal.", "I couldn't find that tool in your portal.", "No encontré esa herramienta en su portal."),
        ...reviewFields(transcript, intent),
      };
    }
    return {
      action: "navigate",
      route,
      message: intent.rawSummary || msg(lang, "Abrindo a ferramenta solicitada.", "Opening the requested tool.", "Abriendo la herramienta solicitada."),
      ...reviewFields(transcript, intent),
    };
  }

  if (intent.skillId === "search_patient") {
    const matches = await resolvePatientMatches({
      providerId: auth.providerId,
      portalId,
      patientName: intent.patientName,
    });
    if (matches.length === 1 && matches[0].patientRecordId) {
      return {
        action: "navigate",
        route: patientChartRouteForPortal(chartPortal, matches[0].patientRecordId),
        message: msg(lang, `Abrindo ficha de ${matches[0].displayName}.`, `Opening chart for ${matches[0].displayName}.`, `Abriendo ficha de ${matches[0].displayName}.`),
        ...reviewFields(transcript, intent),
      };
    }
    if (matches.length > 1) {
      return {
        action: "clarify",
        message: msg(lang, "Encontrei mais de um paciente.", "I found more than one patient.", "Encontré más de un paciente."),
        ...reviewFields(transcript, intent),
        question: msg(lang, "Qual paciente você quer abrir?", "Which patient do you want to open?", "¿Qué paciente desea abrir?"),
        options: matches.map((m) => m.displayName),
      };
    }
    const base = patientsRouteForPortal(chartPortal);
    const q = intent.patientName ? `?q=${encodeURIComponent(intent.patientName)}` : "";
    return {
      action: "navigate",
      route: `${base}${q}`,
      message: msg(lang, "Abrindo lista de pacientes.", "Opening patient list.", "Abriendo lista de pacientes."),
      ...reviewFields(transcript, intent),
    };
  }

  if (intent.skillId === "schedule") {
    let route = appointmentsRouteForPortal(skillsPortal === "PSYCHOLOGIST" && portalId === "PROFESSIONAL" ? "PROFESSIONAL" : skillsPortal);
    if (intent.scheduleHint) {
      route += `?voiceHint=${encodeURIComponent(intent.scheduleHint)}`;
    }
    return {
      action: "navigate",
      route,
      message: intent.scheduleHint
        ? msg(lang, `Abrindo agenda. ${intent.scheduleHint}`, `Opening schedule. ${intent.scheduleHint}`, `Abriendo agenda. ${intent.scheduleHint}`)
        : msg(lang, "Abrindo agenda.", "Opening schedule.", "Abriendo agenda."),
      ...reviewFields(transcript, intent),
    };
  }

  if (intent.skillId === "anamnesis" && skillsPortal === "PSYCHOLOGIST") {
    const matches = await resolvePatientMatches({
      providerId: auth.providerId,
      portalId,
      patientName: intent.patientName,
    });

    if (matches.length > 1) {
      return {
        action: "clarify",
        message: msg(lang, "Encontrei mais de um paciente.", "I found more than one patient.", "Encontré más de un paciente."),
        ...reviewFields(transcript, intent),
        question: msg(lang, "Qual paciente?", "Which patient?", "¿Qué paciente?"),
        options: matches.map((m) => m.displayName),
      };
    }

    const patientRecordId = matches[0]?.patientRecordId || params.sessionPatientRecordId;
    const anamnesisBase =
      portalId === "PROFESSIONAL"
        ? "/professional/psychology/anamnesis"
        : "/psychologist/anamnesis";

    let route = anamnesisBase;
    if (patientRecordId) {
      route += `?patientRecordId=${encodeURIComponent(patientRecordId)}`;
    } else if (intent.patientName) {
      route += `?q=${encodeURIComponent(intent.patientName)}`;
    }

    const patientName = matches[0]?.displayName || intent.patientName || undefined;
    return {
      action: "navigate",
      route,
      message: patientName
        ? msg(lang, `Abrindo anamnese de ${patientName}.`, `Opening anamnesis for ${patientName}.`, `Abriendo anamnesis de ${patientName}.`)
        : msg(lang, "Abrindo anamnese psicológica.", "Opening psychological anamnesis.", "Abriendo anamnesis psicológica."),
      ...reviewFields(transcript, intent),
    };
  }

  if (intent.skillId === "prescribe") {
    const prefill = await buildPrescriptionPrefill({
      providerId: auth.providerId,
      portalId,
      intent,
      phytoOnly: portalId === "INTEGRATIVE_THERAPIST",
    });

    if (prefill.medications.length === 0) {
      return {
        action: "clarify",
        message: msg(lang, "Entendi que você quer prescrever.", "I understand you want to prescribe.", "Entendí que desea prescribir."),
        ...reviewFields(transcript, intent),
        question: msg(lang, "Qual medicamento e posologia?", "Which medication and dosage?", "¿Qué medicamento y posología?"),
      };
    }

    if (prefill.patientAmbiguities && prefill.patientAmbiguities.length > 1) {
      return {
        action: "clarify",
        message: msg(lang, "Encontrei mais de um paciente com esse nome.", "I found more than one patient with that name.", "Encontré más de un paciente con ese nombre."),
        ...reviewFields(transcript, intent),
        question: msg(lang, "Qual paciente?", "Which patient?", "¿Qué paciente?"),
        options: prefill.patientAmbiguities.map((p) => p.displayName),
      };
    }

    const rxBase = prescriptionsRouteForPortal(portalId);
    const rxRoute = prefill.patient?.patientRecordId
      ? buildRouteWithPatient(rxBase, prefill.patient.patientRecordId, { view: "prescription" })
      : rxBase;

    return {
      action: "prescription_prefill",
      route: rxRoute,
      message: intent.rawSummary || msg(lang, "Receita pronta para conferência.", "Prescription ready for review.", "Receta lista para revisión."),
      ...reviewFields(transcript, intent),
      prefill,
    };
  }

  const formSkills = new Set([
    "clinical_note",
    "sbar_note",
    "sae_note",
    "med_review",
    "anamnesis",
    "meal_plan",
    "exam_request",
    "clinical_document",
  ]);

  if (formSkills.has(intent.skillId)) {
    const formType = resolveFormType(skillsPortal, intent);
    const examItems = sanitizeExamItems(intent.examItems);
    const clinicalText =
      formType === "exam_request" && examItems.length > 0
        ? examItems.join(", ")
        : intent.clinicalText?.trim() || transcript.trim();

    const matches = await resolvePatientMatches({
      providerId: auth.providerId,
      portalId,
      patientName: intent.patientName,
    });

    let patient: PatientMatch | undefined = matches[0];

    if (!patient && params.sessionPatientRecordId) {
      patient = (await resolvePatientById({
        providerId: auth.providerId,
        portalId,
        patientRecordId: params.sessionPatientRecordId,
      })) || undefined;
    }

    if (matches.length > 1) {
      return {
        action: "clarify",
        message: msg(lang, "Encontrei mais de um paciente.", "I found more than one patient.", "Encontré más de un paciente."),
        ...reviewFields(transcript, intent),
        question: msg(lang, "Qual paciente?", "Which patient?", "¿Qué paciente?"),
        options: matches.map((m) => m.displayName),
      };
    }

    if (intent.skillId === "exam_request" && examItems.length === 0) {
      return {
        action: "clarify",
        message: msg(
          lang,
          "Entendi o pedido de exames, mas não identifiquei quais exames.",
          "I understood an exam request, but no specific exams were named.",
          "Entendí el pedido de exámenes, pero no identifiqué cuáles.",
        ),
        ...reviewFields(transcript, intent),
        question: msg(
          lang,
          "Quais exames deseja solicitar? Edite o texto ou fale de novo.",
          "Which exams do you want to order? Edit the text or speak again.",
          "¿Qué exámenes desea solicitar? Edite el texto o hable de nuevo.",
        ),
      };
    }

    const patientRecordId = patient?.patientRecordId || params.sessionPatientRecordId;
    const patientName = patient?.displayName || intent.patientName || undefined;

    if (formType) {
      let data = await generateStructuredFormPrefill({
        lang,
        formType,
        transcript: clinicalText,
        patientName,
      });

      if (formType === "exam_request") {
        const fromPrefill = sanitizeExamItems(
          (data as { examItems?: string[] }).examItems,
        );
        const merged = examItems.length > 0 ? examItems : fromPrefill;
        data = {
          ...(data as Record<string, unknown>),
          examItems: merged,
          title:
            (data as { title?: string }).title ||
            msg(lang, "Pedido de exames", "Exam request", "Pedido de exámenes"),
        };
        if (merged.length === 0) {
          return {
            action: "clarify",
            message: msg(
              lang,
              "Entendi o pedido de exames, mas não identifiquei quais exames.",
              "I understood an exam request, but no specific exams were named.",
              "Entendí el pedido de exámenes, pero no identifiqué cuáles.",
            ),
            ...reviewFields(transcript, intent),
            question: msg(
              lang,
              "Quais exames deseja solicitar? Edite o texto ou fale de novo.",
              "Which exams do you want to order? Edit the text or speak again.",
              "¿Qué exámenes desea solicitar? Edite el texto o hable de nuevo.",
            ),
          };
        }
      }
      if (formType === "clinical_document" && intent.documentType) {
        const docType = intent.documentType.toUpperCase();
        const normalized =
          docType === "REPORT" ? "REPORT"
          : docType === "OTHER" ? "OTHER"
          : "CERTIFICATE";
        data = {
          ...(data as Record<string, unknown>),
          documentType: normalized,
        };
      }

      let baseRoute = formRouteForType(skillsPortal, formType);
      const extra: Record<string, string> = {};

      if (formType === "session_note") {
        extra.view = "create";
      }
      if (formType === "exam_request") {
        extra.view = "exam";
      }
      if (formType === "clinical_document") {
        extra.view = "document";
      }
      if (formType === "chart_evolution" && patientRecordId) {
        baseRoute = patientChartRouteForPortal(chartPortal, patientRecordId);
        extra.newRecord = "1";
        extra.tab = "evolution";
      }

      const route = buildRouteWithPatient(baseRoute, patientRecordId, Object.keys(extra).length ? extra : undefined);

      return {
        action: "form_prefill",
        route,
        message: intent.rawSummary || msg(lang, "Formulário pronto para conferência.", "Form ready for review.", "Formulario listo para revisión."),
        ...reviewFields(transcript, intent),
        formType,
        patientRecordId,
        patientName,
        data,
      };
    }

    const chartRoute = patientRecordId
      ? patientChartRouteForPortal(chartPortal, patientRecordId)
      : skillRoute || undefined;

    return {
      action: "clinical_note",
      message: intent.rawSummary || msg(lang, "Rascunho gerado. Confira antes de salvar.", "Draft generated. Review before saving.", "Borrador generado. Revise antes de guardar."),
      ...reviewFields(transcript, intent),
      draft: clinicalText,
      patientRecordId,
      patientName,
      chartRoute,
    };
  }

  if (skillRoute) {
    return {
      action: "navigate",
      route: skillRoute,
      message: intent.rawSummary || msg(lang, "Abrindo ferramenta.", "Opening tool.", "Abriendo herramienta."),
      ...reviewFields(transcript, intent),
    };
  }

  return {
    action: "unknown",
    message: msg(lang, "Ainda não consigo executar esse comando neste portal.", "I can't execute that command in this portal yet.", "Aún no puedo ejecutar ese comando en este portal."),
    ...reviewFields(transcript, intent),
  };
}
