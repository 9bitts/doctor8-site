import CourseEditorClient from "@/components/courses/CourseEditorClient";

export default function EditCoursePage({ params }: { params: { id: string } }) {
  return <CourseEditorClient courseId={params.id} />;
}
