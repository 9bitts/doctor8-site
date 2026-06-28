function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");
}

export function getSmartConfiguration() {
  const base = appUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/fhir/smart/authorize`,
    token_endpoint: `${base}/api/fhir/smart/token`,
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    scopes_supported: ["openid", "fhirUser", "patient/*.read", "launch/patient"],
    capabilities: [
      "launch-standalone",
      "client-public",
      "context-standalone-patient",
      "permission-patient",
    ],
    code_challenge_methods_supported: ["S256"],
  };
}

export function getFhirCapabilityStatement() {
  const base = appUrl();
  return {
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString(),
    kind: "instance",
    software: { name: "Doctor8", version: "1.0.0" },
    implementation: { description: "Doctor8 FHIR R4 endpoint", url: `${base}/fhir` },
    fhirVersion: "4.0.1",
    format: ["json"],
    rest: [
      {
        mode: "server",
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/restful-security-service",
                  code: "SMART-on-FHIR",
                  display: "SMART on FHIR",
                },
              ],
              text: "SMART on FHIR",
            },
          ],
          extension: [
            {
              url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
              extension: [
                { url: "authorize", valueUri: `${base}/api/fhir/smart/authorize` },
                { url: "token", valueUri: `${base}/api/fhir/smart/token` },
              ],
            },
          ],
        },
        resource: [
          { type: "Patient", interaction: [{ code: "read" }] },
          { type: "Bundle", interaction: [{ code: "read" }] },
          { type: "MedicationStatement", interaction: [{ code: "read" }] },
          { type: "MedicationRequest", interaction: [{ code: "read" }] },
          { type: "Condition", interaction: [{ code: "read" }] },
          { type: "AllergyIntolerance", interaction: [{ code: "read" }] },
          { type: "Encounter", interaction: [{ code: "read" }] },
          { type: "ServiceRequest", interaction: [{ code: "read" }] },
        ],
      },
    ],
  };
}
