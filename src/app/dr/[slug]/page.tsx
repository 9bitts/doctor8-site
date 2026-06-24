// src/app/dr/[slug]/page.tsx
// Public profile page for healthcare professionals
// Accessible at doctor8.app/dr/username — shareable virtual card

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Video, Building2, Star, Calendar, Globe, ExternalLink } from "lucide-react";
import { cookies } from "next/headers";
import { normalizeLang } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const card = await db.virtualCard.findUnique({
    where: { slug: params.slug },
    include: { professional: { select: { firstName: true, lastName: true, specialty: true } } },
  });
  if (!card) return { title: "Not found" };
  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  return {
    title: `Dr. ${card.professional.firstName} ${card.professional.lastName} — Doctor8`,
    description: `${getProfessionLabel(lang, card.professional.specialty)} available on Doctor8`,
  };
}

export default async function PublicProfilePage({ params }: { params: { slug: string } }) {
  const card = await db.virtualCard.findUnique({
    where: { slug: params.slug, isPublic: true },
    include: {
      professional: {
        include: {
          availabilitySlots: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  if (!card) notFound();
  const pro = card.professional;
  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const socialLinks = card.socialLinks as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-400 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-blue-400 translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-4xl font-black text-white mx-auto mb-4 relative">
              {pro.firstName[0]}
            </div>
            <h1 className="text-2xl font-black text-white">
              Dr. {pro.firstName} {pro.lastName}
            </h1>
            <p className="text-emerald-400 font-semibold mt-1">{getProfessionLabel(lang, pro.specialty)}</p>
            <p className="text-slate-400 text-sm mt-1">{pro.licenseNumber}</p>
            {card.headline && <p className="text-slate-300 text-sm mt-3 italic">"{card.headline}"</p>}
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Location & modalities */}
            <div className="flex flex-wrap gap-3">
              {(pro.clinicCity || pro.clinicCountry) && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  <MapPin size={14} className="text-slate-400" />
                  {[pro.clinicCity, pro.clinicState, pro.clinicCountry].filter(Boolean).join(", ")}
                </span>
              )}
              {pro.acceptsTeleconsult && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
                  <Video size={14} /> Online
                </span>
              )}
              {pro.acceptsInPerson && (
                <span className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full font-medium">
                  <Building2 size={14} /> In-person
                </span>
              )}
            </div>

            {/* Bio */}
            {pro.bio && (
              <p className="text-slate-600 text-sm leading-relaxed">{pro.bio}</p>
            )}

            {/* Price */}
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Consultation</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: pro.currency || "USD" }).format(pro.consultPrice / 100)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star size={16} className="fill-yellow-400" />
                <span className="font-bold text-slate-700">4.9</span>
              </div>
            </div>

            {/* Availability indicator */}
            {pro.availabilitySlots.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Available for new consultations
              </div>
            )}

            {/* Website */}
            {card.website && (
              <a href={card.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <Globe size={14} /> {card.website.replace(/https?:\/\//, "")}
                <ExternalLink size={12} />
              </a>
            )}

            {/* CTA */}
            <Link href={`/register?ref=${card.slug}`}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-slate-800 to-emerald-600 text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 transition">
              <Calendar size={20} />
              Book a consultation
            </Link>

            {/* Already have account */}
            <p className="text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link href={`/login?callbackUrl=/patient/appointments?doctor=${pro.id}`} className="text-emerald-600 font-semibold">
                Sign in to book
              </Link>
            </p>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Powered by <span className="font-black text-white">Doctor<span className="text-emerald-400">8</span></span>
        </p>
      </div>
    </div>
  );
}
