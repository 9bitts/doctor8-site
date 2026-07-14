"use client";

import ProfessionalLibraryHub from "@/components/professional/library/ProfessionalLibraryHub";

export default function ResourcesPage() {
  return <ProfessionalLibraryHub apiBase="/api/professional" recipientMode="patient" />;
}
