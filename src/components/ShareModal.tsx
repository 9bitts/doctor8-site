"use client";

// src/components/ShareModal.tsx
// Reusable share modal — used in both Medical History and Medications pages.
// Offers 3 options:
//   1. Copy public link (with expiry)
//   2. Download PDF (browser print)
//   3. Send directly to a Doctor8 professional (message + notification)

import { useState, useEffect } from "react";
import {
  X, Link2, FileDown, Send, Copy, CheckCircle2, Loader2,
  Clock, Search, User,
} from "lucide-react";

interface Professional {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  avatarUrl?: string;
}

interface ShareModalProps {
  type: "history" | "medications";
  onClose: () => void;
}

export default function ShareModal({ type, onClose }: ShareModalProps) {
  const [tab, setTab] = useState<"link" | "professional">("link");
  const [expiry, setExpiry] = useState<24 | 72 | 168 | 0>(72);
  const [shareUrl, setShareUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Professional search
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const label = type === "history" ? "medical history" : "medication list";

  useEffect(() => {
    // Load professionals for direct share
    fetch("/api/professionals")
      .then((r) => r.json())
      .then((d) => setProfessionals(d.professionals || []))
      .catch(() => {});
  }, []);

  async function generateLink() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/patient/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, expiresInHours: expiry }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Failed to generate link."); return; }
      setShareUrl(data.shareUrl);
    } catch {
      setError("Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function shareVia(platform: "whatsapp" | "email") {
    const text = `Here is my ${label}: ${shareUrl}`;
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      window.open(`mailto:?subject=My Doctor8 ${label}&body=${encodeURIComponent(text)}`, "_blank");
    }
  }

  async function sendToProfessional() {
    if (!selectedPro) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/patient/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          professionalUserId: selectedPro.userId,
          expiresInHours: 168, // 7 days for direct shares
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Failed to send."); return; }
      setSent(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  const filteredPros = professionals.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.specialty}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Share {label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose how to share</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab("link")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === "link" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-slate-400"
            }`}
          >
            <Link2 size={14} className="inline mr-1.5" />
            Link / PDF
          </button>
          <button
            onClick={() => setTab("professional")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === "professional" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-slate-400"
            }`}
          >
            <Send size={14} className="inline mr-1.5" />
            Send to Doctor
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── TAB 1: LINK / PDF ── */}
          {tab === "link" && (
            <>
              {/* Expiry selector */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  <Clock size={13} className="inline mr-1" />
                  Link expires in
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([24, 72, 168, 0] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setExpiry(h)}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${
                        expiry === h
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {h === 0 ? "Never" : h === 24 ? "24h" : h === 72 ? "3 days" : "7 days"}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {!shareUrl ? (
                <button
                  onClick={generateLink}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  {generating ? "Generating..." : "Generate link"}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Link display */}
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 bg-slate-50"
                    />
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold shrink-0 hover:bg-slate-700 transition"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  {/* Share via buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => shareVia("whatsapp")}
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareVia("email")}
                      className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Email
                    </button>
                  </div>

                  {/* PDF */}
                  <button
                    onClick={() => window.open(shareUrl, "_blank")}
                    className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition"
                  >
                    <FileDown size={16} />
                    Open & Print / Save as PDF
                  </button>

                  <button
                    onClick={() => { setShareUrl(""); setCopied(false); }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Generate a new link
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── TAB 2: SEND TO DOCTOR ── */}
          {tab === "professional" && (
            <>
              {sent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <p className="font-semibold text-slate-800">Sent successfully!</p>
                  <p className="text-sm text-slate-500">
                    Dr. {selectedPro?.firstName} {selectedPro?.lastName} received your {label} in their messages and was notified.
                  </p>
                  <button onClick={onClose} className="text-sm text-emerald-600 font-medium hover:underline">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or specialty..."
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  {/* Professional list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredPros.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No professionals found.</p>
                    ) : (
                      filteredPros.map((pro) => (
                        <button
                          key={pro.id}
                          onClick={() => setSelectedPro(pro)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                            selectedPro?.id === pro.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {pro.firstName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">Dr. {pro.firstName} {pro.lastName}</p>
                            <p className="text-xs text-slate-400">{pro.specialty}</p>
                          </div>
                          {selectedPro?.id === pro.id && (
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  {selectedPro && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                      Dr. {selectedPro.firstName} {selectedPro.lastName} will receive your {label} in their messages and get a notification.
                    </div>
                  )}

                  <button
                    onClick={sendToProfessional}
                    disabled={!selectedPro || sending}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? "Sending..." : `Send to Dr. ${selectedPro?.lastName || "..."}`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
