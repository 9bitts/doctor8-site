import { I18nProvider } from "@/lib/i18n/I18nProvider";

export const metadata = {
  title: "Agendar consulta | Doctor8",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="min-h-0 bg-white text-slate-900">{children}</div>
    </I18nProvider>
  );
}
