"use client";

import ProfessionalLibraryHub from "@/components/professional/library/ProfessionalLibraryHub";

export default function IntegrativeTherapistResourcesPage() {
  return (
    <ProfessionalLibraryHub
      apiBase="/api/integrative-therapist"
      recipientMode="integrative_client"
    />
  );
}
