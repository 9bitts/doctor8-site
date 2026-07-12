import { describe, expect, it } from "vitest";
import {
  isAsoCompletionTransition,
  isAsoEmitted,
  patchTouchesAsoFields,
  validateEmployerExamPatch,
  validatePhysicianExamPatch,
} from "@/lib/employer-aso-patch";

describe("isAsoEmitted", () => {
  it("returns true only for COMPLETED with asoResult", () => {
    expect(isAsoEmitted({ status: "COMPLETED", asoResult: "APTO" })).toBe(true);
    expect(isAsoEmitted({ status: "COMPLETED", asoResult: null })).toBe(false);
    expect(isAsoEmitted({ status: "SCHEDULED", asoResult: "APTO" })).toBe(false);
  });
});

describe("isAsoCompletionTransition", () => {
  it("detects first emission only", () => {
    const existing = { status: "SCHEDULED", asoResult: null };
    const next = { status: "COMPLETED", asoResult: "APTO" };
    expect(isAsoCompletionTransition(existing, next)).toBe(true);
    expect(isAsoCompletionTransition(next, next)).toBe(false);
  });
});

describe("validateEmployerExamPatch", () => {
  const emitted = { status: "COMPLETED", asoResult: "APTO", asoRestrictions: null };

  it("blocks re-PATCH of ASO fields without rectify → 409", () => {
    const err = validateEmployerExamPatch(emitted, { asoResult: "INAPTO" });
    expect(err).toEqual({ status: 409, error: "ASO já emitido; use retificação" });
  });

  it("allows non-ASO field updates when emitted", () => {
    const err = validateEmployerExamPatch(emitted, { status: "IN_PROGRESS" });
    expect(err).toBeNull();
  });

  it("requires restrictions for APTO_COM_RESTRICAO → 400", () => {
    const err = validateEmployerExamPatch(
      { status: "SCHEDULED", asoResult: null },
      { asoResult: "APTO_COM_RESTRICAO", asoSource: "TRANSCRITO", physicianName: "Dr. A", physicianCrm: "12345/SP" },
    );
    expect(err).toEqual({
      status: 400,
      error: "Restrições obrigatórias para apto com restrição.",
    });
  });

  it("requires TRANSCRITO source and physician identity", () => {
    const err = validateEmployerExamPatch(
      { status: "SCHEDULED", asoResult: null },
      { asoResult: "APTO" },
    );
    expect(err?.status).toBe(403);
  });

  it("accepts valid transcription", () => {
    const err = validateEmployerExamPatch(
      { status: "SCHEDULED", asoResult: null },
      {
        asoResult: "APTO",
        asoSource: "TRANSCRITO",
        physicianName: "Dr. Silva",
        physicianCrm: "12345/SP",
      },
    );
    expect(err).toBeNull();
  });
});

describe("validatePhysicianExamPatch", () => {
  it("blocks re-PATCH without rectify", () => {
    const err = validatePhysicianExamPatch(
      { status: "COMPLETED", asoResult: "APTO" },
      { asoResult: "INAPTO" },
    );
    expect(err?.status).toBe(409);
  });

  it("requires notes for rectify", () => {
    const err = validatePhysicianExamPatch(
      { status: "COMPLETED", asoResult: "APTO" },
      { rectify: true, asoResult: "INAPTO" },
    );
    expect(err?.status).toBe(400);
  });
});

describe("patchTouchesAsoFields", () => {
  it("detects ASO field changes", () => {
    expect(patchTouchesAsoFields({ physicianName: "X" })).toBe(true);
    expect(patchTouchesAsoFields({ notes: "X" })).toBe(false);
  });
});
