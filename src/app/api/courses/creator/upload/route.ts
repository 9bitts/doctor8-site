import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isCourseCreator } from "@/lib/courses/access";
import {
  createCourseThumbUploadUrl,
  createCourseVideoUploadUrl,
} from "@/lib/courses/upload";
import { z } from "zod";
import { internalErrorResponse } from "@/lib/api-error-response";

const schema = z.object({
  kind: z.enum(["video", "thumbnail"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await isCourseCreator(session.user.id);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result =
      parsed.data.kind === "video"
        ? await createCourseVideoUploadUrl({
            userId: session.user.id,
            filename: parsed.data.filename,
            contentType: parsed.data.contentType,
            sizeBytes: parsed.data.sizeBytes,
          })
        : await createCourseThumbUploadUrl({
            userId: session.user.id,
            filename: parsed.data.filename,
            contentType: parsed.data.contentType,
            sizeBytes: parsed.data.sizeBytes,
          });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return internalErrorResponse("COURSE-CREATOR-UPLOAD", e, 400);
  }
}
