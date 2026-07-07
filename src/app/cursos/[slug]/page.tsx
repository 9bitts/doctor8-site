import { Suspense } from "react";
import CourseDetailClient from "@/components/courses/CourseDetailClient";
import { Loader2 } from "lucide-react";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: `Curso — Doctor8`,
  };
}

function DetailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-brand-600" size={32} />
    </div>
  );
}

export default function CourseSlugPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <CourseDetailClient slug={params.slug} />
    </Suspense>
  );
}
