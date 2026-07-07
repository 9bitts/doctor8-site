import CoursePlayerClient from "@/components/courses/CoursePlayerClient";

export default function CoursePlayerPage({ params }: { params: { enrollmentId: string } }) {
  return <CoursePlayerClient enrollmentId={params.enrollmentId} />;
}
