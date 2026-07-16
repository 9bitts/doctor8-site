import { describe, expect, it } from "vitest";
import { PatientAcquisitionChannel } from "@prisma/client";
import {
  resolveAcquisitionChannelUpdate,
  resolvePatientAcquisitionChannel,
} from "@/lib/humanitarian/acquisition-channel";

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

describe("resolveAcquisitionChannelUpdate", () => {
  it("stamps DOCTOR8_HUMANITARIAN from null or REGULAR", () => {
    expect(
      resolveAcquisitionChannelUpdate(null, PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN),
    ).toBe(PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN);
    expect(
      resolveAcquisitionChannelUpdate(
        PatientAcquisitionChannel.REGULAR,
        PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
      ),
    ).toBe(PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN);
  });

  it("never demotes humanitarian channels to REGULAR", () => {
    expect(
      resolveAcquisitionChannelUpdate(
        PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
        PatientAcquisitionChannel.REGULAR,
      ),
    ).toBeNull();
    expect(
      resolveAcquisitionChannelUpdate(
        PatientAcquisitionChannel.ACURA_SOS_FORM,
        PatientAcquisitionChannel.REGULAR,
      ),
    ).toBeNull();
    expect(
      resolveAcquisitionChannelUpdate(
        PatientAcquisitionChannel.ACURA_SOS_FORM,
        PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
      ),
    ).toBeNull();
  });

  it("allows ACURA to promote over DOCTOR8_HUMANITARIAN", () => {
    expect(
      resolveAcquisitionChannelUpdate(
        PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
        PatientAcquisitionChannel.ACURA_SOS_FORM,
      ),
    ).toBe(PatientAcquisitionChannel.ACURA_SOS_FORM);
  });
});
