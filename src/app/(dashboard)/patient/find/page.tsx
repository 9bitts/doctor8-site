// Patient map — find professionals near you

import dynamic from "next/dynamic";

const PatientMapClient = dynamic(() => import("./PatientMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function PatientFindPage() {
  return <PatientMapClient />;
}
