"use client";

// Guided tour for professional / psychologist dashboards.

import TourGuide, { TourStep } from "./TourGuide";

const TEXTS: Record<string, Record<string, string>> = {
  "welcome.title": {
    pt: "Bem-vindo ao Doctor8! 🩺",
    en: "Welcome to Doctor8! 🩺",
    es: "¡Bienvenido a Doctor8! 🩺",
  },
  "welcome.body": {
    pt: "Vou te mostrar como configurar sua conta e começar a atender pacientes. Leva menos de 2 minutos.",
    en: "Let me show you how to set up your account and start seeing patients. It takes less than 2 minutes.",
    es: "Te mostraré cómo configurar tu cuenta y comenzar a atender pacientes. Toma menos de 2 minutos.",
  },
  "profile.title": {
    pt: "Configure seu perfil profissional 👤",
    en: "Set up your professional profile 👤",
    es: "Configura tu perfil profesional 👤",
  },
  "profile.body": {
    pt: "Adicione sua foto, especialidade, CRM/CRP, bio e dados da clínica. Um perfil completo gera mais confiança nos pacientes.",
    en: "Add your photo, specialty, license number, bio and clinic details. A complete profile builds patient trust.",
    es: "Agrega tu foto, especialidad, número de licencia, bio y datos de la clínica.",
  },
  "availability.title": {
    pt: "Defina sua disponibilidade 🗓️",
    en: "Set your availability 🗓️",
    es: "Define tu disponibilidad 🗓️",
  },
  "availability.body": {
    pt: "Configure os dias e horários em que você quer atender. Os pacientes só conseguem agendar nos horários que você liberar.",
    en: "Set the days and times you want to see patients. Patients can only book slots you make available.",
    es: "Configura los días y horarios en que quieres atender. Los pacientes solo pueden agendar en los horarios que habilites.",
  },
  "patients.title": {
    pt: "Gerencie seus pacientes 👥",
    en: "Manage your patients 👥",
    es: "Gestiona tus pacientes 👥",
  },
  "patients.body": {
    pt: "Crie fichas para seus pacientes, adicione registros clínicos, prescreva medicamentos e compartilhe documentos com segurança.",
    en: "Create patient charts, add clinical records, prescribe medications and securely share documents.",
    es: "Crea fichas para tus pacientes, agrega registros clínicos, prescribe medicamentos y comparte documentos.",
  },
  "patients.bodyPsych": {
    pt: "Crie fichas para seus pacientes, registre sessões, aplique escalas e compartilhe documentos com segurança.",
    en: "Create patient charts, record sessions, apply scales and securely share documents.",
    es: "Crea fichas para tus pacientes, registra sesiones, aplica escalas y comparte documentos.",
  },
  "duty.title": {
    pt: "Plantão Online — atenda agora 📡",
    en: "Online Duty — see patients now 📡",
    es: "Guardia Online — atiende ahora 📡",
  },
  "duty.body": {
    pt: "Ative o plantão para aparecer disponível para pacientes que precisam de atendimento imediato, sem agendamento. Você controla o ritmo chamando o próximo paciente manualmente.",
    en: "Activate duty to appear available for patients needing immediate care. You control the pace by manually calling the next patient.",
    es: "Activa la guardia para aparecer disponible para pacientes que necesitan atención inmediata. Controlas el ritmo llamando al siguiente paciente.",
  },
  "prescriptions.title": {
    pt: "Prescrições e Biblioteca 💊",
    en: "Prescriptions & Library 💊",
    es: "Recetas y Biblioteca 💊",
  },
  "prescriptions.body": {
    pt: "Emita receitas digitais com validade legal em PDF, com base de dados da Anvisa integrada. Na Biblioteca, salve e compartilhe recursos educativos com seus pacientes.",
    en: "Issue legally valid digital prescriptions as PDF, with integrated Anvisa drug database. In the Library, save and share educational resources with your patients.",
    es: "Emite recetas digitales con validez legal en PDF, con base de datos Anvisa integrada. En la Biblioteca, guarda y comparte recursos educativos.",
  },
  "sessions.title": {
    pt: "Sessões e documentos 🧠",
    en: "Sessions & documents 🧠",
    es: "Sesiones y documentos 🧠",
  },
  "sessions.body": {
    pt: "Registre notas de sessão, aplique escalas psicológicas e emita documentos clínicos no módulo de Psicologia.",
    en: "Record session notes, apply psychological scales and issue clinical documents in the Psychology module.",
    es: "Registra notas de sesión, aplica escalas psicológicas y emite documentos clínicos en el módulo de Psicología.",
  },
};

function buildSteps(portal: "professional" | "psychologist"): TourStep[] {
  const base = portal === "psychologist" ? "/psychologist" : "/professional";
  const steps: TourStep[] = [
    {
      target: null,
      titleKey: "welcome.title",
      bodyKey: "welcome.body",
      placement: "center",
    },
    {
      target: `a[href="${base}/account"]`,
      titleKey: "profile.title",
      bodyKey: "profile.body",
      placement: "right",
    },
    {
      target: `a[href="${base}/settings/availability"]`,
      titleKey: "availability.title",
      bodyKey: "availability.body",
      placement: "right",
    },
    {
      target: `a[href="${base}/patients"]`,
      titleKey: "patients.title",
      bodyKey: portal === "psychologist" ? "patients.bodyPsych" : "patients.body",
      placement: "right",
    },
    {
      target: `a[href="${base}/jit"]`,
      titleKey: "duty.title",
      bodyKey: "duty.body",
      placement: "right",
    },
  ];

  if (portal === "psychologist") {
    steps.push({
      target: `a[href="${base}/sessions"]`,
      titleKey: "sessions.title",
      bodyKey: "sessions.body",
      placement: "right",
    });
  } else {
    steps.push({
      target: `a[href="${base}/prescriptions"]`,
      titleKey: "prescriptions.title",
      bodyKey: "prescriptions.body",
      placement: "right",
    });
  }

  return steps;
}

interface ProfessionalTourProps {
  lang: string;
  portal?: "professional" | "psychologist";
}

export default function ProfessionalTour({ lang, portal = "professional" }: ProfessionalTourProps) {
  return (
    <TourGuide
      steps={buildSteps(portal)}
      texts={TEXTS}
      lang={lang}
      storageKey={portal === "psychologist" ? "doctor8.tour.psychologist" : "doctor8.tour.professional"}
    />
  );
}
