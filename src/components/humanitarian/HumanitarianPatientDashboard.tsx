"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, ChevronRight, FileText, FlaskConical, MessageSquare, Radio, Stethoscope } from "lucide-react";
import { Lang, translate } from "@/lib/i18n/translations";
import HumanitarianPatientShell from "@/components/humanitarian/HumanitarianPatientShell";
import HumanitarianBanner from "@/components/humanitarian/HumanitarianBanner";
import ScheduledVolunteerBanner from "@/components/patient/ScheduledVolunteerBanner";
import HumanitarianAnamneseReminder from "@/components/humanitarian/HumanitarianAnamneseReminder";
import HumanitarianAngelOptOutCard from "@/components/humanitarian/HumanitarianAngelOptOutCard";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import "@/app/humanitarian/painel/painel.css";

type Props = {
  lang: Lang;
  displayName: string;
  campaign: { slug: string; name: string };
  entry: {
    id: string;
    status: string;
    pool: { labelEs: string; labelPt: string; labelEn: string };
  } | null;
  intake: {
    triageValid: boolean;
    tcleAccepted: boolean;
    anamneseComplete: boolean;
  };
  careHref: string;
  unreadMessages: number;
};

export default function HumanitarianPatientDashboard({
  lang: initialLang,
  displayName,
  campaign,
  entry,
  intake,
  careHref,
  unreadMessages,
}: Props) {
  const [lang, setLang] = useState(initialLang);
  const t = (key: string) => translate(lang, key);
  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <HumanitarianPatientShell
      lang={lang}
      onLangChange={setLang}
      unreadMessages={unreadMessages}
    >
      <h1 className="hum-painel-title">Olá, {firstName}</h1>
      <p className="hum-painel-subtitle">
        Este é seu painel de atendimento humanitário. Aqui você entra na fila, agenda consultas
        voluntárias e acessa receitas, exames e mensagens da sua consulta.
      </p>

      <div className="hum-painel-section">
        <HumanitarianBanner
          lang={lang}
          campaign={campaign}
          entry={entry}
          triageValid={intake.triageValid}
          tcleAccepted={intake.tcleAccepted}
        />
      </div>

      <div className="hum-painel-actions hum-painel-section">
        <Link href={careHref} className="hum-painel-action hum-painel-action-urgent">
          <div className="hum-painel-action-icon bg-rose-100 text-rose-700">
            <Radio size={22} />
          </div>
          <div className="hum-painel-action-text flex-1">
            <h2>Preciso agora (fila imediata)</h2>
            <p>Entre na fila gratuita de atendimento médico ou psicológico.</p>
          </div>
          <ChevronRight size={18} className="text-rose-600 shrink-0" />
        </Link>

        <ScheduledVolunteerBanner lang={lang} />

        <Link href="/patient/volunteer-appointments" className="hum-painel-action">
          <div className="hum-painel-action-icon bg-sky-100 text-sky-700">
            <Calendar size={22} />
          </div>
          <div className="hum-painel-action-text flex-1">
            <h2>{t("volAppt.banner.title")}</h2>
            <p>{t("volAppt.banner.desc")}</p>
          </div>
          <ChevronRight size={18} className="text-sky-700 shrink-0" />
        </Link>
      </div>

      <div className="hum-painel-section">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Documentos da consulta
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/patient/prescriptions" className="hum-painel-action">
            <div className="hum-painel-action-icon bg-emerald-100 text-emerald-700">
              <Stethoscope size={20} />
            </div>
            <div className="hum-painel-action-text">
              <h2>{t("nav.myPrescriptions")}</h2>
            </div>
          </Link>
          <Link href="/patient/exam-requests" className="hum-painel-action">
            <div className="hum-painel-action-icon bg-violet-100 text-violet-700">
              <FlaskConical size={20} />
            </div>
            <div className="hum-painel-action-text">
              <h2>{t("nav.myExamRequests")}</h2>
            </div>
          </Link>
          <Link href="/patient/documents" className="hum-painel-action">
            <div className="hum-painel-action-icon bg-amber-100 text-amber-700">
              <FileText size={20} />
            </div>
            <div className="hum-painel-action-text">
              <h2>{t("nav.documents")}</h2>
            </div>
          </Link>
          <Link href="/patient/messages" className="hum-painel-action">
            <div className="hum-painel-action-icon bg-blue-100 text-blue-700">
              <MessageSquare size={20} />
            </div>
            <div className="hum-painel-action-text">
              <h2>{t("nav.messages")}</h2>
              {unreadMessages > 0 ? (
                <p>{unreadMessages} não lida{unreadMessages === 1 ? "" : "s"}</p>
              ) : null}
            </div>
          </Link>
        </div>
      </div>

      <div className="hum-painel-section space-y-3">
        <HumanitarianAnamneseReminder
          lang={lang}
          campaignSlug={campaign.slug || VENEZUELA_CAMPAIGN_SLUG}
        />
        <HumanitarianAngelOptOutCard lang={lang} />
      </div>
    </HumanitarianPatientShell>
  );
}
