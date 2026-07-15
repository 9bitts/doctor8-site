"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// Memed-style prescription UI: reuse, manual add, recent carousel.

import { RX_STYLES } from "@/components/professional/emissions/EmissionsSignModal";
import { ExamCreateView } from "@/components/professional/emissions/ExamCreateView";
import { DocumentCreateView } from "@/components/professional/emissions/DocumentCreateView";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import { mnMedItemFromListItemForMode, type PrescriptionItemSearchMode } from "@/lib/medicina-natural-catalog/prescription-search";
import { PostSaveFlow } from "./components/PostSaveFlow";
import { PrescriptionForm } from "./components/PrescriptionForm";
import { PrescriptionsHub } from "./components/PrescriptionsHub";
import { usePrescriptionPage } from "./components/usePrescriptionPage";
import CannabisMedicinalTcleModal from "@/components/integrative-medicine/CannabisMedicinalTcleModal";
import PhytoInteractionConfirmModal from "@/components/integrative-medicine/PhytoInteractionConfirmModal";

export default function PrescriptionsPage() {
  const p = usePrescriptionPage();

  if (p.savedEmission) {
    return (
      <PostSaveFlow
        savedEmission={p.savedEmission}
        t={p.t}
        lang={p.lang}
        signConfig={p.signConfig}
        postSaveStep={p.postSaveStep}
        postSaveShareUrl={p.postSaveShareUrl}
        onDone={p.finishPostSave}
        onEdit={p.editSavedEmission}
        deliveryOnly={p.cfg.skipDigitalSign}
        apiBase={p.cfg.apiBase}
      />
    );
  }

  if (p.view === "exam") {
    return (
      <>
        <VideoConsultReturnBanner returnUrl={p.consultReturnUrl} patientName={p.reusePatient ? `${p.reusePatient.firstName} ${p.reusePatient.lastName}` : undefined} lang={p.lang as "pt" | "en" | "es"} />
        <ExamCreateView
          t={p.t} locale={p.locale} charts={p.charts} chartsLoading={p.chartsLoading}
          reuseHint={!!p.reuseClinical}
          templateHint={p.templateAppliedHint}
          initialPatient={p.reusePatient}
          lockPatient={p.lockPatient}
          initialItems={p.examTemplatePrefill?.items || p.reuseClinical?.examItems || []}
          initialNotes={p.examTemplatePrefill?.notes || p.reuseClinical?.examNotes || ""}
          initialCid={p.examTemplatePrefill?.cid || p.reuseClinical?.cid || ""}
          initialTitle={p.examTemplatePrefill?.title || p.reuseClinical?.title || ""}
          editingDocumentId={p.editingClinicalDocId}
          onBack={p.closeCreate}
          onSaved={p.handleEmissionSaved}
        />
        <style>{RX_STYLES}</style>
      </>
    );
  }

  if (p.view === "document") {
    return (
      <>
        <VideoConsultReturnBanner returnUrl={p.consultReturnUrl} patientName={p.reusePatient ? `${p.reusePatient.firstName} ${p.reusePatient.lastName}` : undefined} lang={p.lang as "pt" | "en" | "es"} />
        <DocumentCreateView
          t={p.t} charts={p.charts} chartsLoading={p.chartsLoading}
          reuseHint={!!p.reuseClinical}
          templateHint={p.templateAppliedHint}
          initialPatient={p.reusePatient}
          lockPatient={p.lockPatient}
          initialBody={p.docTemplatePrefill?.body || p.reuseClinical?.content || ""}
          initialType={p.docTemplatePrefill?.documentType || p.reuseClinical?.type || "CERTIFICATE"}
          initialTemplateId={p.docTemplatePrefill?.templateId || null}
          editingDocumentId={p.editingClinicalDocId}
          onBack={p.closeCreate}
          onSaved={p.handleEmissionSaved}
        />
        <style>{RX_STYLES}</style>
      </>
    );
  }

  if (p.view === "prescription") {
    return (
      <>
        <PrescriptionForm
          t={p.t}
          lang={p.lang}
          cfg={p.cfg}
          consultReturnUrl={p.consultReturnUrl}
          templateAppliedHint={p.templateAppliedHint}
          voicePrefillActive={p.voicePrefillActive}
          reuseSource={p.reuseSource}
          rxTemplates={p.rxTemplates}
          floralOnlyMode={p.floralOnlyMode}
          allowFloral={p.cfg.allowFloral}
          medications={p.medications}
          highlightIncompleteMeds={p.highlightIncompleteMeds}
          instructions={p.instructions}
          validDays={p.validDays}
          formError={p.formError}
          saving={p.saving}
          savingTemplate={p.savingTemplate}
          patientPickerProps={{
            t: p.t,
            todayLabel: p.todayLabel,
            cfg: p.cfg,
            lockPatient: p.lockPatient,
            showPatientPicker: p.showPatientPicker,
            charts: p.charts,
            chartsLoading: p.chartsLoading,
            importablePatients: p.importablePatients,
            platformMatches: p.platformMatches,
            selectedPatient: p.selectedPatient,
            platformTarget: p.platformTarget,
            patientQuery: p.patientQuery,
            importingPatientId: p.importingPatientId,
            requestingLinkId: p.requestingLinkId,
            onPatientQueryChange: p.setPatientQuery,
            onPatientPickerOpen: () => p.setPatientPickerOpen(true),
            onPatientPickerClose: () => p.setPatientPickerOpen(false),
            onSelectPatient: (c) => {
              p.setSelectedPatient(c);
              p.setPlatformTarget(null);
              p.setPatientPickerOpen(false);
              p.setPatientQuery("");
            },
            onClearSelectedPatient: () => {
              p.setSelectedPatient(null);
              p.setPatientQuery("");
            },
            onClearPlatformTarget: () => p.setPlatformTarget(null),
            onImportPatient: p.importPatientChart,
            onRequestLink: p.requestPatientLink,
            onSelectPlatformForRx: p.selectPlatformForRx,
          }}
          medicationSearchProps={{
            t: p.t,
            cfg: p.cfg,
            canPrescribeCannabis: p.canPrescribeCannabis,
            controlledFormKind: p.controlledFormKind,
            drugQuery: p.drugQuery,
            drugResults: p.drugResults,
            drugSearching: p.drugSearching,
            drugSearchDone: p.drugSearchDone,
            drugSearchModalOpen: p.drugSearchModalOpen,
            drugCountry: p.drugCountry,
            itemSearchMode: p.itemSearchMode,
            mnSearchResults: p.mnSearchResults,
            floralOnlyMode: p.floralOnlyMode,
            mnCatalogSearch: p.mnCatalogSearch,
            mnSearchModeForUi: p.mnSearchModeForUi,
            freeTextMode: p.freeTextMode,
            bulkPasteText: p.bulkPasteText,
            showBulkPaste: p.showBulkPaste,
            onDrugQueryChange: p.setDrugQuery,
            onSearchDrugs: () => void p.searchDrugs(),
            onCloseDrugSearchModal: p.closeDrugSearchModal,
            onAddManual: p.addManual,
            onStartFreeTextPrescription: p.startFreeTextPrescription,
            onToggleBulkPaste: () => p.setShowBulkPaste((v) => !v),
            onBulkPasteTextChange: p.setBulkPasteText,
            onImportBulkMedications: p.importBulkMedications,
            onApplyFreeTextPrescription: p.applyFreeTextPrescription,
            onAddSpecialItem: p.addSpecialItem,
            onSetItemSearchMode: (mode) => {
              p.setItemSearchMode(mode);
              p.setMnPickerTargetIndex(null);
            },
            onSetFloralOnlyMode: p.setFloralOnlyMode,
            onSetDrugCountry: (code) => {
              p.setDrugCountry(code);
              p.setDrugQuery("");
              p.setDrugResults([]);
              p.setDrugSearchDone(false);
              p.setDrugSearchModalOpen(false);
            },
            onClearDrugSearch: () => {
              p.setDrugQuery("");
              p.setDrugResults([]);
              p.setMnSearchResults([]);
              p.setMnPickerTargetIndex(null);
            },
            onAddDrug: p.addDrug,
            onMnListItemSelect: (item) => {
              const mode: PrescriptionItemSearchMode = p.floralOnlyMode
                ? "floral"
                : p.itemSearchMode === "medication"
                  ? "phytotherapy"
                  : p.itemSearchMode;
              p.applyMnCatalogItem(mnMedItemFromListItemForMode(item, mode));
            },
            leafletTarget: p.leafletTarget,
            onViewDrugLeaflet: p.viewDrugLeaflet,
            onViewMnLeaflet: p.viewMnLeaflet,
            onCloseLeafletPanel: p.closeLeafletPanel,
            onInsertLeafletPosology: p.insertLeafletPosology,
          }}
          onClose={p.closeCreate}
          onApplyRxTemplate={p.applyRxTemplate}
          onUpdateMedication={p.updateMedication}
          onOpenMnSearchForIndex={p.openMnSearchForIndex}
          onSelectFloralProduct={p.selectFloralProduct}
          onRemoveMedication={p.removeMedication}
          onInstructionsChange={p.setInstructions}
          onValidDaysChange={p.setValidDays}
          onSaveAsRxTemplate={p.saveAsRxTemplate}
          onSubmit={p.handleSubmit}
          hasMixedPrescription={p.hasMixedPrescription}
          hasMixedRegulatoryPrescription={p.hasMixedRegulatoryPrescription}
          controlledPrescriptionsAvailable={p.sncrStatus?.controlledAvailable ?? false}
          controlledFormKind={p.controlledFormKind}
        />
        <PhytoInteractionConfirmModal
          open={p.phytoConfirmOpen}
          warnings={p.phytoWarnings}
          onClose={() => p.setPhytoConfirmOpen(false)}
          onConfirm={p.confirmPhytoInteraction}
        />
        <CannabisMedicinalTcleModal
          open={p.cannabisTcleOpen}
          onClose={() => p.setCannabisTcleOpen(false)}
          onAccept={p.acceptCannabisTcle}
        />
        <style>{RX_STYLES}</style>
      </>
    );
  }

  return (
    <>
      <PrescriptionsHub
        t={p.t}
        locale={p.locale}
        cfg={p.cfg}
        accountHref={p.accountHref}
        loading={p.loading}
        search={p.search}
        listFilter={p.listFilter}
        showAllHistory={p.showAllHistory}
        signProcessing={p.signProcessing}
        signResult={p.signResult}
        signConfig={p.signConfig}
        signTarget={p.signTarget}
        filtered={p.filtered}
        filteredClinical={p.filteredClinical}
        recentPrescriptions={p.recentPrescriptions}
        recentClinical={p.recentClinical}
        showPrescriptionList={p.showPrescriptionList}
        showClinicalList={p.showClinicalList}
        onSearchChange={p.setSearch}
        onListFilterChange={p.setListFilter}
        onShowAllHistory={p.setShowAllHistory}
        onOpenCreate={p.openCreate}
        onOpenReceitaB={p.openCreateReceitaB}
        onOpenReceitaControleEspecial={p.openCreateReceitaControleEspecial}
        onOpenExamCreate={p.openExamCreate}
        onOpenDocumentCreate={p.openDocumentCreate}
        onOpenReuse={p.openReuse}
        onOpenReuseClinical={p.openReuseClinical}
        onSignPrescription={p.signPrescription}
        onSignClinicalDoc={p.signClinicalDoc}
        onPdfError={(msg) => p.toast.error(msg)}
        onRefreshPrescriptions={p.fetchPrescriptions}
        onRefreshAll={p.fetchAll}
        onCloseSignModal={() => p.setSignTarget(null)}
        sncrStatus={p.sncrStatus}
        onSncrLogin={p.openSncrLogin}
      />
      <style>{RX_STYLES}</style>
    </>
  );
}
