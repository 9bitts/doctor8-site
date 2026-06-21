"use client";

// src/components/PatientTour.tsx
// Guided tour for the patient dashboard.
// 5 steps covering: welcome, profile, appointments, urgent care, documents.

import TourGuide, { TourStep } from "./TourGuide";

const STEPS: TourStep[] = [
  {
    target: null,
    titleKey: "welcome.title",
    bodyKey:  "welcome.body",
    placement: "center",
  },
  {
    target: 'a[href="/patient/account"]',
    titleKey: "profile.title",
    bodyKey:  "profile.body",
    placement: "right",
  },
  {
    target: 'a[href="/patient/appointments"]',
    titleKey: "appointments.title",
    bodyKey:  "appointments.body",
    placement: "right",
  },
  {
    target: 'a[href="/urgent"]',
    titleKey: "urgent.title",
    bodyKey:  "urgent.body",
    placement: "right",
  },
  {
    target: 'a[href="/patient/documents"]',
    titleKey: "docs.title",
    bodyKey:  "docs.body",
    placement: "right",
  },
];

const TEXTS: Record<string, Record<string, string>> = {
  "welcome.title": {
    pt: "Bem-vindo ao Doctor8! 👋",
    en: "Welcome to Doctor8! 👋",
    es: "¡Bienvenido a Doctor8! 👋",
  },
  "welcome.body": {
    pt: "Vou te mostrar como usar a plataforma em menos de 1 minuto. Você pode pular a qualquer momento.",
    en: "Let me show you how to use the platform in less than 1 minute. You can skip at any time.",
    es: "Te mostraré cómo usar la plataforma en menos de 1 minuto. Puedes saltar en cualquier momento.",
  },
  "profile.title": {
    pt: "Complete seu perfil 📋",
    en: "Complete your profile 📋",
    es: "Completa tu perfil 📋",
  },
  "profile.body": {
    pt: "Preencha seu nome, data de nascimento e endereço. Esses dados são necessários para que seu médico emita receitas válidas.",
    en: "Fill in your name, date of birth and address. This information is needed for your doctor to issue valid prescriptions.",
    es: "Completa tu nombre, fecha de nacimiento y dirección. Estos datos son necesarios para que tu médico emita recetas válidas.",
  },
  "appointments.title": {
    pt: "Agende uma consulta 📅",
    en: "Book a consultation 📅",
    es: "Agenda una consulta 📅",
  },
  "appointments.body": {
    pt: "Aqui você encontra médicos disponíveis, escolhe o horário e paga com segurança. Você recebe lembretes 24h e 3h antes da consulta.",
    en: "Here you find available doctors, choose a time slot and pay securely. You'll receive reminders 24h and 3h before your appointment.",
    es: "Aquí encuentras médicos disponibles, eliges el horario y pagas de forma segura. Recibirás recordatorios 24h y 3h antes.",
  },
  "urgent.title": {
    pt: "Precisa de atendimento agora? 🚨",
    en: "Need care right now? 🚨",
    es: "¿Necesitas atención ahora? 🚨",
  },
  "urgent.body": {
    pt: "O Atendimento Imediato conecta você com profissionais disponíveis na hora, sem agendamento prévio. Ideal para urgências.",
    en: "Immediate Care connects you with professionals available right now, without prior scheduling. Ideal for urgent situations.",
    es: "La Atención Inmediata te conecta con profesionales disponibles ahora mismo, sin cita previa. Ideal para urgencias.",
  },
  "docs.title": {
    pt: "Seus documentos e histórico 📁",
    en: "Your documents and history 📁",
    es: "Tus documentos e historial 📁",
  },
  "docs.body": {
    pt: "Acesse exames, receitas e documentos compartilhados pelo seu médico. Tudo criptografado e seguro. Você também pode enviar documentos para o seu médico.",
    en: "Access exams, prescriptions and documents shared by your doctor. All encrypted and secure. You can also send documents to your doctor.",
    es: "Accede a exámenes, recetas y documentos compartidos por tu médico. Todo cifrado y seguro.",
  },
};

interface PatientTourProps {
  lang: string;
}

export default function PatientTour({ lang }: PatientTourProps) {
  return (
    <TourGuide
      steps={STEPS}
      texts={TEXTS}
      lang={lang}
      storageKey="doctor8.tour.patient"
    />
  );
}
