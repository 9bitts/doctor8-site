import { EmissionPostSaveFlow, type SavedEmission } from "@/components/professional/emissions/EmissionPostSaveFlow";
import { RX_STYLES } from "@/components/professional/emissions/EmissionsSignModal";

export type PostSaveFlowProps = {
  savedEmission: SavedEmission;
  t: (k: string) => string;
  lang: string;
  signConfig: { configured: boolean; provider: string; cpfMasked: string } | null;
  postSaveStep: "review" | "choose" | "deliver" | "success";
  postSaveShareUrl: string;
  onDone: () => void;
  onEdit?: () => void;
  deliveryOnly: boolean;
  apiBase: string;
};

export function PostSaveFlow({
  savedEmission,
  t,
  lang,
  signConfig,
  postSaveStep,
  postSaveShareUrl,
  onDone,
  onEdit,
  deliveryOnly,
  apiBase,
}: PostSaveFlowProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      <EmissionPostSaveFlow
        emission={savedEmission}
        t={t}
        lang={lang}
        signConfig={signConfig}
        initialStep={postSaveStep}
        initialShareUrl={postSaveShareUrl}
        onDone={onDone}
        onEdit={onEdit}
        deliveryOnly={deliveryOnly}
        apiBase={apiBase}
      />
      <style>{RX_STYLES}</style>
    </div>
  );
}
