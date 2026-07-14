import { describe, it, expect } from "vitest";
import {
  countActivityByCategory,
  filterActivityEvents,
  type ChartActivityEvent,
} from "@/lib/chart-activity-timeline";

const sample: ChartActivityEvent[] = [
  {
    id: "1",
    type: "odontogram",
    category: "dental",
    moduleKey: "dental.odontogram",
    title: "Odontograma",
    summary: "5 dente(s)",
    detail: null,
    at: "2026-07-14T10:00:00.000Z",
    sourceId: "a",
  },
  {
    id: "2",
    type: "evolution",
    category: "record",
    moduleKey: "record",
    title: "Evolução",
    summary: null,
    detail: "Paciente estável",
    at: "2026-07-13T10:00:00.000Z",
    sourceId: "b",
  },
  {
    id: "3",
    type: "anthropometry",
    category: "nutrition",
    moduleKey: "nutrition.anthropometry",
    title: "Antropometria",
    summary: "70 kg",
    detail: null,
    at: "2026-07-12T10:00:00.000Z",
    sourceId: "c",
  },
];

describe("chart-activity-timeline helpers", () => {
  it("counts events by category", () => {
    const counts = countActivityByCategory(sample);
    expect(counts.all).toBe(3);
    expect(counts.dental).toBe(1);
    expect(counts.record).toBe(1);
    expect(counts.nutrition).toBe(1);
  });

  it("filters by category", () => {
    const dental = filterActivityEvents(sample, "dental");
    expect(dental).toHaveLength(1);
    expect(dental[0].title).toBe("Odontograma");
  });

  it("returns all when filter is all", () => {
    expect(filterActivityEvents(sample, "all")).toHaveLength(3);
  });
});
