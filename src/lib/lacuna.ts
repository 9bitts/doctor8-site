// src/lib/lacuna.ts
// Cliente do Rest PKI Core (Lacuna Software) para assinatura digital ICP-Brasil.
//
// Fluxo "Signature Session":
//   1. createSignatureSession(pdfBytes, returnUrl) → cria a sessão com o PDF embutido
//      em base64 e devolve { sessionId, redirectUrl }.
//   2. Redirecionamos o médico para redirectUrl (ele assina com BirdID/VIDaaS/etc).
//   3. A Lacuna redireciona de volta para returnUrl?signatureSessionId=...
//   4. getSignatureSession(sessionId) → devolve o status e a URL do PDF assinado.
//   5. downloadSignedPdf(location) → baixa os bytes do PDF assinado.
//
// Documentação: https://docs.lacunasoftware.com/pt-br/articles/rest-pki/core/

const ENDPOINT =
  (process.env.LACUNA_ENDPOINT || "https://core.pki.rest").replace(/\/+$/, "");
const API_KEY = process.env.LACUNA_API_KEY || "";
// Contexto de segurança: define qual ICP é confiável.
//   - Produção ICP-Brasil real: deixe vazio/omitido (usa o padrão da conta) ou
//     o GUID do contexto "ICP-Brasil" da sua conta.
//   - Testes (certificados de teste Lacuna): 803517ad-3bbc-4169-b085-60053a8f6dbf
const SECURITY_CONTEXT = process.env.LACUNA_SECURITY_CONTEXT || "";

export interface CreateSessionResult {
  sessionId: string;
  redirectUrl: string;
}

export interface SignatureSessionDocument {
  id?: string;
  status?: string;
  signedFile?: { location?: string; name?: string } | null;
  originalFile?: { name?: string } | null;
}

export interface SignatureSession {
  id: string;
  status: string; // "Pending" | "Processing" | "Completed" | ...
  documents: SignatureSessionDocument[];
}

function assertConfig() {
  if (!API_KEY) {
    throw new Error(
      "LACUNA_API_KEY não configurada. Defina a variável de ambiente no Railway."
    );
  }
}

function authHeaders(): Record<string, string> {
  // O Rest PKI Core aceita a API Key no header Authorization no formato:
  //   Authorization: Bearer <api-key>
  // (A chave costuma ter um pipe, ex.: "app|xxxxx".)
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Cria uma Signature Session com o PDF (bytes) embutido em base64.
 * Restringe a assinatura ao CPF do médico, quando informado.
 */
export async function createSignatureSession(opts: {
  pdfBytes: Buffer | Uint8Array;
  fileName: string;
  returnUrl: string;
  /** CPF do médico (só dígitos ou com pontuação) — restringe o certificado. */
  cpf?: string | null;
}): Promise<CreateSessionResult> {
  assertConfig();

  const base64 = Buffer.from(opts.pdfBytes).toString("base64");

  const body: Record<string, unknown> = {
    returnUrl: opts.returnUrl,
    documents: [
      {
        file: { content: base64, name: opts.fileName },
        // PAdES = assinatura embutida no próprio PDF (padrão para receita).
        signatureFormat: "Pades",
      },
    ],
  };

  // Contexto de segurança (testes vs produção)
  if (SECURITY_CONTEXT) {
    body.securityContextId = SECURITY_CONTEXT;
  }

  // Restringe ao CPF do médico, se informado (só dígitos).
  const cpfDigits = (opts.cpf || "").replace(/\D/g, "");
  if (cpfDigits.length === 11) {
    body.certificateRequirements = [
      { type: "CpfEquals", cpf: cpfDigits },
    ];
  }

  const res = await fetch(`${ENDPOINT}/api/signature-sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Lacuna createSignatureSession falhou (${res.status}): ${text.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as {
    id?: string;
    sessionId?: string;
    redirectUrl?: string;
    redirectTo?: string;
  };

  const sessionId = data.id || data.sessionId || "";
  const redirectUrl = data.redirectUrl || data.redirectTo || "";

  if (!sessionId || !redirectUrl) {
    throw new Error(
      `Lacuna devolveu resposta inesperada: ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  return { sessionId, redirectUrl };
}

/**
 * Consulta uma Signature Session pelo ID.
 */
export async function getSignatureSession(
  sessionId: string
): Promise<SignatureSession> {
  assertConfig();

  const res = await fetch(
    `${ENDPOINT}/api/signature-sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET", headers: authHeaders() }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Lacuna getSignatureSession falhou (${res.status}): ${text.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as SignatureSession;
  return data;
}

/**
 * Baixa os bytes do PDF assinado a partir da location devolvida pela Lacuna.
 * A location pode ser absoluta (http...) ou relativa ao endpoint.
 */
export async function downloadSignedPdf(location: string): Promise<Buffer> {
  assertConfig();

  const url = location.startsWith("http")
    ? location
    : `${ENDPOINT}${location.startsWith("/") ? "" : "/"}${location}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Lacuna downloadSignedPdf falhou (${res.status}): ${text.slice(0, 300)}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper: extrai a location do primeiro documento assinado de uma sessão.
 */
export function getSignedLocation(
  session: SignatureSession
): string | null {
  const doc = session.documents?.[0];
  return doc?.signedFile?.location || null;
}
