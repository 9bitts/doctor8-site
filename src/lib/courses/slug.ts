/** URL-safe slug from course title. */
export function slugifyCourseTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "curso";
}

export function uniqueCourseSlug(base: string, suffix: string): string {
  const clean = slugifyCourseTitle(base);
  const tail = suffix.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return tail ? `${clean}-${tail}` : clean;
}
