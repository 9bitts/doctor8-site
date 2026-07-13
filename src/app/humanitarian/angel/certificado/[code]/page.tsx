import AngelCertificateVerifyClient from "@/components/humanitarian/AngelCertificateVerifyClient";

export default function AngelCertificateVerifyPage({
  params,
}: {
  params: { code: string };
}) {
  return <AngelCertificateVerifyClient code={params.code} />;
}
