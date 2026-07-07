import CoursesLandingClient from "@/components/courses/CoursesLandingClient";

export const metadata = {
  title: "Cursos Doctor8 — Educação para Profissionais de Saúde",
  description:
    "Cursos online para médicos, enfermeiros, farmacêuticos e demais profissionais de saúde. Conteúdo prático criado por especialistas parceiros. 1 curso/mês no Doctor Connection.",
  openGraph: {
    title: "Doctor8 Cursos — Aprenda na prática",
    description:
      "Vitrine de cursos para profissionais de saúde. Especialistas verificados, aulas online e aplicação imediata na clínica.",
  },
};

export default function CursosPage() {
  return <CoursesLandingClient />;
}
