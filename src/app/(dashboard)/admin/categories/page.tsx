// src/app/(dashboard)/admin/categories/page.tsx
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import CategoriesAdminClient from "./CategoriesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <CategoriesAdminClient />;
}
