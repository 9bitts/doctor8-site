"use client";

import {
  UserPlus,
  ClipboardCheck,
  FileCheck,
  ClipboardList,
  Clock,
  Video,
  PhoneCall,
  XCircle,
  AlertTriangle,
  UserMinus,
  CreditCard,
  FileText,
  Globe,
  RefreshCw,
  LogIn,
  MessageCircle,
  MailCheck,
  Link2,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: string;
  at: string;
  title: string;
  detail: string | null;
  link: string | null;
}

const ICONS: Record<string, typeof Clock> = {
  account_created: UserPlus,
  intake_triage_completed: ClipboardCheck,
  intake_tcle_accepted: FileCheck,
  intake_anamnese_completed: ClipboardList,
  queue_joined: Clock,
  queue_called: PhoneCall,
  consult_started: Video,
  consult_ended: Video,
  document: FileText,
  payment: CreditCard,
  cancelled: XCircle,
  video_incident: AlertTriangle,
  admin_removed: UserMinus,
  admin_problem: AlertTriangle,
  acura_form_submitted: Globe,
  acura_status_changed: RefreshCw,
  acura_clicked_doctor8_register: UserPlus,
  acura_clicked_doctor8_login: LogIn,
  acura_clicked_whatsapp: MessageCircle,
  acura_doctor8_email_verified: MailCheck,
  acura_patient_linked: Link2,
};

export default function PatientTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">Nenhum evento registrado.</p>
    );
  }

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-4">
      {events.map((ev) => {
        const Icon = ICONS[ev.type] ?? Clock;
        return (
          <li key={ev.id} className="ml-5">
            <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-white border-2 border-brand-400">
              <Icon size={10} className="text-brand-500" />
            </span>
            <div className="bg-white rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                <time className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(ev.at).toLocaleString("pt-BR")}
                </time>
              </div>
              {ev.detail && (
                <p className="text-xs text-slate-500 mt-1">{ev.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
