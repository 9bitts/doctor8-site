"use client";

import AvailabilitySettings from "@/components/professional/AvailabilitySettings";

export default function PsychoanalystAvailabilityPage() {
  return (
    <AvailabilitySettings
      apiPath="/api/psychoanalyst/availability"
      autoSave
      hideSaveButton
      hideAdvancedSections
      durationOptions={[30, 45, 50, 60]}
      defaultSlotDuration={50}
    />
  );
}
