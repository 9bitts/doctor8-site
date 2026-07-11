"use client";

import AvailabilitySettings from "@/components/professional/AvailabilitySettings";

export default function IntegrativeAvailabilityPage() {
  return (
    <AvailabilitySettings
      apiPath="/api/integrative-therapist/availability"
      autoSave
      hideSaveButton
    />
  );
}
