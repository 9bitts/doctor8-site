import { describe, expect, it } from "vitest";
import {
  isAcceptableTakenAt,
  isValidFdiToothNumber,
  isValidNutritionDiaryPhotoKey,
  isValidRecordsStorageKey,
} from "@/lib/upload-key-validation";

describe("isValidRecordsStorageKey", () => {
  const chartId = "chart-abc123";

  it("accepts keys under records/{chartId}/", () => {
    expect(isValidRecordsStorageKey(`records/${chartId}/abc.jpg`, chartId)).toBe(true);
  });

  it("rejects keys from another chart", () => {
    expect(isValidRecordsStorageKey("records/other-chart/abc.jpg", chartId)).toBe(false);
  });

  it("rejects traversal attempts", () => {
    expect(isValidRecordsStorageKey(`records/${chartId}/../other/abc.jpg`, chartId)).toBe(false);
  });
});

describe("isValidNutritionDiaryPhotoKey", () => {
  const userId = "user-xyz";

  it("accepts keys scoped to the patient user", () => {
    expect(isValidNutritionDiaryPhotoKey(`nutrition-diary/${userId}/photo.jpg`, userId)).toBe(true);
  });

  it("rejects keys from another user", () => {
    expect(isValidNutritionDiaryPhotoKey("nutrition-diary/other-user/photo.jpg", userId)).toBe(false);
  });
});

describe("isValidFdiToothNumber", () => {
  it("accepts permanent and deciduous FDI numbers", () => {
    expect(isValidFdiToothNumber(11)).toBe(true);
    expect(isValidFdiToothNumber(48)).toBe(true);
    expect(isValidFdiToothNumber(51)).toBe(true);
    expect(isValidFdiToothNumber(85)).toBe(true);
  });

  it("rejects invalid FDI numbers", () => {
    expect(isValidFdiToothNumber(19)).toBe(false);
    expect(isValidFdiToothNumber(99)).toBe(false);
    expect(isValidFdiToothNumber(11.5)).toBe(false);
  });
});

describe("isAcceptableTakenAt", () => {
  it("accepts past and near-future timestamps within tolerance", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const nearFuture = new Date(Date.now() + 60_000).toISOString();
    expect(isAcceptableTakenAt(past)).toBe(true);
    expect(isAcceptableTakenAt(nearFuture)).toBe(true);
  });

  it("rejects far-future timestamps", () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isAcceptableTakenAt(farFuture)).toBe(false);
  });
});
