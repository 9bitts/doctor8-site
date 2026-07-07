"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

type LessonDraft = {
  title: string;
  description: string;
  videoKey: string;
  videoUrl: string;
  durationSecs: string;
  isPreview: boolean;
};

type ModuleDraft = {
  title: string;
  lessons: LessonDraft[];
};

const emptyLesson = (): LessonDraft => ({
  title: "",
  description: "",
  videoKey: "",
  videoUrl: "",
  durationSecs: "",
  isPreview: false,
});

const PROFESSIONS = [
  { value: "MEDICINE", label: "Medicina" },
  { value: "NURSING", label: "Enfermagem" },
  { value: "PHARMACY", label: "Farmácia" },
  { value: "PSYCHOLOGY", label: "Psicologia" },
  { value: "NUTRITION", label: "Nutrição" },
  { value: "DENTISTRY", label: "Odontologia" },
  { value: "INTEGRATIVE", label: "Integrativa" },
  { value: "PSYCHOANALYSIS", label: "Psicanálise" },
  { value: "GENERAL", label: "Saúde geral" },
];

async function uploadFile(file: File, kind: "video" | "thumbnail"): Promise<string> {
  const presign = await fetch("/api/courses/creator/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });
  const data = await presign.json();
  if (!presign.ok) throw new Error(data.error || "Falha no upload");

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("Falha ao enviar arquivo para o servidor");
  return data.key as string;
}

export default function CourseEditorClient({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [profession, setProfession] = useState("GENERAL");
  const [specialty, setSpecialty] = useState("");
  const [priceReais, setPriceReais] = useState("97");
  const [workloadHours, setWorkloadHours] = useState("");
  const [thumbnailKey, setThumbnailKey] = useState("");
  const [modules, setModules] = useState<ModuleDraft[]>([
    { title: "Módulo 1", lessons: [emptyLesson()] },
  ]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!courseId);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/courses/creator/${courseId}`);
    if (!res.ok) return;
    const { course } = await res.json();
    setTitle(course.title);
    setShortDescription(course.shortDescription ?? "");
    setDescription(course.description ?? "");
    setProfession(course.profession);
    setSpecialty(course.specialty ?? "");
    setPriceReais(String(course.priceCents / 100));
    setWorkloadHours(course.workloadHours != null ? String(course.workloadHours) : "");
    setThumbnailKey(course.thumbnailKey ?? "");
    setModules(
      course.modules.map((m: { title: string; lessons: Array<Record<string, unknown>> }) => ({
        title: m.title,
        lessons: m.lessons.map((l) => ({
          title: l.title as string,
          description: (l.description as string) ?? "",
          videoKey: (l.videoKey as string) ?? "",
          videoUrl: (l.videoUrl as string) ?? "",
          durationSecs: l.durationSecs != null ? String(l.durationSecs) : "",
          isPreview: Boolean(l.isPreview),
        })),
      })),
    );
    setLoaded(true);
  }, [courseId]);

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId, loadCourse]);

  function updateModule(mi: number, patch: Partial<ModuleDraft>) {
    setModules((prev) => prev.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  }

  function updateLesson(mi: number, li: number, patch: Partial<LessonDraft>) {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mi
          ? {
              ...m,
              lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)),
            }
          : m,
      ),
    );
  }

  async function handleVideoUpload(mi: number, li: number, file: File) {
    const key = `m${mi}-l${li}`;
    setUploading(key);
    try {
      const videoKey = await uploadFile(file, "video");
      updateLesson(mi, li, { videoKey, videoUrl: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload");
    }
    setUploading(null);
  }

  async function handleThumbUpload(file: File) {
    setUploading("thumb");
    try {
      const key = await uploadFile(file, "thumbnail");
      setThumbnailKey(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload");
    }
    setUploading(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const priceCents = Math.round(parseFloat(priceReais.replace(",", ".")) * 100) || 0;
    const payload = {
      title,
      shortDescription,
      description,
      profession,
      specialty: specialty || undefined,
      priceCents,
      workloadHours: workloadHours ? parseFloat(workloadHours) : null,
      thumbnailKey: thumbnailKey || null,
      modules: modules.map((m, mi) => ({
        title: m.title,
        sortOrder: mi,
        lessons: m.lessons.map((l, li) => ({
          title: l.title,
          description: l.description || undefined,
          videoKey: l.videoKey || null,
          videoUrl: l.videoUrl || null,
          durationSecs: l.durationSecs ? parseInt(l.durationSecs, 10) : null,
          sortOrder: li,
          isPreview: l.isPreview,
        })),
      })),
    };

    const res = await fetch(courseId ? `/api/courses/creator/${courseId}` : "/api/courses/creator", {
      method: courseId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Erro ao salvar");
      return;
    }
    router.push("/professional/courses");
  }

  if (courseId && !loaded) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-slate-900">
        {courseId ? "Editar curso" : "Novo curso"}
      </h1>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Título *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Resumo curto</span>
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Descrição completa</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Área</span>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {PROFESSIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Especialidade</span>
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Preço (R$)</span>
            <input
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Carga horária (EMC)</span>
            <input
              value={workloadHours}
              onChange={(e) => setWorkloadHours(e.target.value)}
              type="number"
              min="0"
              step="0.5"
              placeholder="ex: 4"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Capa do curso</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleThumbUpload(f);
            }}
          />
          {uploading === "thumb" && <p className="text-xs text-slate-500 mt-1">Enviando capa...</p>}
          {thumbnailKey && <p className="text-xs text-emerald-600 mt-1">Capa enviada ✓</p>}
        </label>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-slate-900">Módulos e aulas</h2>
        {modules.map((mod, mi) => (
          <div key={mi} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <input
              value={mod.title}
              onChange={(e) => updateModule(mi, { title: e.target.value })}
              className="w-full font-medium rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Título do módulo"
            />
            {mod.lessons.map((lesson, li) => (
              <div key={li} className="pl-3 border-l-2 border-brand-100 space-y-2">
                <input
                  value={lesson.title}
                  onChange={(e) => updateLesson(mi, li, { title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Título da aula"
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <Upload size={14} />
                    {uploading === `m${mi}-l${li}` ? "Enviando..." : "Vídeo MP4"}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleVideoUpload(mi, li, f);
                      }}
                    />
                  </label>
                  {lesson.videoKey && (
                    <span className="text-xs text-emerald-600">Vídeo enviado ✓</span>
                  )}
                  <input
                    value={lesson.videoUrl}
                    onChange={(e) => updateLesson(mi, li, { videoUrl: e.target.value, videoKey: "" })}
                    placeholder="ou link YouTube"
                    className="flex-1 min-w-[160px] text-xs rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                  <input
                    value={lesson.durationSecs}
                    onChange={(e) => updateLesson(mi, li, { durationSecs: e.target.value })}
                    placeholder="seg"
                    className="w-16 text-xs rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={lesson.isPreview}
                      onChange={(e) => updateLesson(mi, li, { isPreview: e.target.checked })}
                    />
                    Preview
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateModule(mi, { lessons: [...mod.lessons, emptyLesson()] })
              }
              className="text-sm text-brand-600 hover:underline"
            >
              + Aula
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setModules((p) => [...p, { title: `Módulo ${p.length + 1}`, lessons: [emptyLesson()] }])}
          className="inline-flex items-center gap-1 text-sm text-brand-600"
        >
          <Plus size={16} />
          Módulo
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={busy || !title.trim()}
        onClick={save}
        className="bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Salvando..." : "Salvar rascunho"}
      </button>
    </div>
  );
}
