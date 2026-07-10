import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminCoursesClient from "@/components/courses/AdminCoursesClient";
import AdminCourseCreatorGrant from "@/components/courses/AdminCourseCreatorGrant";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return (
    <div className="space-y-8">
      <AdminCourseCreatorGrant />
      <AdminCoursesClient />
    </div>
  );
}
