import PsychologyGuard from "@/components/professional/psychology/PsychologyGuard";

export default function PsychologyLayout({ children }: { children: React.ReactNode }) {
  return <PsychologyGuard>{children}</PsychologyGuard>;
}
