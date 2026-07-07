import AdminCoursesClient from "@/components/courses/AdminCoursesClient";
import AdminCourseCreatorGrant from "@/components/courses/AdminCourseCreatorGrant";

export default function AdminCoursesPage() {
  return (
    <div className="space-y-8">
      <AdminCourseCreatorGrant />
      <AdminCoursesClient />
    </div>
  );
}
