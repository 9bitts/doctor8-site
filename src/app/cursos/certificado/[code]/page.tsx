import CourseCertificateVerifyClient from "@/components/courses/CourseCertificateVerifyClient";

export const metadata = {
  title: "Verificar certificado — Doctor8",
  description: "Verifique a autenticidade de um certificado de curso Doctor8.",
};

export default function CertificateVerifyPage({ params }: { params: { code: string } }) {
  return <CourseCertificateVerifyClient code={params.code} />;
}
