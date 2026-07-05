"use client";

// src/app/(dashboard)/patient/messages/page.tsx
// Chat interface — same component used by patients and professionals. i18n via useI18n().
// P4: professionals can start a new conversation from their patient charts list.
//     URL param ?with=<userId> opens a conversation directly.

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getProfessionLabel, specialtyMatchesSearch } from "@/lib/professions";
import { MESSAGE_DRAFT_STORAGE_KEY } from "@/lib/pro-cancel-appointment";
import { Send, Search, Loader2, MessageSquare, ArrowLeft, Plus, X, Users, AlertCircle, RefreshCw } from "lucide-react";

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  content: string;
  isMine: boolean;
  createdAt: string;
  readAt?: string;
}

interface PatientChart {
  id: string;
  firstName: string;
  lastName: string;
  linkedUserId: string | null;
  hasAccount: boolean;
}

interface ProfessionalContact {
  professionalId: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

export default function MessagesPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [sending, setSending] = useState(false);
  const [connWarning, setConnWarning] = useState(false);
  const [search, setSearch] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<string>("");
  const pollRef = useRef<NodeJS.Timeout>();
  const pollFailures = useRef(0);
  const sendingRef = useRef(false);

  // P4: new conversation modal
  const [role, setRole] = useState<string>("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [charts, setCharts] = useState<PatientChart[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  useEffect(() => {
    // Detect role
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      if (s?.user?.role) setRole(s.user.role);
    }).catch(() => {});

    fetchConversations().then(() => {
      // P4: handle ?with= param to open conversation directly
      const params = new URLSearchParams(window.location.search);
      const withUserId = params.get("with");
      if (withUserId) {
        // Try to find existing conversation, or create a stub
        setConversations(prev => {
          const existing = prev.find(c => c.userId === withUserId);
          if (existing) {
            setActiveConv(existing);
          } else {
            // Create a stub conversation to open the chat
            const stub: Conversation = {
              userId: withUserId,
              name: "Paciente",
              lastMessage: "",
              lastAt: new Date().toISOString(),
              unread: 0,
            };
            setActiveConv(stub);
          }
          return prev;
        });
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    try {
      const raw = sessionStorage.getItem(MESSAGE_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { userId?: string; text?: string };
      if (draft.userId === activeConv.userId && draft.text) {
        setNewMessage(draft.text);
        sessionStorage.removeItem(MESSAGE_DRAFT_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [activeConv]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages();
      startPolling();
    }
    return () => stopPolling();
  }, [activeConv]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    setLoadError(false);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) { setLoadError(true); return; }
      const d = await res.json();
      setConversations(d.conversations || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(since?: string) {
    if (!activeConv) return;
    const url = `/api/messages?with=${activeConv.userId}${since ? `&since=${since}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch messages failed");
      const d = await res.json();
      const msgs: Message[] = d.messages || [];

      if (since && msgs.length > 0) {
        setMessages((prev) => [...prev, ...msgs]);
      } else if (!since && !sendingRef.current) {
        // Full replace — skipped mid-send so the optimistic bubble survives.
        setMessages(msgs);
      }

      if (msgs.length > 0) {
        lastMessageTime.current = msgs[msgs.length - 1].createdAt;
      }
      pollFailures.current = 0;
      setConnWarning(false);
    } catch {
      // Keep the messages already on screen and retry on the next cycle.
      pollFailures.current += 1;
      if (pollFailures.current >= 3) setConnWarning(true);
    }
  }

  function startPolling() {
    pollRef.current = setInterval(() => {
      // Poll even in empty conversations, otherwise the doctor's first
      // message never arrives without a reload.
      fetchMessages(lastMessageTime.current || undefined);
    }, 4000);
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);
    sendingRef.current = true;
    setActionError(false);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      isMine: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeConv.userId, content }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setNewMessage(content);
        setActionError(true);
        return;
      }
      const msg = await res.json();

      setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? msg : m));
      lastMessageTime.current = msg.createdAt;

      // Update conversation name if it was a stub
      fetchConversations().then(convs => {
        const updated = conversations.find(c => c.userId === activeConv.userId);
        if (updated) setActiveConv(updated);
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setNewMessage(content);
      setActionError(true);
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  // New conversation modal
  async function openNewConv() {
    setShowNewConv(true);
    setContactSearch("");
    setActionError(false);
    if (role === "PROFESSIONAL") {
      if (charts.length > 0) return;
      setContactsLoading(true);
      try {
        const res = await fetch("/api/professional/records");
        if (!res.ok) { setActionError(true); return; }
        const data = await res.json();
        setCharts((data.records || []).filter((r: PatientChart) => r.hasAccount && r.linkedUserId));
      } catch { setActionError(true); }
      setContactsLoading(false);
      return;
    }
    if (role === "PSYCHOANALYST") {
      if (charts.length > 0) return;
      setContactsLoading(true);
      try {
        const res = await fetch("/api/psychoanalyst/analysands");
        if (!res.ok) { setActionError(true); return; }
        const data = await res.json();
        setCharts((data.analysands || []).filter((r: PatientChart & { linkedUserId?: string }) => r.hasAccount && r.linkedUserId).map((r: PatientChart & { linkedUserId?: string }) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          linkedUserId: r.linkedUserId ?? null,
          hasAccount: r.hasAccount,
        })));
      } catch { setActionError(true); }
      setContactsLoading(false);
      return;
    }
    if (role === "INTEGRATIVE_THERAPIST") {
      if (charts.length > 0) return;
      setContactsLoading(true);
      try {
        const res = await fetch("/api/integrative-therapist/clients");
        if (!res.ok) { setActionError(true); return; }
        const data = await res.json();
        setCharts((data.clients || []).filter((r: PatientChart & { linkedUserId?: string }) => r.hasAccount && r.linkedUserId).map((r: PatientChart & { linkedUserId?: string }) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          linkedUserId: r.linkedUserId ?? null,
          hasAccount: r.hasAccount,
        })));
      } catch { setActionError(true); }
      setContactsLoading(false);
      return;
    }
    if (professionals.length > 0) return;
    setContactsLoading(true);
    try {
      const res = await fetch("/api/patient/message-contacts");
      if (!res.ok) { setActionError(true); return; }
      const data = await res.json();
      setProfessionals(data.contacts || []);
    } catch { setActionError(true); }
    setContactsLoading(false);
  }

  function startConvWithPatient(chart: PatientChart) {
    if (!chart.linkedUserId) return;
    const existing = conversations.find(c => c.userId === chart.linkedUserId);
    if (existing) {
      setActiveConv(existing);
    } else {
      setActiveConv({
        userId: chart.linkedUserId,
        name: `${chart.firstName} ${chart.lastName}`,
        lastMessage: "",
        lastAt: new Date().toISOString(),
        unread: 0,
      });
    }
    setShowNewConv(false);
    setMessages([]);
    lastMessageTime.current = "";
  }

  function startConvWithProfessional(pro: ProfessionalContact) {
    const name = `Dr. ${pro.firstName} ${pro.lastName}`;
    const existing = conversations.find(c => c.userId === pro.userId);
    if (existing) {
      setActiveConv(existing);
    } else {
      setActiveConv({
        userId: pro.userId,
        name,
        lastMessage: "",
        lastAt: new Date().toISOString(),
        unread: 0,
      });
    }
    setShowNewConv(false);
    setMessages([]);
    lastMessageTime.current = "";
  }

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCharts = charts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredProfessionals = professionals.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(contactSearch.toLowerCase())
    || specialtyMatchesSearch(lang, p.specialty, contactSearch)
  );

  const isProviderRole = role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST";
  const canStartNewConv = isProviderRole || role === "PATIENT";

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] h-[calc(100dvh-140px)] flex gap-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Sidebar — conversation list */}
      <div className={`w-full sm:w-80 border-r border-slate-200 flex flex-col shrink-0 ${activeConv ? "hidden sm:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">{t("msg.title")}</h2>
            {canStartNewConv && (
              <button
                onClick={openNewConv}
                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg transition"
                title={t("msg.newConversation")}
              >
                <Plus size={13} /> {t("msg.newShort")}
              </button>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("msg.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
              <AlertCircle size={22} className="text-amber-500" />
              <p className="text-sm text-slate-600">{t("common.loadError")}</p>
              <button type="button" onClick={() => { setLoading(true); fetchConversations(); }} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <RefreshCw size={14} /> {t("common.retry")}
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">{t("msg.noConversations")}</p>
              {canStartNewConv && (
                <button
                  onClick={openNewConv}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <Plus size={13} /> {t("msg.startConversation")}
                </button>
              )}
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setActiveConv(conv)}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0 ${activeConv?.userId === conv.userId ? "bg-emerald-50" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {conv.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800 text-sm truncate">{conv.name}</p>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{formatTime(conv.lastAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 bg-white">
            <button onClick={() => setActiveConv(null)} className="sm:hidden text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {activeConv.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 text-sm truncate">{activeConv.name}</p>
              <p className="text-xs text-emerald-500">{t("msg.encrypted")}</p>
            </div>
          </div>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">{t("msg.noMessages")}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.isMine
                      ? "bg-emerald-500 text-white rounded-br-sm"
                      : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.isMine ? "text-emerald-100" : "text-slate-400"}`}>
                      {formatTime(msg.createdAt)}
                      {msg.isMine && msg.readAt && " · ✓✓"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {connWarning && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">{t("msg.connectionIssue")}</span>
            </div>
          )}

          {actionError && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">{t("common.actionError")}</span>
              <button type="button" onClick={() => setActionError(false)}><X size={14} /></button>
            </div>
          )}

          <form onSubmit={sendMessage} className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-slate-200 flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
              placeholder={t("msg.typePlaceholder")}
              rows={1}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 max-h-32"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-11 h-11 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden sm:flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <MessageSquare size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400">{t("msg.selectConversation")}</p>
            {canStartNewConv && (
              <button
                onClick={openNewConv}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl transition"
              >
                <Plus size={15} /> {t("msg.startConversation")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* New conversation modal */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-emerald-500" /> {t("msg.newConversation")}
              </h2>
              <button onClick={() => setShowNewConv(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder={isProviderRole ? t("msg.searchPatient") : t("msg.searchProfessional")}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : isProviderRole ? (
                filteredCharts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">
                      {charts.length === 0 ? t("msg.noContactsPatient") : t("msg.noContactFound")}
                    </p>
                  </div>
                ) : (
                  filteredCharts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => startConvWithPatient(c)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {c.firstName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-800">
                        {c.firstName} {c.lastName}
                      </span>
                    </button>
                  ))
                )
              ) : filteredProfessionals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">
                    {professionals.length === 0 ? t("msg.noContactsProfessional") : t("msg.noContactFound")}
                  </p>
                </div>
              ) : (
                filteredProfessionals.map((p) => (
                  <button
                    key={p.professionalId}
                    onClick={() => startConvWithProfessional(p)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {p.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        Dr. {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{getProfessionLabel(lang, p.specialty)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
