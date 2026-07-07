import { Suspense } from "react";
import CoursesVitrineClient from "@/components/courses/CoursesVitrineClient";

export const metadata = {
  title: "Cursos Doctor8 — Educação para Profissionais de Saúde",
  description:
    "Cursos online para médicos, enfermeiros, farmacêuticos e demais profissionais de saúde. Conteúdo prático criado por especialistas parceiros.",
};

export default function CursosPage() {
  return <CoursesVitrineClient />;
}
