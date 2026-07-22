"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { canPrescribeCannabisMedicinal } from "@/lib/profession-label";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useToast } from "@/components/ui/toast";
import { type SignTarget, type EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import { readChartDeepLink } from "@/lib/video-chart-nav";
import {
  isExamTemplateCategory,
  parseExamTemplateBody,
  resolveDocumentTemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/clinical-template-utils";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import type { Chart } from "@/components/professional/emissions/types";
import { type DrugCountryCode } from "@/lib/drug-countries";
import { type DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import type { DrugLeafletTarget } from "@/lib/drug-leaflet/types";
import {
  type PrescriptionMedItem,
  type PrescriptionMedItemUpdateHandler,
} from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import { isFreeTextPrescriptionItem } from "@/lib/prescription-item-kind";
import {
  fetchMnByCategoriaForPrescription,
  mapMnItemsToDrugResults,
  mnMedItemFromDrugResultForMode,
  mnMedItemFromListItemForMode,
  MN_ADD_PARAM_TO_ITEM_KIND,
  resolveMnCatalogCategoria,
  type PrescriptionItemSearchMode,
} from "@/lib/medicina-natural-catalog/prescription-search";
import {
  checkPhytoDrugInteractions,
  extractMnHerbNames,
  type PhytoInteractionWarning,
} from "@/lib/medicina-natural/phyto-interactions";
import {
  medicationListHasCannabis,
  medicationListHasConventionalDrugs,
  medicationListHasIntegrativeItems,
} from "@/lib/integrative-medicine/integrative-prescription-utils";
import { getIntegrativeProtocolPreset } from "@/lib/integrative-medicine/protocol-presets";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import { floralProductByValue } from "@/lib/pics/reference-library/floral-products";
import {
  resolveFloralStarter,
} from "@/lib/pics/reference-library/floral-starter-templates";
import {
  getPrescriptionsPortalConfig,
  apiPath,
  type PrescriptionsPortalId,
} from "@/lib/prescriptions-portal-config";
import { consumeVoicePrefill, consumeVoiceFormPrefill } from "@/lib/voice-assistant/prefill-storage";
import {
  VOICE_FORM_PREFILL_EVENT,
  VOICE_PRESCRIPTION_PREFILL_EVENT,
  type ClinicalDocumentPrefill,
  type ExamRequestPrefill,
} from "@/lib/voice-assistant/types";
import { scrollDashboardToTopAfterPaint } from "@/lib/scroll-dashboard-client";
import {
  extendSessionForWrite,
  isAuthFailureStatus,
  redirectToLoginAfterAuthFailure,
} from "@/lib/session-extend-client";
import {
  isExamDocType,
  emissionKindFromDoc,
  isMedsFormValid,
  parseBulkMedicationLines,
  splitDisplayName,
  MN_RX_SEARCH_TABS,
  type ClinicalDocument,
  type Prescription,
  type RxTemplate,
  type MedItem,
  type ImportablePatient,
  type PlatformMatch,
  type PlatformRxTarget,
  type View,
  type ListFilter,
  type MnAddItemKind,
  type ControlledFormKind,
  defaultValidDaysForFormKind,
  prescriptionTypeMatchesFormKind,
  validateDrugForControlledForm,
  isControlledRxFormMode,
} from "./shared";
import { splitPrescriptionMedications } from "@/lib/prescription-split";
import { classifyMedicationItem } from "@/lib/prescription-item-classifier";
import { type SavedEmission } from "@/components/professional/emissions/EmissionPostSaveFlow";
import {
  clearPrescriptionDraft,
  hasPrescriptionDraft,
  isPrescriptionDraftEmpty,
  loadPrescriptionDraft,
  savePrescriptionDraft,
  type PrescriptionFormDraft,
} from "@/lib/prescription-draft";
import {
  clearDocumentDraft,
  clearExamDraft,
  hasDocumentDraft,
  hasExamDraft,
} from "@/lib/emission-form-draft";

export function usePrescriptionPage() {
  const { t, lang } = useI18n();
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id ?? "";
  const canPrescribeCannabis = canPrescribeCannabisMedicinal(
    session?.user?.professionalSpecialty,
  );
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const portal: PrescriptionsPortalId = pathname.startsWith("/integrative-therapist")
    ? "integrative-therapist"
    : "professional";
  const cfg = getPrescriptionsPortalConfig(portal);
  const api = (suffix: string) => apiPath(cfg, suffix);
  const accountHref = mapProfessionalPathToPortal(pathname, cfg.accountSignHref);
  const locale = localeOf(lang);

  const [view, setView] = useState<View>("hub");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [clinicalDocs, setClinicalDocs] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [reuseClinical, setReuseClinical] = useState<ClinicalDocument | null>(null);
  const [reusePatient, setReusePatient] = useState<Chart | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [reuseSource, setReuseSource] = useState<Prescription | null>(null);

  const [savedEmission, setSavedEmission] = useState<SavedEmission | null>(null);
  const [postSaveStep, setPostSaveStep] = useState<"review" | "choose" | "deliver" | "success">("choose");
  const [postSaveShareUrl, setPostSaveShareUrl] = useState("");
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [editingClinicalDocId, setEditingClinicalDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!savedEmission) return;
    scrollDashboardToTopAfterPaint();
  }, [savedEmission, postSaveStep]);

  const [charts, setCharts] = useState<Chart[]>([]);
  const [importablePatients, setImportablePatients] = useState<ImportablePatient[]>([]);
  const [platformMatches, setPlatformMatches] = useState<PlatformMatch[]>([]);
  const [platformTarget, setPlatformTarget] = useState<PlatformRxTarget | null>(null);
  const [requestingLinkId, setRequestingLinkId] = useState<string | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [importingPatientId, setImportingPatientId] = useState<string | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const patientSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugSearchDone, setDrugSearchDone] = useState(false);
  const [drugSearchModalOpen, setDrugSearchModalOpen] = useState(false);
  const [drugCountry, setDrugCountry] = useState<DrugCountryCode>("BR");
  const [itemSearchMode, setItemSearchMode] = useState<PrescriptionItemSearchMode>("medication");
  const [mnSearchResults, setMnSearchResults] = useState<MedicinaNaturalListItem[]>([]);
  const [mnPickerTargetIndex, setMnPickerTargetIndex] = useState<number | null>(null);
  const [floralOnlyMode, setFloralOnlyMode] = useState(false);
  const [leafletTarget, setLeafletTarget] = useState<DrugLeafletTarget | null>(null);
  const [leafletDrug, setLeafletDrug] = useState<DrugSearchResult | null>(null);
  const [leafletMnItem, setLeafletMnItem] = useState<MedicinaNaturalListItem | null>(null);

  const floralCatalogSearch = floralOnlyMode && cfg.allowFloral;
  const mnSearchCategoria = resolveMnCatalogCategoria({
    allowFloral: cfg.allowFloral,
    phytoOnly: cfg.phytoOnly,
    itemSearchMode,
    floralOnly: floralOnlyMode,
  });
  const mnCatalogSearch = !!mnSearchCategoria;
  const mnSearchModeForUi: PrescriptionItemSearchMode = floralOnlyMode
    ? "floral"
    : itemSearchMode === "medication" && mnCatalogSearch
      ? "phytotherapy"
      : itemSearchMode;

  const [medications, setMedications] = useState<MedItem[]>([]);
  const [highlightIncompleteMeds, setHighlightIncompleteMeds] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [controlledFormKind, setControlledFormKind] = useState<ControlledFormKind>("simple");

  const [signConfig, setSignConfig] = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signProcessing, setSignProcessing] = useState(false);

  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lockPatient, setLockPatient] = useState(false);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);
  const clearConsultReturnUrl = () => setConsultReturnUrl(null);
  const [pendingStarterId, setPendingStarterId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingDocTemplateId, setPendingDocTemplateId] = useState<string | null>(null);
  const [examTemplatePrefill, setExamTemplatePrefill] = useState<{
    templateId: string;
    items: string[];
    notes: string;
    cid: string;
    cidLabel?: string;
    title: string;
  } | null>(null);
  const [docTemplatePrefill, setDocTemplatePrefill] = useState<{
    body: string;
    templateId: string;
    documentType?: string;
    title?: string;
  } | null>(null);
  const [templateAppliedHint, setTemplateAppliedHint] = useState(false);
  const [loadingDocTemplate, setLoadingDocTemplate] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!new URLSearchParams(window.location.search).get("docTemplateId");
  });
  const [pendingFloralProductId, setPendingFloralProductId] = useState<string | null>(null);
  const [pendingProtocolId, setPendingProtocolId] = useState<string | null>(null);
  const [voicePrefillActive, setVoicePrefillActive] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [phytoConfirmOpen, setPhytoConfirmOpen] = useState(false);
  const [phytoWarnings, setPhytoWarnings] = useState<PhytoInteractionWarning[]>([]);
  const [phytoInteractionConfirmed, setPhytoInteractionConfirmed] = useState(false);
  const [cannabisTcleOpen, setCannabisTcleOpen] = useState(false);
  const [cannabisTcleAccepted, setCannabisTcleAccepted] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [examDraftPending, setExamDraftPending] = useState(false);
  const [documentDraftPending, setDocumentDraftPending] = useState(false);
  const [draftRestoredHint, setDraftRestoredHint] = useState(false);
  const draftHydratedRef = useRef(false);
  const suppressDraftSaveRef = useRef(false);
  const [sncrStatus, setSncrStatus] = useState<{
    enabled: boolean;
    platformReady: boolean;
    controlledAvailable: boolean;
    authenticated: boolean;
    platformCnpjConfigured: boolean;
    cpfConfigured: boolean;
    pool: { NRB: number; RCE: number };
    loginPath: string;
  } | null>(null);

  useEffect(() => {
    const authResult = searchParams.get("sncrAuth");
    if (!authResult) return;
    if (authResult === "success") toast.success(t("rx.sncrAuthSuccess"));
    else if (authResult === "error") toast.error(t("rx.sncrAuthError"));
    else if (authResult === "missing_session") toast.error(t("rx.sncrAuthMissingSession"));
    else if (authResult === "forbidden") toast.error(t("rx.sncrAuthForbidden"));
    else if (authResult === "platform_unavailable") toast.error(t("rx.sncrAuthPlatformUnavailable"));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sncrAuth");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [searchParams, pathname, router, toast, t]);

  useEffect(() => {
    fetch("/api/professional/sncr/status", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setSncrStatus(d))
      .catch(() => setSncrStatus(null));
  }, [view]);

  useEffect(() => {
    if (cfg.prescriptionsOnly && (view === "exam" || view === "document")) {
      setView("hub");
    }
  }, [cfg.prescriptionsOnly, view]);

  const applyVoicePrefill = useCallback(async () => {
    const payload = consumeVoicePrefill();
    if (!payload || payload.type !== "prescription") return;

    const { prefill } = payload;
    setView("prescription");
    setVoicePrefillActive(true);

    if (prefill.medications.length > 0) setMedications(prefill.medications);
    if (prefill.instructions) setInstructions(prefill.instructions);
    if (typeof prefill.validDays === "number") setValidDays(prefill.validDays);

    try {
      if (prefill.patient?.patientRecordId) {
        const res = await fetch(api("/records"));
        const data = await res.json();
        const chart = (data.records || []).find((c: Chart) => c.id === prefill.patient!.patientRecordId);
        if (chart) {
          setSelectedPatient(chart);
          setPlatformTarget(null);
        }
      } else if (prefill.patient?.displayName) {
        const res = await fetch(`${api("/records/search")}?q=${encodeURIComponent(prefill.patient.displayName)}`);
        const data = await res.json();
        const records: Chart[] = data.records || [];
        const targetId = prefill.patientAmbiguities?.[0]?.patientRecordId;
        const chart = (targetId ? records.find((c) => c.id === targetId) : records[0]) || null;
        if (chart) {
          setSelectedPatient(chart);
          setPlatformTarget(null);
        }
      }
      toast.success(
        lang === "es"
          ? "Receta completada por voz. Revise antes de guardar."
          : lang === "en"
            ? "Prescription prefilled by voice. Review before saving."
            : "Receita preenchida por voz. Confira antes de salvar.",
      );
    } catch {
      /* ignore */
    }
  }, [api, lang, toast]);

  const resolveVoicePatient = useCallback(async (patientRecordId?: string, displayName?: string) => {
    if (patientRecordId) {
      const res = await fetch(api("/records"));
      const data = await res.json();
      const chart = (data.records || []).find((c: Chart) => c.id === patientRecordId) || null;
      if (chart) {
        setSelectedPatient(chart);
        setReusePatient(chart);
        setPlatformTarget(null);
      }
      return chart;
    }
    if (displayName) {
      const res = await fetch(`${api("/records/search")}?q=${encodeURIComponent(displayName)}`);
      const data = await res.json();
      const records: Chart[] = data.records || [];
      const chart = records[0] || null;
      if (chart) {
        setSelectedPatient(chart);
        setReusePatient(chart);
        setPlatformTarget(null);
      }
      return chart;
    }
    return null;
  }, [api]);

  const applyVoiceFormEmissionPrefill = useCallback(async () => {
    const examPayload = consumeVoiceFormPrefill("exam_request");
    if (examPayload) {
      const d = examPayload.data as ExamRequestPrefill;
      setView("exam");
      setVoicePrefillActive(true);
      setExamTemplatePrefill({
        templateId: "",
        items: d.examItems || [],
        notes: d.notes || "",
        cid: d.cid || "",
        title: d.title || "",
      });
      await resolveVoicePatient(examPayload.patientRecordId, examPayload.patientName);
      toast.success(
        lang === "es"
          ? "Pedido de examen completado por voz. Revise antes de guardar."
          : lang === "en"
            ? "Exam request prefilled by voice. Review before saving."
            : "Pedido de exame preenchido por voz. Confira antes de salvar.",
      );
      return true;
    }

    const docPayload = consumeVoiceFormPrefill("clinical_document");
    if (docPayload) {
      const d = docPayload.data as ClinicalDocumentPrefill;
      setView("document");
      setVoicePrefillActive(true);
      setDocTemplatePrefill({
        body: d.body || "",
        templateId: "",
        documentType: d.documentType || "CERTIFICATE",
        title: d.title || "",
      });
      await resolveVoicePatient(docPayload.patientRecordId, docPayload.patientName);
      toast.success(
        lang === "es"
          ? "Documento completado por voz. Revise antes de guardar."
          : lang === "en"
            ? "Document prefilled by voice. Review before saving."
            : "Documento preenchido por voz. Confira antes de salvar.",
      );
      return true;
    }
    return false;
  }, [lang, resolveVoicePatient, toast]);

  useEffect(() => {
    void (async () => {
      if (await applyVoiceFormEmissionPrefill()) return;
      await applyVoicePrefill();
    })();
  }, [pathname, searchParams, applyVoicePrefill, applyVoiceFormEmissionPrefill]);

  useEffect(() => {
    const onVoicePrefill = () => {
      void (async () => {
        if (await applyVoiceFormEmissionPrefill()) return;
        await applyVoicePrefill();
      })();
    };
    window.addEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
    window.addEventListener(VOICE_FORM_PREFILL_EVENT, onVoicePrefill);
    return () => {
      window.removeEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
      window.removeEventListener(VOICE_FORM_PREFILL_EVENT, onVoicePrefill);
    };
  }, [applyVoicePrefill, applyVoiceFormEmissionPrefill]);

  useEffect(() => {
    fetchAll();
    if (!cfg.skipDigitalSign) loadSignConfig();
    void loadCharts();
    const params = new URLSearchParams(window.location.search);
    const { patientRecordId, returnUrl, view: viewParam } = readChartDeepLink();

    if (returnUrl) setConsultReturnUrl(returnUrl);
    if (patientRecordId && returnUrl) setLockPatient(true);

    const protocolId = params.get("protocol");
    if (protocolId && !patientRecordId) {
      setPendingProtocolId(protocolId);
      setView("prescription");
      window.history.replaceState({}, "", window.location.pathname);
    }

    const hasReuseDeepLink = !!(params.get("reuse") || params.get("reuseDoc"));

    if (patientRecordId && !hasReuseDeepLink) {
      (async () => {
        await loadCharts();
        const recordsRes = await fetch(api("/records"));
        const recordsData = await recordsRes.json();
        const chart = (recordsData.records || []).find((c: Chart) => c.id === patientRecordId) || null;
        if (!chart) return;
        setSelectedPatient(chart as Chart);
        setReusePatient(chart as Chart);
        const v = viewParam as View | null;
        if (v === "prescription" || (!cfg.prescriptionsOnly && (v === "exam" || v === "document"))) {
          setView(v);
        } else {
          setView("prescription");
        }
      })();
    }

    if (params.get("add") === "phytotherapy") {
      setView("prescription");
      setItemSearchMode("phytotherapy");
      setFloralOnlyMode(false);
      const mnSlug = params.get("mnSlug");
      if (mnSlug) {
        void (async () => {
          try {
            const res = await fetch(apiPath(cfg, `/medicina-natural/${encodeURIComponent(mnSlug)}`));
            const data = await res.json();
            if (!data.item) return;
            const item = data.item as {
              slug: string;
              nome: string;
              posologia: string;
              indicacoes: string;
              renisus?: boolean;
            };
            setMedications((prev) => {
              if (prev.some((m) => m.mnSlug === item.slug)) return prev;
              return [
                ...prev,
                {
                  name: item.nome,
                  dosage: "",
                  frequency: "",
                  duration: "",
                  instructions: [item.posologia, item.indicacoes].filter(Boolean).join("\n\n").slice(0, 2000),
                  itemKind: "phytotherapy" as const,
                  mnSlug: item.slug,
                  renisus: item.renisus,
                },
              ];
            });
            setFreeTextMode(true);
          } catch {
            /* prefill optional */
          }
        })();
      } else if (!patientRecordId) {
        setMedications((prev) => {
          if (prev.some((m) => m.itemKind === "phytotherapy")) return prev;
          return [
            ...prev,
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
              itemKind: "phytotherapy" as const,
            },
          ];
        });
      }
    }

    if (params.get("add") === "floral") {
      setView("prescription");
      setItemSearchMode("floral");
      setFloralOnlyMode(true);
      const mnSlug = params.get("mnSlug");
      if (mnSlug) {
        void (async () => {
          try {
            const res = await fetch(apiPath(cfg, `/medicina-natural/${encodeURIComponent(mnSlug)}`));
            const data = await res.json();
            if (!data.item) return;
            const item = data.item as {
              slug: string;
              nome: string;
              posologia: string;
              indicacoes: string;
              renisus?: boolean;
            };
            setMedications((prev) => {
              if (prev.some((m) => m.mnSlug === item.slug && m.itemKind === "floral")) return prev;
              return [
                ...prev,
                {
                  name: item.nome,
                  dosage: item.posologia?.slice(0, 200) || "4 gotas, 4x/dia",
                  frequency: "",
                  duration: "",
                  instructions: item.indicacoes?.slice(0, 2000) || "",
                  itemKind: "floral" as const,
                  mnSlug: item.slug,
                  renisus: item.renisus,
                },
              ];
            });
          } catch {
            /* prefill optional */
          }
        })();
      } else if (!patientRecordId) {
      const starter = params.get("starter");
      const templateId = params.get("templateId");
      const floralProduct = params.get("floralProduct");
      if (starter) {
        setPendingStarterId(starter);
      } else if (templateId) {
        setPendingTemplateId(templateId);
      } else if (floralProduct && floralProductByValue(floralProduct)) {
        setPendingFloralProductId(floralProduct);
      } else {
        setMedications((prev) => {
          if (prev.some((m) => m.itemKind === "floral")) return prev;
          return [
            ...prev,
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
              itemKind: "floral" as const,
            },
          ];
        });
      }
      }
    }

    for (const addKey of ["homeopathy", "aromatherapy", "apitherapy", "cannabis"] as const) {
      if (params.get("add") !== addKey) continue;
      setView("prescription");
      setItemSearchMode(addKey);
      setFloralOnlyMode(false);
      const mnSlug = params.get("mnSlug");
      const itemKind = MN_ADD_PARAM_TO_ITEM_KIND[addKey];
      if (mnSlug) {
        void (async () => {
          try {
            const res = await fetch(apiPath(cfg, `/medicina-natural/${encodeURIComponent(mnSlug)}`));
            const data = await res.json();
            if (!data.item) return;
            const item = data.item as {
              slug: string;
              nome: string;
              posologia: string;
              indicacoes: string;
              renisus?: boolean;
            };
            setMedications((prev) => {
              if (prev.some((m) => m.mnSlug === item.slug && m.itemKind === itemKind)) return prev;
              return [
                ...prev,
                {
                  name: item.nome,
                  dosage: item.posologia?.slice(0, 200) || "",
                  frequency: "",
                  duration: "",
                  instructions: [item.posologia, item.indicacoes].filter(Boolean).join("\n\n").slice(0, 2000),
                  itemKind,
                  mnSlug: item.slug,
                  renisus: item.renisus,
                },
              ];
            });
            setFreeTextMode(isFreeTextPrescriptionItem(itemKind));
          } catch {
            /* prefill optional */
          }
        })();
      } else if (!patientRecordId) {
        setMedications((prev) => {
          if (prev.some((m) => m.itemKind === itemKind)) return prev;
          return [
            ...prev,
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
              itemKind,
            },
          ];
        });
        setFreeTextMode(isFreeTextPrescriptionItem(itemKind));
      }
    }

    const docTemplateId = params.get("docTemplateId");
    const rxTemplateId = params.get("templateId");

    // Wait for template fetch/apply before opening the form — otherwise ExamCreateView /
    // DocumentCreateView mount with empty initial state and never pick up the prefill.
    if (docTemplateId && !patientRecordId) {
      setLoadingDocTemplate(true);
      setPendingDocTemplateId(docTemplateId);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (rxTemplateId && !patientRecordId && params.get("add") !== "floral") {
      setPendingTemplateId(rxTemplateId);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const sign = params.get("sign");
    const flow = params.get("flow");
    const kind = params.get("kind") as EmissionKind | null;
    const id = params.get("id");

    if (flow === "deliver" && sign === "success" && kind && id) {
      (async () => {
        const patient = await loadEmissionPatient(kind, id);
        setSavedEmission({
          kind,
          id,
          label: "",
          patient: patient ?? {
            id: "",
            firstName: "",
            lastName: "",
            email: null,
            hasAccount: false,
          },
        });
        setPostSaveStep("deliver");
        fetchAll();
        window.history.replaceState({}, "", window.location.pathname);
      })();
    } else if (sign === "processing") {
      setSignProcessing(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (sign && sign !== "success") {
      setSignResult(sign);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSignResult(null), 6000);
    } else if (sign === "success" && !flow) {
      setSignResult("success");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSignResult(null), 6000);
    }
  }, []);

  useEffect(() => {
    if (!pendingStarterId) return;
    const resolved = resolveFloralStarter(pendingStarterId, lang);
    if (resolved) {
      setMedications(resolved.medications);
      setInstructions(resolved.instructions);
      setValidDays(resolved.validDays);
      setView("prescription");
    }
    setPendingStarterId(null);
  }, [pendingStarterId, lang]);

  useEffect(() => {
    if (!pendingTemplateId) return;
    const tpl = rxTemplates.find((x) => x.id === pendingTemplateId);
    if (!tpl) return;
    applyRxTemplate(tpl);
    setView("prescription");
    setTemplateAppliedHint(true);
    setPendingTemplateId(null);
  }, [pendingTemplateId, rxTemplates]);

  useEffect(() => {
    if (!pendingDocTemplateId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/professional/templates/documents?previewId=${encodeURIComponent(pendingDocTemplateId)}&locale=${encodeURIComponent(locale)}`,
        );
        const data = await res.json();
        const tpl = data.template as {
          id: string;
          documentType?: string | null;
          templateCategory: string | null;
          title: string;
          body: string;
        } | undefined;
        if (!tpl) return;

        const category = resolveDocumentTemplateCategory(tpl);
        if (category && isExamTemplateCategory(category)) {
          const parsed = parseExamTemplateBody(tpl.body);
          setExamTemplatePrefill({
            templateId: tpl.id,
            items: parsed.items,
            notes: parsed.notes || "",
            cid: parsed.cid || "",
            cidLabel: parsed.cidLabel || "",
            title: tpl.title || t("rx.examDefaultTitle"),
          });
          setView("exam");
          setTemplateAppliedHint(true);
        } else if (category === TEMPLATE_CATEGORIES.CERTIFICATE || tpl.documentType === "CERTIFICATE") {
          setDocTemplatePrefill({
            body: data.preview?.body || tpl.body,
            templateId: tpl.id,
            documentType: tpl.documentType || "CERTIFICATE",
            title: tpl.title,
          });
          setView("document");
          setTemplateAppliedHint(true);
        }
      } catch {
        /* ignore */
      } finally {
        setPendingDocTemplateId(null);
        setLoadingDocTemplate(false);
      }
    })();
  }, [pendingDocTemplateId, locale, t]);

  useEffect(() => {
    if (!pendingFloralProductId) return;
    const product = floralProductByValue(pendingFloralProductId);
    if (!product) {
      setPendingFloralProductId(null);
      return;
    }
    setMedications([
      {
        name: t(product.labelKey),
        dosage: "4 gotas, 4x/dia",
        frequency: "",
        duration: "",
        instructions: "",
        itemKind: "floral",
        floralProductId: pendingFloralProductId,
      },
    ]);
    setView("prescription");
    setFloralOnlyMode(true);
    setPendingFloralProductId(null);
  }, [pendingFloralProductId, t]);

  useEffect(() => {
    if (!pendingProtocolId) return;
    const preset = getIntegrativeProtocolPreset(pendingProtocolId);
    if (!preset) {
      setPendingProtocolId(null);
      return;
    }

    void (async () => {
      const meds: MedItem[] = [];
      for (const item of preset.items) {
        if (item.kind === "floral") {
          const product = floralProductByValue(item.floralProductId);
          meds.push({
            name: product ? t(product.labelKey) : item.floralProductId,
            dosage: item.dosage || "",
            frequency: item.frequency || "",
            duration: item.duration || "",
            instructions: "",
            itemKind: "floral",
            floralProductId: item.floralProductId,
          });
          continue;
        }

        try {
          const res = await fetch(apiPath(cfg, `/medicina-natural/${encodeURIComponent(item.mnSlug)}`));
          const data = await res.json();
          const mn = data.item as {
            slug: string;
            nome: string;
            posologia: string;
            indicacoes: string;
            renisus?: boolean;
          } | undefined;
          meds.push({
            name: mn?.nome || item.mnSlug,
            dosage: item.dosage || mn?.posologia?.slice(0, 200) || "",
            frequency: item.frequency || "",
            duration: item.duration || "",
            instructions: mn
              ? [mn.posologia, mn.indicacoes].filter(Boolean).join("\n\n").slice(0, 2000)
              : "",
            itemKind: item.itemKind,
            mnSlug: mn?.slug || item.mnSlug,
            renisus: mn?.renisus,
          });
        } catch {
          meds.push({
            name: item.mnSlug,
            dosage: item.dosage || "",
            frequency: item.frequency || "",
            duration: item.duration || "",
            instructions: "",
            itemKind: item.itemKind,
            mnSlug: item.mnSlug,
          });
        }
      }

      setMedications(meds);
      if (preset.instructions) setInstructions(preset.instructions);
      if (preset.validDays) setValidDays(preset.validDays);
      setItemSearchMode(preset.add);
      setFloralOnlyMode(preset.add === "floral");
      setFreeTextMode(preset.items.some((i) => i.kind === "mn" && isFreeTextPrescriptionItem(i.itemKind)));
      setView("prescription");
      setTemplateAppliedHint(true);
      setPendingProtocolId(null);
    })();
  }, [pendingProtocolId, cfg, t]);

  async function loadEmissionPatient(kind: EmissionKind, id: string): Promise<Chart | null> {
    try {
      const [chartsRes, rxRes, docRes] = await Promise.all([
        fetch(api("/records")),
        kind === "prescription" ? fetch(api("/prescriptions")) : Promise.resolve(null),
        kind !== "prescription" && !cfg.prescriptionsOnly ? fetch(api("/documents/issued")) : Promise.resolve(null),
      ]);
      const chartsData = await chartsRes.json();
      const chartsList: Chart[] = chartsData.records || [];

      if (kind === "prescription" && rxRes) {
        const rxData = await rxRes.json();
        const p = (rxData.prescriptions || []).find((x: Prescription) => x.id === id);
        if (!p) return null;
        if (p.patientRecordId) {
          return chartsList.find((c) => c.id === p.patientRecordId) || null;
        }
        if (p.document?.patient) {
          const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
          return chartsList.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target) || {
            id: "",
            firstName: p.document.patient.firstName,
            lastName: p.document.patient.lastName,
            email: null,
            hasAccount: true,
          };
        }
        return null;
      }

      if (docRes) {
        const docData = await docRes.json();
        const d = (docData.documents || []).find((x: ClinicalDocument) => x.id === id);
        if (!d) return null;
        if (d.patientRecordId) {
          return chartsList.find((c) => c.id === d.patientRecordId) || null;
        }
        if (d.document?.patient) {
          return {
            id: "",
            firstName: d.document.patient.firstName,
            lastName: d.document.patient.lastName,
            email: null,
            hasAccount: true,
          };
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch(api("/prescriptions"), { credentials: "same-origin" }),
        fetch(api("/templates/prescriptions"), { credentials: "same-origin" }),
      ];
      if (!cfg.prescriptionsOnly) {
        requests.splice(1, 0, fetch(api("/documents/issued"), { credentials: "same-origin" }));
      }
      const results = await Promise.all(requests);
      const rxRes = results[0];
      const tplRes = results[cfg.prescriptionsOnly ? 1 : 2];
      const docRes = cfg.prescriptionsOnly ? null : results[1];
      const rxData = await rxRes.json();
      const tplData = await tplRes.json();
      setPrescriptions(rxData.prescriptions || []);
      if (docRes) {
        const docData = await docRes.json();
        setClinicalDocs(docData.documents || []);
      } else {
        setClinicalDocs([]);
      }
      if (tplRes.ok) setRxTemplates(tplData.templates || []);
    } finally { setLoading(false); }
  }

  async function fetchPrescriptions() { await fetchAll(); }

  async function loadSignConfig() {
    try {
      const res = await fetch(api("/digital-sign"));
      setSignConfig(await res.json());
    } catch { /* ignore */ }
  }

  async function searchPatients(q: string) {
    setChartsLoading(true);
    try {
      const res = await fetch(`${api("/records/search")}?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (res.ok) {
        setCharts(d.records || []);
        setImportablePatients(d.importable || []);
        setPlatformMatches(d.platformMatches || []);
      }
    } catch { /* ignore */ }
    finally { setChartsLoading(false); }
  }

  async function loadCharts() {
    await searchPatients("");
  }

  async function importPatientChart(item: ImportablePatient) {
    setImportingPatientId(item.patientProfileId);
    try {
      const res = await fetch(api("/records/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientProfileId: item.patientProfileId }),
      });
      const data = await res.json();
      if (res.ok) {
        const chart: Chart = {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? item.email,
          hasAccount: true,
          missingForRx: data.missingForRx,
        };
        setSelectedPatient(chart);
        setPlatformTarget(null);
        setPatientQuery("");
        setPatientPickerOpen(false);
        await searchPatients("");
      } else if (res.status === 403 && data.code === "LINK_REQUIRED") {
        setFormError(t("link.requiredImport"));
      }
    } catch { /* ignore */ }
    finally { setImportingPatientId(null); }
  }

  async function requestPatientLink(match: PlatformMatch) {
    setRequestingLinkId(match.patientUserId);
    try {
      const res = await fetch(api("/patient-links"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientUserId: match.patientUserId }),
      });
      if (res.ok) {
        await searchPatients(patientQuery);
      }
    } finally {
      setRequestingLinkId(null);
    }
  }

  function selectPlatformForRx(match: PlatformMatch) {
    setPlatformTarget({
      patientUserId: match.patientUserId,
      patientProfileId: match.patientProfileId,
      displayName: match.displayName,
      linkStatus: match.linkStatus,
    });
    setSelectedPatient(null);
    setPatientPickerOpen(false);
    setPatientQuery("");
  }

  function resetForm() {
    setSelectedPatient(null);
    setPlatformTarget(null);
    setPatientQuery("");
    setImportablePatients([]);
    setPlatformMatches([]);
    setDrugQuery(""); setDrugResults([]); setMnSearchResults([]); setDrugCountry("BR"); setDrugSearchDone(false); setDrugSearchModalOpen(false); setMedications([]);
    setItemSearchMode("medication"); setMnPickerTargetIndex(null);
    setHighlightIncompleteMeds(false);
    setInstructions(""); setValidDays(30); setFormError("");
    setControlledFormKind("simple");
    setReuseSource(null);
    setEditingPrescriptionId(null);
    setEditingClinicalDocId(null);
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setFreeTextMode(false);
    setBulkPasteText("");
    setDraftRestoredHint(false);
  }

  function buildPrescriptionDraft(): PrescriptionFormDraft {
    return {
      medications,
      instructions,
      validDays,
      controlledFormKind,
      freeTextMode,
      itemSearchMode,
      floralOnlyMode,
      bulkPasteText,
      showBulkPaste,
      drugCountry,
      selectedPatient: selectedPatient
        ? {
            id: selectedPatient.id,
            firstName: selectedPatient.firstName,
            lastName: selectedPatient.lastName,
            email: selectedPatient.email,
            hasAccount: selectedPatient.hasAccount,
          }
        : null,
      platformTarget,
      editingPrescriptionId,
      lockPatient,
      consultReturnUrl,
    };
  }

  function applyPrescriptionDraft(draft: PrescriptionFormDraft) {
    suppressDraftSaveRef.current = true;
    setMedications(draft.medications.map((m) => ({ ...m })));
    setInstructions(draft.instructions || "");
    setValidDays(typeof draft.validDays === "number" ? draft.validDays : 30);
    setControlledFormKind(draft.controlledFormKind || "simple");
    setFreeTextMode(!!draft.freeTextMode);
    setItemSearchMode(draft.itemSearchMode || "medication");
    setFloralOnlyMode(!!draft.floralOnlyMode);
    setBulkPasteText(draft.bulkPasteText || "");
    setShowBulkPaste(!!draft.showBulkPaste);
    setDrugCountry(draft.drugCountry || "BR");
    setSelectedPatient(
      draft.selectedPatient
        ? {
            id: draft.selectedPatient.id,
            firstName: draft.selectedPatient.firstName,
            lastName: draft.selectedPatient.lastName,
            email: draft.selectedPatient.email,
            hasAccount: draft.selectedPatient.hasAccount,
          }
        : null,
    );
    setPlatformTarget(draft.platformTarget);
    setEditingPrescriptionId(draft.editingPrescriptionId);
    setEditingClinicalDocId(null);
    setLockPatient(!!draft.lockPatient);
    setConsultReturnUrl(draft.consultReturnUrl);
    setFormError("");
    setDraftPending(false);
    setDraftRestoredHint(true);
    queueMicrotask(() => {
      suppressDraftSaveRef.current = false;
    });
  }

  function discardPrescriptionDraft() {
    if (userId) clearPrescriptionDraft(userId, portal);
    setDraftPending(false);
    setDraftRestoredHint(false);
  }

  function discardExamDraft() {
    if (userId) clearExamDraft(userId, portal);
    setExamDraftPending(false);
  }

  function discardDocumentDraft() {
    if (userId) clearDocumentDraft(userId, portal);
    setDocumentDraftPending(false);
  }

  function refreshPendingDrafts() {
    if (!userId) return;
    setDraftPending(hasPrescriptionDraft(userId, portal));
    setExamDraftPending(hasExamDraft(userId, portal));
    setDocumentDraftPending(hasDocumentDraft(userId, portal));
  }

  function continuePrescriptionDraft() {
    if (!userId) return;
    const draft = loadPrescriptionDraft(userId, portal);
    if (!draft || isPrescriptionDraftEmpty(draft)) {
      setDraftPending(false);
      return;
    }
    applyPrescriptionDraft(draft);
    setView("prescription");
    void loadCharts();
  }

  async function continueExamDraft() {
    setReuseClinical(null);
    setReusePatient(null);
    setExamTemplatePrefill(null);
    setTemplateAppliedHint(false);
    setExamDraftPending(false);
    setView("exam");
    await loadCharts();
  }

  async function continueDocumentDraft() {
    setReuseClinical(null);
    setReusePatient(null);
    setDocTemplatePrefill(null);
    setTemplateAppliedHint(false);
    setDocumentDraftPending(false);
    setView("document");
    await loadCharts();
  }

  useEffect(() => {
    if (!userId || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const hasDeepLink = !!(
        params.get("patientRecordId") ||
        params.get("returnUrl") ||
        params.get("reuse") ||
        params.get("reuseDoc") ||
        params.get("add") ||
        params.get("protocol") ||
        params.get("starter") ||
        params.get("templateId") ||
        params.get("floralProduct") ||
        params.get("view")
      );
      if (hasDeepLink) return;
      refreshPendingDrafts();
    } catch {
      /* ignore */
    }
  }, [userId, portal]);

  useEffect(() => {
    if (!userId || suppressDraftSaveRef.current) return;
    if (view !== "prescription" || savedEmission) return;

    const draft = buildPrescriptionDraft();
    const timer = window.setTimeout(() => {
      savePrescriptionDraft(userId, portal, draft);
      setDraftPending(!isPrescriptionDraftEmpty(draft));
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot fields listed below
  }, [
    userId,
    portal,
    view,
    savedEmission,
    medications,
    instructions,
    validDays,
    controlledFormKind,
    freeTextMode,
    itemSearchMode,
    floralOnlyMode,
    bulkPasteText,
    showBulkPaste,
    drugCountry,
    selectedPatient,
    platformTarget,
    editingPrescriptionId,
    lockPatient,
    consultReturnUrl,
  ]);

  function handleEmissionSaved(emission: SavedEmission) {
    if (userId) {
      if (emission.kind === "prescription") {
        clearPrescriptionDraft(userId, portal);
        setDraftPending(false);
      } else if (emission.kind === "exam") {
        clearExamDraft(userId, portal);
        setExamDraftPending(false);
      } else if (emission.kind === "document") {
        clearDocumentDraft(userId, portal);
        setDocumentDraftPending(false);
      }
    }
    setDraftRestoredHint(false);
    setSavedEmission(emission);
    setEditingPrescriptionId(null);
    setEditingClinicalDocId(null);
    if (cfg.skipDigitalSign) {
      setPostSaveStep("deliver");
    } else if (
      (emission.kind === "prescription" && emission.medications?.length) ||
      (emission.kind === "exam" && emission.examItems?.length) ||
      (emission.kind === "document" && emission.documentBody?.trim())
    ) {
      setPostSaveStep("review");
    } else {
      setPostSaveStep("choose");
    }
    setPostSaveShareUrl("");
    fetchAll();
  }

  function finishPostSave() {
    if (userId) {
      // Only the emission that was just completed was cleared on save;
      // refresh banners for any other in-progress drafts.
      refreshPendingDrafts();
    }
    const returnTo =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("returnTo")
        : null;
    setDraftRestoredHint(false);
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setEditingPrescriptionId(null);
    setEditingClinicalDocId(null);
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    if (returnTo && returnTo.startsWith("/")) {
      window.location.href = returnTo;
      return;
    }
    fetchAll();
  }

  function editSavedEmission() {
    const emission = savedEmission;
    if (!emission) return;

    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");

    if (emission.kind === "prescription") {
      setEditingPrescriptionId(emission.id);
      setEditingClinicalDocId(null);
      const meds = (emission.medications || []).map((m) => ({
        ...m,
        name: m.name ?? "",
        dosage: m.dosage ?? "",
        frequency: m.frequency ?? "",
        duration: m.duration ?? "",
        instructions: m.instructions ?? "",
      })) as MedItem[];
      setMedications(meds);
      setInstructions(emission.instructions || "");
      if (meds.some((m) => isFreeTextPrescriptionItem(m.itemKind))) {
        setFreeTextMode(true);
      }
      if (emission.patient.id) {
        setSelectedPatient(emission.patient);
      }
      setView("prescription");
      void loadCharts();
      return;
    }

    setEditingClinicalDocId(emission.id);
    setEditingPrescriptionId(null);
    setReusePatient(emission.patient);
    if (emission.kind === "exam") {
      setReuseClinical({
        id: emission.id,
        type: "EXAM_REQUEST",
        title: emission.label,
        createdAt: new Date().toISOString(),
        examItems: emission.examItems || [],
        examNotes: emission.examNotes || "",
        patientRecordId: emission.patient.id || null,
        document: { patient: emission.patient },
      });
      setView("exam");
      void loadCharts();
      return;
    }

    setReusePatient(emission.patient);
    void (async () => {
      try {
        const res = await fetch(api(`/documents/${emission.id}`));
        const data = await res.json();
        if (res.ok && data.document) {
          await openReuseClinical(data.document as ClinicalDocument, { editing: true });
        } else {
          setReuseClinical({
            id: emission.id,
            type: "CERTIFICATE",
            title: emission.label,
            createdAt: new Date().toISOString(),
            content: emission.documentBody || "",
            patientRecordId: emission.patient.id || null,
            document: { patient: emission.patient },
          });
          setView("document");
        }
      } catch {
        setView("document");
      }
      await loadCharts();
    })();
  }

  async function openCreate() {
    if (userId) {
      const draft = loadPrescriptionDraft(userId, portal);
      if (draft && !isPrescriptionDraftEmpty(draft)) {
        applyPrescriptionDraft(draft);
        setView("prescription");
        await loadCharts();
        return;
      }
    }
    resetForm();
    setShowBulkPaste(true);
    setControlledFormKind("simple");
    setView("prescription");
    await loadCharts();
  }

  async function openCreateReceitaB() {
    if (!sncrStatus?.controlledAvailable) {
      toast.error(t("rx.sncrAuthPlatformUnavailable"));
      return;
    }
    discardPrescriptionDraft();
    resetForm();
    setControlledFormKind("B");
    setValidDays(defaultValidDaysForFormKind("B"));
    setDrugCountry("BR");
    setItemSearchMode("medication");
    setFloralOnlyMode(false);
    setShowBulkPaste(false);
    setView("prescription");
    await loadCharts();
  }

  async function openCreateReceitaControleEspecial() {
    if (!sncrStatus?.controlledAvailable) {
      toast.error(t("rx.sncrAuthPlatformUnavailable"));
      return;
    }
    discardPrescriptionDraft();
    resetForm();
    setControlledFormKind("C");
    setValidDays(defaultValidDaysForFormKind("C"));
    setDrugCountry("BR");
    setItemSearchMode("medication");
    setFloralOnlyMode(false);
    setShowBulkPaste(false);
    setView("prescription");
    await loadCharts();
  }

  async function openExamCreate() {
    setReuseClinical(null);
    setReusePatient(null);
    setExamTemplatePrefill(null);
    setTemplateAppliedHint(false);
    setExamDraftPending(false);
    setView("exam");
    await loadCharts();
  }

  async function openDocumentCreate() {
    setReuseClinical(null);
    setReusePatient(null);
    setDocTemplatePrefill(null);
    setTemplateAppliedHint(false);
    setDocumentDraftPending(false);
    setView("document");
    await loadCharts();
  }

  async function resolvePatientChart(patientRecordId?: string | null, patient?: { firstName: string; lastName: string } | null) {
    const recordsRes = await fetch(api("/records"));
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);
    if (patientRecordId) {
      return records.find((c) => c.id === patientRecordId) || null;
    }
    if (patient) {
      const target = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target) || null;
    }
    return null;
  }

  async function openReuseClinical(d: ClinicalDocument, opts?: { editing?: boolean }) {
    if (isExamDocType(d.type)) {
      discardExamDraft();
    } else {
      discardDocumentDraft();
    }
    setReuseClinical(d);
    if (opts?.editing) {
      setEditingClinicalDocId(d.id);
    } else {
      setEditingClinicalDocId(null);
    }
    const chart = await resolvePatientChart(d.patientRecordId, d.document?.patient);
    setReusePatient(chart);
    setView(isExamDocType(d.type) ? "exam" : "document");
  }

  function closeCreate() {
    // Draft already autosaved — keep it so the professional can continue later.
    if (userId) {
      if (view === "prescription") {
        const draft = buildPrescriptionDraft();
        savePrescriptionDraft(userId, portal, draft);
      }
      refreshPendingDrafts();
    }
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    setExamTemplatePrefill(null);
    setDocTemplatePrefill(null);
    setTemplateAppliedHint(false);
    setLoadingDocTemplate(false);
    fetchAll();
  }

  function signPrescription(p: Prescription) {
    if (p.signatureStatus === "PENDING") return;
    const label = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
      : t("rx.patient");
    setSignTarget({ kind: "prescription", id: p.id, label });
  }

  function signClinicalDoc(d: ClinicalDocument) {
    if (d.signatureStatus === "PENDING") return;
    const label = d.title;
    setSignTarget({ kind: emissionKindFromDoc(d.type), id: d.id, label });
  }

  async function openReuse(p: Prescription) {
    discardPrescriptionDraft();
    resetForm();
    setReuseSource(p);
    setView("prescription");
    await loadCharts();

    const meds = (p.medications as MedItem[]).map((m) => {
      if (m.frequency === "Continuous use" || m.continuousUse) {
        return {
          ...m,
          continuousUse: true,
          frequency: m.frequency === "Continuous use" ? "" : m.frequency,
        };
      }
      return { ...m };
    });
    setMedications(meds);
    if (p.instructions) setInstructions(p.instructions);
    if (meds.some((m) => isFreeTextPrescriptionItem(m.itemKind))) {
      setFreeTextMode(true);
    }

    const recordsRes = await fetch(api("/records"));
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);

    const { patientRecordId: deepLinkChartId } = readChartDeepLink();
    const targetChartId = deepLinkChartId || p.patientRecordId;
    if (targetChartId) {
      const chart = records.find((c) => c.id === targetChartId);
      if (chart) setSelectedPatient(chart);
    } else if (p.document?.patient) {
      const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
      const chart = records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target);
      if (chart) setSelectedPatient(chart);
    }
  }

  useEffect(() => {
    const reuseRxId = searchParams.get("reuse");
    const reuseDocId = searchParams.get("reuseDoc");
    const editDocId = searchParams.get("editDoc");
    if (!reuseRxId && !reuseDocId && !editDocId) return;

    let cancelled = false;

    function stripReuseParams() {
      const params = new URLSearchParams(window.location.search);
      params.delete("reuse");
      params.delete("reuseDoc");
      params.delete("editDoc");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );
    }

    void (async () => {
      try {
        if (reuseRxId) {
          const res = await fetch(api(`/prescriptions/${reuseRxId}`));
          const data = await res.json();
          if (cancelled) return;
          if (res.ok && data.prescription) {
            await openReuse(data.prescription as Prescription);
          }
          return;
        }

        const clinicalId = editDocId || reuseDocId;
        if (clinicalId) {
          const res = await fetch(api(`/documents/${clinicalId}`));
          const data = await res.json();
          if (cancelled) return;
          if (res.ok && data.document) {
            await openReuseClinical(data.document as ClinicalDocument, {
              editing: !!editDocId,
            });
          }
        }
      } catch {
        /* optional deep link */
      } finally {
        if (!cancelled) stripReuseParams();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const showPatientPicker = patientPickerOpen && !selectedPatient;

  useEffect(() => {
    if (!patientPickerOpen && !patientQuery.trim()) return;
    if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
    patientSearchDebounce.current = setTimeout(() => {
      void searchPatients(patientQuery);
    }, 250);
    return () => {
      if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
    };
  }, [patientQuery, patientPickerOpen]);

  const searchDrugs = useCallback(async () => {
    const q = drugQuery.trim();
    if (q.length < 2) return;
    if (isControlledRxFormMode(controlledFormKind) && mnSearchCategoria) {
      return;
    }
    setDrugSearchModalOpen(true);
    setDrugSearching(true);
    setDrugSearchDone(false);
    setDrugResults([]);
    setMnSearchResults([]);
    try {
      if (floralCatalogSearch) {
        const items = await fetchMnByCategoriaForPrescription(cfg.apiBase, q, "FLORAL");
        setMnSearchResults(items);
        setDrugResults(mapMnItemsToDrugResults(items, "floral"));
      } else if (mnSearchCategoria) {
        const items = await fetchMnByCategoriaForPrescription(cfg.apiBase, q, mnSearchCategoria);
        setMnSearchResults(items);
        setDrugResults(mapMnItemsToDrugResults(items, mnSearchModeForUi));
      } else {
        const country = isControlledRxFormMode(controlledFormKind) ? "BR" : drugCountry;
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}&country=${country}`;
        const res = await fetch(url);
        const d = await res.json();
        if (!res.ok) {
          toast.error(typeof d.error === "string" ? d.error : t("rx2.noDrugsFound"));
          setDrugResults([]);
        } else {
          let drugs: DrugSearchResult[] = d.drugs || [];
          if (isControlledRxFormMode(controlledFormKind)) {
            drugs = drugs.filter((drug) =>
              validateDrugForControlledForm(drug.prescriptionType, controlledFormKind).ok,
            );
          }
          setDrugResults(drugs);
        }
      }
    } catch {
      toast.error(t("rx2.noDrugsFound"));
      setDrugResults([]);
    } finally {
      setDrugSearching(false);
      setDrugSearchDone(true);
    }
  }, [drugQuery, drugCountry, controlledFormKind, floralCatalogSearch, mnSearchCategoria, mnSearchModeForUi, cfg.apiBase, t, toast]);

  function closeDrugSearchModal() {
    setDrugSearchModalOpen(false);
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchDone(false);
    setMnPickerTargetIndex(null);
    setLeafletTarget(null);
    setLeafletDrug(null);
    setLeafletMnItem(null);
  }

  function closeLeafletPanel() {
    setLeafletTarget(null);
    setLeafletDrug(null);
    setLeafletMnItem(null);
  }

  function viewDrugLeaflet(drug: DrugSearchResult) {
    if (mnSearchCategoria) {
      const item = mnSearchResults.find((i) => i.slug === drug.id);
      if (item) {
        viewMnLeaflet(item);
        return;
      }
    }
    setLeafletDrug(drug);
    setLeafletMnItem(null);
    setLeafletTarget({ kind: "drug", drugId: drug.id, displayName: drug.name });
  }

  function viewMnLeaflet(item: MedicinaNaturalListItem) {
    setLeafletMnItem(item);
    setLeafletDrug(null);
    setLeafletTarget({ kind: "mn", slug: item.slug, displayName: item.nome });
  }

  function insertLeafletPosology(excerpt: string) {
    const dosage = excerpt.trim();
    if (!dosage) return;

    if (leafletMnItem) {
      const mode: PrescriptionItemSearchMode =
        floralOnlyMode ? "floral" : itemSearchMode === "medication" ? "phytotherapy" : itemSearchMode;
      const item = mnMedItemFromListItemForMode(leafletMnItem, mode);
      applyMnCatalogItem({ ...item, dosage });
      closeLeafletPanel();
      return;
    }

    if (leafletDrug) {
      if (mnSearchCategoria) {
        const mode: PrescriptionItemSearchMode =
          floralOnlyMode ? "floral" : itemSearchMode === "medication" ? "phytotherapy" : itemSearchMode;
        const item = mnMedItemFromDrugResultForMode(leafletDrug, mode);
        applyMnCatalogItem({ ...item, dosage });
      } else {
        if (isControlledRxFormMode(controlledFormKind)) {
          const validation = validateDrugForControlledForm(leafletDrug.prescriptionType, controlledFormKind);
          if (!validation.ok) {
            toast.error(t(validation.messageKey));
            return;
          }
        }
        setFreeTextMode(false);
        const substance = leafletDrug.activeIngredient?.trim() || leafletDrug.name;
        setMedications((prev) => [...prev, {
          name: substance,
          dosage,
          frequency: "",
          duration: "",
          instructions: "",
          presentation: leafletDrug.presentation,
          pharmaceuticalForm: leafletDrug.pharmaceuticalForm?.trim() || "",
          controlled: leafletDrug.controlled,
          prescriptionType: leafletDrug.prescriptionType,
          itemKind: cfg.phytoOnly ? "phytotherapy" as const : "medication",
        }]);
        setDrugQuery("");
        setDrugResults([]);
        setMnSearchResults([]);
        setDrugSearchModalOpen(false);
        setMnPickerTargetIndex(null);
      }
      closeLeafletPanel();
    }
  }

  function applyMnCatalogItem(item: PrescriptionMedItem) {
    setFreeTextMode(isFreeTextPrescriptionItem(item.itemKind));
    if (mnPickerTargetIndex !== null) {
      setMedications((prev) =>
        prev.map((m, i) => (i === mnPickerTargetIndex ? { ...m, ...item } : m)),
      );
    } else {
      setMedications((prev) => [...prev, item]);
    }
    setDrugQuery("");
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchModalOpen(false);
    setMnPickerTargetIndex(null);
  }

  function addDrug(drug: DrugSearchResult) {
    if (isControlledRxFormMode(controlledFormKind)) {
      const validation = validateDrugForControlledForm(drug.prescriptionType, controlledFormKind);
      if (!validation.ok) {
        toast.error(t(validation.messageKey));
        return;
      }
    } else if (mnSearchCategoria) {
      const mode: PrescriptionItemSearchMode =
        floralOnlyMode ? "floral" : itemSearchMode === "medication" ? "phytotherapy" : itemSearchMode;
      applyMnCatalogItem(mnMedItemFromDrugResultForMode(drug, mode));
      return;
    }
    setFreeTextMode(false);
    const substance = drug.activeIngredient?.trim() || drug.name;
    setMedications((prev) => [...prev, {
      name: substance,
      dosage: drug.dosage?.trim() || "",
      frequency: "",
      duration: "",
      instructions: "",
      presentation: drug.presentation,
      pharmaceuticalForm: drug.pharmaceuticalForm?.trim() || "",
      controlled: drug.controlled,
      prescriptionType: drug.prescriptionType,
      itemKind: cfg.phytoOnly ? "phytotherapy" as const : "medication",
    }]);
    setDrugQuery("");
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchModalOpen(false);
  }

  function flagIncompleteMeds(): void {
    setHighlightIncompleteMeds(true);
    setFormError(t("rx2.incompleteItems"));
  }

  function addManual() {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledManualBlocked"));
      return;
    }
    setFreeTextMode(false);
    const name = drugQuery.trim();
    setMedications((prev) => [...prev, {
      name: name || "",
      dosage: "", frequency: "", duration: "", instructions: "",
      itemKind: mnCatalogSearch
        ? (floralOnlyMode
          ? "floral"
          : itemSearchMode === "medication"
            ? "phytotherapy"
            : itemSearchMode)
        : "medication",
    }]);
    setDrugQuery(""); setDrugResults([]); setMnSearchResults([]); setDrugSearchModalOpen(false);
  }

  function openMnSearchForIndex(index: number) {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledIntegrativeBlocked"));
      return;
    }
    const med = medications[index];
    const kind = (med.itemKind || "phytotherapy") as MnAddItemKind;
    const mode: PrescriptionItemSearchMode = MN_RX_SEARCH_TABS.some((tab) => tab.mode === kind)
      ? kind
      : "phytotherapy";
    setItemSearchMode(mode);
    setFloralOnlyMode(mode === "floral");
    setMnPickerTargetIndex(index);
    setDrugQuery("");
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchDone(false);
  }

  function addSpecialItem(kind: "device" | MnAddItemKind) {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledIntegrativeBlocked"));
      return;
    }
    if (kind === "device") {
      setFreeTextMode(true);
      setMedications((prev) => [...prev, {
        name: "", dosage: "", frequency: "", duration: "", instructions: "", itemKind: "device",
      }]);
      return;
    }
    if (isFreeTextPrescriptionItem(kind)) setFreeTextMode(true);
    setItemSearchMode(kind);
    setFloralOnlyMode(kind === "floral");
    setMedications((prev) => [...prev, {
      name: "", dosage: "", frequency: "", duration: "", instructions: "", itemKind: kind,
    }]);
  }

  function importBulkMedications() {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledManualBlocked"));
      return;
    }
    const parsed = parseBulkMedicationLines(
      bulkPasteText,
      freeTextMode ? "device" : "medication",
    );
    if (parsed.length === 0) {
      setFormError(t("rx.bulkPaste.empty"));
      return;
    }
    setMedications((prev) => [...prev, ...parsed]);
    setBulkPasteText("");
    setShowBulkPaste(false);
    setFormError("");
  }

  function startFreeTextPrescription() {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledManualBlocked"));
      return;
    }
    setFreeTextMode(true);
    setMedications([{
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      itemKind: "device",
    }]);
    setShowBulkPaste(false);
    setBulkPasteText("");
    setFormError("");
    setHighlightIncompleteMeds(false);
  }

  function applyFreeTextPrescription() {
    if (isControlledRxFormMode(controlledFormKind)) {
      toast.error(t("rx.controlledManualBlocked"));
      return;
    }
    const parsed = parseBulkMedicationLines(bulkPasteText, "device");
    if (parsed.length === 0) {
      setFormError(t("rx.bulkPaste.empty"));
      return;
    }
    setFreeTextMode(true);
    setMedications(parsed);
    setBulkPasteText("");
    setShowBulkPaste(false);
    setFormError("");
  }

  function removeMedication(index: number) { setMedications((prev) => prev.filter((_, i) => i !== index)); }
  const updateMedication: PrescriptionMedItemUpdateHandler = (index, field, value) => {
    setMedications((prev) => prev.map((m, i) => {
      if (i !== index) return m;
      if (field === "continuousUse") {
        const checked = value === true;
        return {
          ...m,
          continuousUse: checked,
          duration: checked ? "" : m.duration,
          frequency: checked && m.frequency === "Continuous use" ? "" : m.frequency,
        };
      }
      return { ...m, [field]: value };
    }));
  };

  function selectFloralProduct(index: number, productId: string) {
    const product = floralProductByValue(productId);
    setMedications((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              floralProductId: productId,
              name: product && productId !== "floral_custom" ? t(product.labelKey) : m.name,
              dosage: m.dosage || (productId.startsWith("bach_") || productId.startsWith("sg") ? "4 gotas, 4x/dia" : m.dosage),
            }
          : m,
      ),
    );
  }

  function applyRxTemplate(tpl: RxTemplate) {
    setMedications((tpl.medications as MedItem[]).map((m) => ({ ...m })));
    setInstructions(tpl.instructions || "");
    setValidDays(tpl.validDays || 30);
    setReuseSource(null);
  }

  async function saveAsRxTemplate() {
    if (!isMedsFormValid(medications)) {
      flagIncompleteMeds();
      return;
    }
    setHighlightIncompleteMeds(false);
    const name = window.prompt(t("tmpl.rxNamePrompt"));
    if (!name?.trim()) return;
    setSavingTemplate(true);
    setFormError("");
    try {
      await extendSessionForWrite(updateSession);
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration,
        instructions: m.instructions,
        continuousUse: m.continuousUse || undefined,
        presentation: m.presentation || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "",
        itemKind: m.itemKind || "medication",
        mnSlug: m.mnSlug || undefined,
        renisus: m.renisus || undefined,
        phytoProductId: m.phytoProductId || undefined,
        floralProductId: m.floralProductId || undefined,
      }));
      const res = await fetch(api("/templates/prescriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          medications: cleanMeds,
          instructions,
          validDays,
        }),
      });
      const data = await res.json();
      if (isAuthFailureStatus(res.status)) {
        setFormError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
        return;
      }
      if (!res.ok) throw new Error(data.error || t("tmpl.saveError"));
      setRxTemplates((prev) => [data, ...prev]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("tmpl.saveError"));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function executeSubmit(opts: { cannabisTcleAccepted: boolean }) {
    setHighlightIncompleteMeds(false);
    setSaving(true);
    try {
      await extendSessionForWrite(updateSession);
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration,
        instructions: m.instructions,
        continuousUse: m.continuousUse || undefined,
        presentation: m.presentation || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "",
        itemKind: m.itemKind || "medication",
        mnSlug: m.mnSlug || undefined,
        renisus: m.renisus || undefined,
        phytoProductId: m.phytoProductId || undefined,
        floralProductId: m.floralProductId || undefined,
        prescriptionType: m.prescriptionType || undefined,
        controlled: m.controlled || undefined,
      }));

      const finalInstructions = instructions.trim();
      const payload = selectedPatient
        ? {
            [cfg.patientRecordField]: selectedPatient.id,
            medications: cleanMeds,
            instructions: finalInstructions,
            validDays,
            cannabisTcleAccepted: opts.cannabisTcleAccepted || undefined,
            issuedViaTelemedicine: consultReturnUrl ? true : undefined,
          }
        : {
            patientUserId: platformTarget!.patientUserId,
            medications: cleanMeds,
            instructions: finalInstructions,
            validDays,
            cannabisTcleAccepted: opts.cannabisTcleAccepted || undefined,
            issuedViaTelemedicine: consultReturnUrl ? true : undefined,
          };
      const res = await fetch(
        editingPrescriptionId
          ? api(`/prescriptions/${editingPrescriptionId}`)
          : api("/prescriptions"),
        {
          method: editingPrescriptionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const prescriptions = (data.prescriptions || []) as {
          id: string;
          formKind: string;
          label: string;
          sncrReceiptNumber?: string | null;
          medications: typeof cleanMeds;
        }[];
        const primary = prescriptions[0] || { id: data.prescriptionId, formKind: "SIMPLE", label: t("rx.newPrescription"), medications: cleanMeds };
        const label = selectedPatient
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : platformTarget!.displayName;
        const platformName = platformTarget ? splitDisplayName(platformTarget.displayName) : null;
        const patientForSave: Chart = selectedPatient ?? {
          id: "",
          firstName: platformName!.firstName,
          lastName: platformName!.lastName,
          email: null,
          hasAccount: true,
        };
        handleEmissionSaved({
          kind: "prescription",
          id: primary.id,
          patient: patientForSave,
          label: data.isMixed ? t("rx.package.emissionLabel") : label,
          medications: primary.medications,
          instructions: finalInstructions || undefined,
          prescriptionFormKind: primary.formKind,
          packageId: data.packageId || null,
          packageDocuments: prescriptions.length > 1
            ? prescriptions.map((p) => ({
                id: p.id,
                formKind: p.formKind,
                label: p.label,
                medications: p.medications,
                sncrReceiptNumber: p.sncrReceiptNumber,
              }))
            : undefined,
        });
        setEditingPrescriptionId(null);
        setPhytoInteractionConfirmed(false);
        setCannabisTcleAccepted(false);
      } else if (res.status === 428) {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx.sncrAuthRequired"));
        if (d.sncrLoginPath && !d.needsSncrPlatform) {
          window.location.href = d.sncrLoginPath;
        }
      } else if (isAuthFailureStatus(res.status)) {
        setFormError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx2.needMeds"));
      }
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient && !platformTarget) { setFormError(t("rx2.needPatient")); return; }
    if (!isMedsFormValid(medications)) {
      flagIncompleteMeds();
      return;
    }

    const splitPreview = splitPrescriptionMedications(
      medications.map((m) => ({
        ...m,
        name: m.name.trim(),
        prescriptionType: m.prescriptionType,
        controlled: m.controlled,
      })),
      lang.startsWith("es") ? "es" : lang.startsWith("en") ? "en" : "pt",
    );
    if (!splitPreview.ok) {
      setFormError(splitPreview.error);
      return;
    }

    const splitHasControlled = splitPreview.groups.some((g) => g.formKind !== "SIMPLE");
    if (
      !sncrStatus?.controlledAvailable &&
      (splitHasControlled || isControlledRxFormMode(controlledFormKind))
    ) {
      setFormError(t("rx.controlledPrescriptionUnavailable"));
      return;
    }

    if (controlledFormKind === "B" || controlledFormKind === "C") {
      for (const m of medications) {
        const validation = validateDrugForControlledForm(m.prescriptionType, controlledFormKind);
        if (m.name.trim() && !validation.ok) {
          setFormError(t(validation.messageKey));
          return;
        }
      }
    }

    const cleanMeds = medications.map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      duration: m.duration,
      instructions: m.instructions,
      continuousUse: m.continuousUse || undefined,
      presentation: m.presentation || "",
      pharmaceuticalForm: m.pharmaceuticalForm || "",
      itemKind: m.itemKind || "medication",
      mnSlug: m.mnSlug || undefined,
      renisus: m.renisus || undefined,
      phytoProductId: m.phytoProductId || undefined,
      floralProductId: m.floralProductId || undefined,
    }));

    const herbNames = extractMnHerbNames(cleanMeds);
    const drugNames = cleanMeds
      .filter((m) => (m.itemKind || "medication") === "medication")
      .map((m) => m.name.trim())
      .filter(Boolean);
    const warnings = checkPhytoDrugInteractions(herbNames, drugNames);
    if (warnings.length > 0 && !phytoInteractionConfirmed) {
      setPhytoWarnings(warnings);
      setPhytoConfirmOpen(true);
      return;
    }

    if (medicationListHasCannabis(cleanMeds) && !cannabisTcleAccepted) {
      setCannabisTcleOpen(true);
      return;
    }

    await executeSubmit({ cannabisTcleAccepted });
  }

  function confirmPhytoInteraction() {
    setPhytoConfirmOpen(false);
    setPhytoInteractionConfirmed(true);
    if (medicationListHasCannabis(medications) && !cannabisTcleAccepted) {
      setCannabisTcleOpen(true);
      return;
    }
    void executeSubmit({ cannabisTcleAccepted });
  }

  function acceptCannabisTcle() {
    setCannabisTcleAccepted(true);
    setCannabisTcleOpen(false);
    void executeSubmit({ cannabisTcleAccepted: true });
  }

  const hasMixedRegulatoryPrescription = (() => {
    const buckets = new Set(
      medications.map((m) => classifyMedicationItem(m)),
    );
    const regulatory = ["NRB", "RCE", "SIMPLE"].filter((b) =>
      buckets.has(b as "NRB" | "RCE" | "SIMPLE"),
    );
    return regulatory.length > 1;
  })();

  const hasMixedPrescription =
    medicationListHasIntegrativeItems(medications) &&
    medicationListHasConventionalDrugs(medications);

  const filtered = prescriptions.filter((p) => {
    if (listFilter === "exam" || listFilter === "document") return false;
    const name = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase() : "";
    return name.includes(search.toLowerCase());
  });

  const recentPrescriptions = prescriptions.slice(0, 8);
  const recentClinical = clinicalDocs.slice(0, 8);
  const todayLabel = new Date().toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  const filteredClinical = clinicalDocs.filter((d) => {
    const name = d.document?.patient
      ? `${d.document.patient.firstName} ${d.document.patient.lastName}`.toLowerCase() : "";
    const matchSearch = name.includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (listFilter === "exam") return isExamDocType(d.type);
    if (listFilter === "document") return !isExamDocType(d.type);
    if (listFilter === "prescription") return false;
    return true;
  });

  const showPrescriptionList = listFilter === "all" || listFilter === "prescription";
  const showClinicalList = listFilter === "all" || listFilter === "exam" || listFilter === "document";

  return {
    t,
    lang,
    locale,
    cfg,
    accountHref,
    canPrescribeCannabis,
    toast,
    view,
    savedEmission,
    postSaveStep,
    postSaveShareUrl,
    signConfig,
    finishPostSave,
    editSavedEmission,
    editingPrescriptionId,
    editingClinicalDocId,
    consultReturnUrl,
    clearConsultReturnUrl,
    reusePatient,
    reuseClinical,
    templateAppliedHint,
    lockPatient,
    examTemplatePrefill,
    docTemplatePrefill,
    loadingDocTemplate,
    charts,
    chartsLoading,
    handleEmissionSaved,
    closeCreate,
    voicePrefillActive,
    reuseSource,
    rxTemplates,
    floralOnlyMode,
    medications,
    highlightIncompleteMeds,
    instructions,
    validDays,
    formError,
    saving,
    savingTemplate,
    todayLabel,
    showPatientPicker,
    importablePatients,
    platformMatches,
    selectedPatient,
    platformTarget,
    patientQuery,
    importingPatientId,
    requestingLinkId,
    setPatientQuery,
    setPatientPickerOpen,
    setSelectedPatient,
    setPlatformTarget,
    importPatientChart,
    requestPatientLink,
    selectPlatformForRx,
    drugQuery,
    drugResults,
    drugSearching,
    drugSearchDone,
    drugSearchModalOpen,
    drugCountry,
    itemSearchMode,
    mnSearchResults,
    mnCatalogSearch,
    mnSearchModeForUi,
    freeTextMode,
    bulkPasteText,
    showBulkPaste,
    setDrugQuery,
    searchDrugs,
    closeDrugSearchModal,
    addManual,
    startFreeTextPrescription,
    setShowBulkPaste,
    setBulkPasteText,
    importBulkMedications,
    applyFreeTextPrescription,
    addSpecialItem,
    setItemSearchMode,
    setFloralOnlyMode,
    setDrugCountry,
    setDrugResults,
    setDrugSearchDone,
    setDrugSearchModalOpen,
    setMnSearchResults,
    setMnPickerTargetIndex,
    leafletTarget,
    closeLeafletPanel,
    viewDrugLeaflet,
    viewMnLeaflet,
    insertLeafletPosology,
    addDrug,
    applyMnCatalogItem,
    applyRxTemplate,
    updateMedication,
    openMnSearchForIndex,
    selectFloralProduct,
    removeMedication,
    setInstructions,
    setValidDays,
    saveAsRxTemplate,
    handleSubmit,
    loading,
    search,
    setSearch,
    listFilter,
    setListFilter,
    showAllHistory,
    setShowAllHistory,
    signProcessing,
    signResult,
    signTarget,
    setSignTarget,
    filtered,
    filteredClinical,
    recentPrescriptions,
    recentClinical,
    showPrescriptionList,
    showClinicalList,
    openCreate,
    openCreateReceitaB,
    openCreateReceitaControleEspecial,
    openExamCreate,
    openDocumentCreate,
    openReuse,
    openReuseClinical,
    draftPending,
    examDraftPending,
    documentDraftPending,
    draftRestoredHint,
    continuePrescriptionDraft,
    discardPrescriptionDraft,
    continueExamDraft,
    discardExamDraft,
    continueDocumentDraft,
    discardDocumentDraft,
    signPrescription,
    signClinicalDoc,
    fetchPrescriptions,
    fetchAll,
    phytoConfirmOpen,
    phytoWarnings,
    setPhytoConfirmOpen,
    confirmPhytoInteraction,
    cannabisTcleOpen,
    setCannabisTcleOpen,
    acceptCannabisTcle,
    hasMixedPrescription,
    hasMixedRegulatoryPrescription,
    controlledFormKind,
    sncrStatus,
    openSncrLogin: () => {
      if (!sncrStatus?.controlledAvailable) {
        toast.error(t("rx.sncrAuthPlatformUnavailable"));
        return;
      }
      window.location.href = "/api/professional/sncr/auth/login";
    },
  };
}
