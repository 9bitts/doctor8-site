import { describe, expect, it } from "vitest";
import { sanitizeExamItems } from "./sanitize-exam-items";

describe("sanitizeExamItems", () => {
  it("keeps real exam names", () => {
    expect(sanitizeExamItems(["Hemograma completo", "Glicemia", "TSH"])).toEqual([
      "Hemograma completo",
      "Glicemia",
      "TSH",
    ]);
  });

  it("drops demographic noise from STT", () => {
    expect(
      sanitizeExamItems([
        "REQUISIÇÃO DE EXAMES LABORATORIAIS MULHER OBESA SONIA BATISTA",
        "mulher obesa",
        "hemograma",
      ]),
    ).toEqual(["hemograma"]);
  });

  it("drops bare request phrases", () => {
    expect(sanitizeExamItems(["pedido de exames", "requisição de exames laboratoriais"])).toEqual([]);
  });
});
