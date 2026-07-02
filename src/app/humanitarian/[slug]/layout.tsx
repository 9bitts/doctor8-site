import HumanitarianOriginMarker from "@/components/humanitarian/HumanitarianOriginMarker";

export default function HumanitarianCampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const returnPath = `/humanitarian/${params.slug}`;
  return (
    <>
      <HumanitarianOriginMarker returnPath={returnPath} />
      {children}
    </>
  );
}
