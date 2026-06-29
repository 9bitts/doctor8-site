// src/app/(dashboard)/professional/categories/page.tsx
// "Categories" navigation for the professional: browse chart records by
// group -> category -> records (across all their patients).
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function ProfessionalCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/medico");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");
  return <CategoriesClient />;
}
