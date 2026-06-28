// Shown after registration — tells user to check their email (server-rendered; avoids useSearchParams crash).

import VerifyEmailClient from "./VerifyEmailClient";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string; callbackUrl?: string };
}) {
  return (
    <VerifyEmailClient
      email={searchParams.email ?? ""}
      error={searchParams.error}
      callbackUrl={searchParams.callbackUrl}
    />
  );
}
