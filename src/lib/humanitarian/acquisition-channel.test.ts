import { describe, expect, it } from "vitest";
import { resolvePatientAcquisitionChannel } from "@/lib/humanitarian/acquisition-channel";

describe("resolvePatientAcquisitionChannel", () => {
  it("does not infer humanitarian channel from auth cookies or callback paths", () => {
    expect(
      resolvePatientAcquisitionChannel({
        cookieHeader: "doctor8.hum.origin=1; doctor8.hum.return=%2Fhumanitarian%2Fpainel",
        callbackUrl: "/humanitarian/painel",
      }),
    ).toBeNull();

    expect(
      resolvePatientAcquisitionChannel({
        cookieHeader: null,
        callbackUrl: "/sos-venezuela",
      }),
    ).toBeNull();
  });
});
