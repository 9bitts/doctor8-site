"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useToast } from "@/components/ui/toast";
import { type SignTarget, type EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import { readChartDeepLink } from "@/lib/video-chart-nav";
import {
  isExamTemplateCategory,
  parseExamTemplateBody,
  TEMPLATE_CATEGORIES,
} from "@/lib/clinical-template-utils";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import type { Chart } from "@/components/professional/emissions/types";
import { type DrugCountryCode } from "@/lib/drug-countries";
import { type DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import { type PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
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
} from "@/lib/medicina-natural/phyto-interactions";
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
import { consumeVoicePrefill } from "@/lib/voice-assistant/prefill-storage";
import { VOICE_PRESCRIPTION_PREFILL_EVENT } from "@/lib/voice-assistant/types";
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
} from "./shared";
import { type SavedEmission } from "@/components/professional/emissions/EmissionPostSaveFlow";

export function usePrescriptionPage() {
  const { t, lang } = useI18n();
  const { update: updateSession } = useSession();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const [signConfig, setSignConfig] = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signProcessing, setSignProcessing] = useState(false);

  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lockPatient, setLockPatient] = useState(false);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);
  const [pendingStarterId, setPendingStarterId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingDocTemplateId, setPendingDocTemplateId] = useState<string | null>(null);
  const [examTemplatePrefill, setExamTemplatePrefill] = useState<{
    items: string[];
    notes: string;
    cid: string;
    title: string;
  } | null>(null);
  const [docTemplatePrefill, setDocTemplatePrefill] = useState<{
    body: string;
    templateId: string;
  } | null>(null);
  const [templateAppliedHint, setTemplateAppliedHint] = useState(false);
  const [pendingFloralProductId, setPendingFloralProductId] = useState<string | null>(null);
  const [voicePrefillActive, setVoicePrefillActive] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);

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

  useEffect(() => {
    void applyVoicePrefill();
  }, [pathname, searchParams, applyVoicePrefill]);

  useEffect(() => {
    const onVoicePrefill = () => {
      void applyVoicePrefill();
    };
    window.addEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
    return () => window.removeEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
  }, [applyVoicePrefill]);

  useEffect(() => {
    fetchAll();
    if (!cfg.skipDigitalSign) loadSignConfig();
    void loadCharts();
    const params = new URLSearchParams(window.location.search);
    const { patientRecordId, returnUrl, view: viewParam } = readChartDeepLink();

    if (returnUrl) setConsultReturnUrl(returnUrl);
    if (patientRecordId && returnUrl) setLockPatient(true);

    if (patientRecordId) {
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

    for (const addKey of ["homeopathy", "aromatherapy", "apitherapy"] as const) {
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
    const viewFromUrl = params.get("view") as View | null;

    if (docTemplateId && !patientRecordId) {
      setPendingDocTemplateId(docTemplateId);
      if (viewFromUrl === "exam" || viewFromUrl === "document") {
        setView(viewFromUrl);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (rxTemplateId && !patientRecordId && params.get("add") !== "floral") {
      setPendingTemplateId(rxTemplateId);
      if (viewFromUrl === "prescription") {
        setView("prescription");
      }
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
    if (tpl) {
      applyRxTemplate(tpl);
      setView("prescription");
      setTemplateAppliedHint(true);
      setPendingTemplateId(null);
    }
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
          templateCategory: string | null;
          title: string;
          body: string;
        } | undefined;
        if (!tpl) return;

        if (isExamTemplateCategory(tpl.templateCategory)) {
          const parsed = parseExamTemplateBody(tpl.body);
          setExamTemplatePrefill({
            items: parsed.items,
            notes: parsed.notes || "",
            cid: parsed.cid || "",
            title: tpl.title || t("rx.examDefaultTitle"),
          });
          setView("exam");
          setTemplateAppliedHint(true);
        } else if (tpl.templateCategory === TEMPLATE_CATEGORIES.CERTIFICATE) {
          setDocTemplatePrefill({
            body: data.preview?.body || tpl.body,
            templateId: tpl.id,
          });
          setView("document");
          setTemplateAppliedHint(true);
        }
      } catch {
        /* ignore */
      } finally {
        setPendingDocTemplateId(null);
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
    setReuseSource(null);
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setFreeTextMode(false);
    setBulkPasteText("");
  }

  function handleEmissionSaved(emission: SavedEmission) {
    setSavedEmission(emission);
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
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    fetchAll();
  }

  async function openCreate() {
    resetForm();
    setShowBulkPaste(true);
    setView("prescription");
    await loadCharts();
  }

  async function openExamCreate() {
    setReuseClinical(null);
    setReusePatient(null);
    setView("exam");
    await loadCharts();
  }

  async function openDocumentCreate() {
    setReuseClinical(null);
    setReusePatient(null);
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

  async function openReuseClinical(d: ClinicalDocument) {
    setReuseClinical(d);
    const chart = await resolvePatientChart(d.patientRecordId, d.document?.patient);
    setReusePatient(chart);
    setView(isExamDocType(d.type) ? "exam" : "document");
  }

  function closeCreate() {
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    setExamTemplatePrefill(null);
    setDocTemplatePrefill(null);
    setTemplateAppliedHint(false);
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
    resetForm();
    setReuseSource(p);
    setView("prescription");
    await loadCharts();

    const meds = (p.medications as MedItem[]).map((m) => ({ ...m }));
    setMedications(meds);
    if (p.instructions) setInstructions(p.instructions);

    const recordsRes = await fetch(api("/records"));
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);

    if (p.patientRecordId) {
      const chart = records.find((c) => c.id === p.patientRecordId);
      if (chart) setSelectedPatient(chart);
    } else if (p.document?.patient) {
      const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
      const chart = records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target);
      if (chart) setSelectedPatient(chart);
    }
  }

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
    setDrugSearchModalOpen(true);
    setDrugSearching(true);
    setDrugSearchDone(false);
    setDrugResults([]);
    setMnSearchResults([]);
    try {
      if (floralCatalogSearch) {
        const items = await fetchMnByCategoriaForPrescription(cfg.apiBase, q, "FLORAL");
        setMnSearchResults(items);
        setDrugResults(mapMnItemsToDrugResults(items));
      } else if (mnSearchCategoria) {
        const items = await fetchMnByCategoriaForPrescription(cfg.apiBase, q, mnSearchCategoria);
        setMnSearchResults(items);
        setDrugResults(mapMnItemsToDrugResults(items));
      } else {
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}&country=${drugCountry}`;
        const res = await fetch(url);
        const d = await res.json();
        if (!res.ok) {
          toast.error(typeof d.error === "string" ? d.error : t("rx2.noDrugsFound"));
          setDrugResults([]);
        } else {
          setDrugResults(d.drugs || []);
        }
      }
    } catch {
      toast.error(t("rx2.noDrugsFound"));
      setDrugResults([]);
    } finally {
      setDrugSearching(false);
      setDrugSearchDone(true);
    }
  }, [drugQuery, drugCountry, floralCatalogSearch, mnSearchCategoria, cfg.apiBase, t, toast]);

  function closeDrugSearchModal() {
    setDrugSearchModalOpen(false);
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchDone(false);
    setMnPickerTargetIndex(null);
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
    if (mnSearchCategoria) {
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
  }

  function flagIncompleteMeds(): void {
    setHighlightIncompleteMeds(true);
    setFormError(t("rx2.incompleteItems"));
  }

  function addManual() {
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
  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

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

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient && !platformTarget) { setFormError(t("rx2.needPatient")); return; }
    if (!isMedsFormValid(medications)) {
      flagIncompleteMeds();
      return;
    }
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
      const phytoWarnings = checkPhytoDrugInteractions(herbNames, drugNames);
      if (phytoWarnings.length > 0) {
        toast.error(phytoWarnings.map((w) => w.description).join(" Â· "));
      }

      const payload = selectedPatient
        ? { [cfg.patientRecordField]: selectedPatient.id, medications: cleanMeds, instructions, validDays }
        : { patientUserId: platformTarget!.patientUserId, medications: cleanMeds, instructions, validDays };
      const res = await fetch(api("/prescriptions"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const label = selectedPatient
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : platformTarget!.displayName;
        const patientForSave: Chart = selectedPatient ?? {
          id: "",
          firstName: platformTarget!.displayName.split(" ")[0] || platformTarget!.displayName,
          lastName: "",
          email: null,
          hasAccount: true,
        };
        handleEmissionSaved({
          kind: "prescription",
          id: data.prescriptionId,
          patient: patientForSave,
          label,
          medications: cleanMeds,
          instructions: instructions.trim() || undefined,
        });
      } else if (isAuthFailureStatus(res.status)) {
        setFormError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx2.needMeds"));
      }
    } finally { setSaving(false); }
  }

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
    toast,
    view,
    savedEmission,
    postSaveStep,
    postSaveShareUrl,
    signConfig,
    finishPostSave,
    consultReturnUrl,
    reusePatient,
    reuseClinical,
    templateAppliedHint,
    lockPatient,
    examTemplatePrefill,
    docTemplatePrefill,
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
    openExamCreate,
    openDocumentCreate,
    openReuse,
    openReuseClinical,
    signPrescription,
    signClinicalDoc,
    fetchPrescriptions,
    fetchAll,
  };
}
