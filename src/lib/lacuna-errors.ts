// Map Lacuna Rest PKI error bodies to stable API codes for the UI.

export type LacunaErrorCode =
  | "LACUNA_UNAVAILABLE"
  | "LACUNA_QUOTA"
  | "LACUNA_CERTIFICATE"
  | "LACUNA_CPF";

export function parseLacunaError(error: unknown): LacunaErrorCode {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (
    msg.includes("quota")
    || msg.includes("credit")
    || msg.includes("402")
    || msg.includes("limit exceeded")
    || msg.includes("insufficient")
  ) {
    return "LACUNA_QUOTA";
  }
  if (
    msg.includes("cpf")
    || msg.includes("certificat")
    || msg.includes("certificateRequirements".toLowerCase())
  ) {
    return msg.includes("cpf") ? "LACUNA_CPF" : "LACUNA_CERTIFICATE";
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return "LACUNA_CERTIFICATE";
  }
  return "LACUNA_UNAVAILABLE";
}
