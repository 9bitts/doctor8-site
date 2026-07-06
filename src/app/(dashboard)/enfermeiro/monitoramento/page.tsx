import NurseChartWorkspace from "@/components/nurse/NurseChartWorkspace";

export default function NurseMonitoringPage() {
  return (
    <NurseChartWorkspace
      titleKey="nurse.mod.monitoring.title"
      descKey="nurse.mod.monitoring.pageDesc"
      module="monitoring"
    />
  );
}
