"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Loader2,
  Search,
  User,
  ExternalLink,
  UserPlus,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { buildWhatsAppUrl } from "@/lib/humanitarian/angel-utils";

type ConversationRow = {
  id: string;
  waPhone: string;
  waPhoneDisplay: string;
  displayName: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastInboundAt: string | null;
  within24hWindow: boolean;
  assignedToUserId: string | null;
  assignedToName: string | null;
  patientProfileId: string | null;
  patientName: string | null;
  hasInboundHistory?: boolean;
  lastMessage: {
    body: string;
    type: string;
    direction: string;
    createdAt: string;
  } | null;
};

type ChatMessage = {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  mediaId: string | null;
  status: string;
  errorDetail: string | null;
  sentByName: string | null;
  createdAt: string;
};

type AssignedFilter = "all" | "me" | "unassigned";
type StatusFilter = "open" | "closed" | "all";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return label.slice(-2).toUpperCase();
}

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function statusIcon(status: string): string {
  if (status === "read") return "✓✓";
  if (status === "delivered") return "✓✓";
  if (status === "sent") return "✓";
  if (status === "failed") return "!";
  return "";
}

function formatRelativeTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return locale.startsWith("pt") ? "agora" : locale.startsWith("es") ? "ahora" : "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return formatTime(iso, locale);
}

function mergeConversation(
  list: ConversationRow[],
  row: ConversationRow,
): ConversationRow[] {
  const idx = list.findIndex((c) => c.id === row.id);
  if (idx === -1) return [row, ...list];
  const next = [...list];
  next[idx] = { ...next[idx], ...row };
  return next;
}

export default function AdminWhatsAppInboxClient({ adminUserId }: { adminUserId: string }) {
  const searchParams = useSearchParams();
  const { lang, t } = useI18n();
  const locale = localeOf(lang);

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>("all");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [patching, setPatching] = useState(false);
  const [listError, setListError] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [selectedFallback, setSelectedFallback] = useState<ConversationRow | null>(null);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const selected =
    conversations.find((c) => c.id === selectedId)
    ?? (selectedFallback?.id === selectedId ? selectedFallback : null);

  const loadConversations = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        status: statusFilter,
        assigned: assignedFilter,
      });
      if (search.trim()) qs.set("q", search.trim());
      const res = await fetch(`/api/admin/whatsapp/conversations?${qs}`);
      if (!res.ok) {
        setListError(true);
        return;
      }
      const data = await res.json();
      setConversations(data.conversations || []);
      setListError(false);
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, [assignedFilter, search, statusFilter]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${conversationId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      await loadConversations();
    } finally {
      setLoadingChat(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    setLoadingList(true);
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const timer = setInterval(loadConversations, 10000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const timer = setInterval(() => loadMessages(selectedId), 5000);
    return () => clearInterval(timer);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversationRow = useCallback((row: ConversationRow, draft?: string | null) => {
    setSelectedId(row.id);
    setSelectedFallback(row);
    setConversations((prev) => mergeConversation(prev, row));
    setSendError(null);
    setMobileShowChat(true);
    if (row.status === "closed") {
      setStatusFilter("closed");
      setAssignedFilter("all");
    } else if (row.status === "open") {
      setStatusFilter("all");
    }
    if (draft?.trim()) setComposer(draft.trim());
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current) return;

    const conversationId = searchParams.get("conversation")?.trim();
    const phone = searchParams.get("phone")?.trim();
    const draft = searchParams.get("draft");
    const displayName = searchParams.get("name")?.trim();
    const patientProfileId = searchParams.get("patientProfileId")?.trim();

    if (!conversationId && !phone) return;

    deepLinkHandled.current = true;

    void (async () => {
      setDeepLinkError(null);
      try {
        if (conversationId) {
          const res = await fetch(`/api/admin/whatsapp/conversations/${conversationId}`);
          if (!res.ok) {
            setDeepLinkError(t("admin.whatsapp.deepLinkNotFound"));
            return;
          }
          const data = await res.json();
          if (data.conversation) openConversationRow(data.conversation, draft);
          return;
        }

        if (phone) {
          const res = await fetch("/api/admin/whatsapp/conversations/open-by-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              displayName: displayName || undefined,
              patientProfileId: patientProfileId || undefined,
            }),
          });
          if (!res.ok) {
            setDeepLinkError(t("admin.whatsapp.deepLinkNotFound"));
            return;
          }
          const data = await res.json();
          if (data.conversation) openConversationRow(data.conversation, draft);
        }
      } catch {
        setDeepLinkError(t("admin.whatsapp.deepLinkNotFound"));
      }
    })();
  }, [openConversationRow, searchParams, t]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setSelectedFallback(null);
    setSendError(null);
    setMobileShowChat(true);
  };

  const patchConversation = async (body: Record<string, unknown>) => {
    if (!selectedId) return;
    setPatching(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      await loadConversations();
      await loadMessages(selectedId);
    } finally {
      setPatching(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedId || !composer.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: composer.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.code === "outside_24h_window") {
        setSendError(t("admin.whatsapp.outside24h"));
        return;
      }
      if (!res.ok) {
        setSendError(data.error || t("admin.whatsapp.sendError"));
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        return;
      }
      setComposer("");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      await loadConversations();
    } catch {
      setSendError(t("admin.whatsapp.sendError"));
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const conversationLabel = (c: ConversationRow) =>
    c.patientName || c.displayName || c.waPhoneDisplay;

  const renderMediaChip = (type: string) => {
    if (type === "image") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <ImageIcon size={14} /> {t("admin.whatsapp.media.image")}
        </span>
      );
    }
    if (type === "audio") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <Mic size={14} /> {t("admin.whatsapp.media.audio")}
        </span>
      );
    }
    if (type === "document") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <FileText size={14} /> {t("admin.whatsapp.media.document")}
        </span>
      );
    }
    return null;
  };

  const listPanel = (
    <div className={`flex flex-col border-slate-200 bg-white md:border-r ${mobileShowChat ? "hidden md:flex" : "flex"} md:min-h-[70vh]`}>
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.whatsapp.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["open", t("admin.whatsapp.filter.open")],
            ["me", t("admin.whatsapp.filter.mine")],
            ["unassigned", t("admin.whatsapp.filter.unassigned")],
            ["closed", t("admin.whatsapp.filter.closed")],
          ] as const).map(([key, label]) => {
            const active =
              key === "open" || key === "closed"
                ? statusFilter === key && assignedFilter === "all"
                : assignedFilter === key && statusFilter === "open";
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "open" || key === "closed") {
                    setStatusFilter(key);
                    setAssignedFilter("all");
                  } else {
                    setStatusFilter("open");
                    setAssignedFilter(key);
                  }
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  active
                    ? "bg-brand-50 border-brand-200 text-brand-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingList ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : listError ? (
          <p className="text-sm text-amber-700 px-4 py-8">{t("common.loadError")}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-8 text-center">{t("admin.whatsapp.noConversations")}</p>
        ) : (
          conversations.map((c) => {
            const label = conversationLabel(c);
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${
                  active ? "bg-brand-50/70" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 truncate">{label}</p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatRelativeTime(c.lastMessageAt, locale)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.lastMessage?.body || t("admin.whatsapp.selectConversation")}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-[#25D366] text-white px-1.5 py-0.5 rounded-full">
                          {c.unreadCount}
                        </span>
                      )}
                      {c.assignedToName ? (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {t("admin.whatsapp.assignedTo")}: {c.assignedToName}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {t("admin.whatsapp.unassigned")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const chatPanel = (
    <div className={`flex flex-col min-h-[70vh] ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center">
            <MessageCircle size={28} className="text-[#128C7E]" />
          </div>
          <p className="text-sm font-medium text-slate-500">{t("admin.whatsapp.emptyInbox")}</p>
          <p className="text-xs text-slate-400 max-w-xs">{t("admin.whatsapp.selectConversation")}</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="md:hidden p-1 rounded-lg hover:bg-slate-100"
                onClick={() => setMobileShowChat(false)}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{conversationLabel(selected)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500">{selected.waPhoneDisplay}</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selected.within24hWindow
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-amber-50 text-amber-800 border border-amber-100"
                    }`}
                  >
                    {selected.within24hWindow
                      ? t("admin.whatsapp.window24hActive")
                      : t("admin.whatsapp.window24hExpired")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selected.patientProfileId && (
                <Link
                  href={`/admin/patients/${selected.patientProfileId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-2.5 py-1.5 rounded-lg hover:bg-brand-100"
                >
                  <ExternalLink size={12} /> {t("admin.whatsapp.viewPatient")}
                </Link>
              )}
              <button
                type="button"
                disabled={patching}
                onClick={() => patchConversation({ assignedToUserId: adminUserId })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <UserPlus size={12} /> {t("admin.whatsapp.assignToMe")}
              </button>
              <button
                type="button"
                disabled={patching}
                onClick={() =>
                  patchConversation({
                    status: selected.status === "open" ? "closed" : "open",
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {selected.status === "open" ? (
                  <>
                    <XCircle size={12} /> {t("admin.whatsapp.close")}
                  </>
                ) : (
                  <>
                    <RotateCcw size={12} /> {t("admin.whatsapp.reopen")}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5]/30">
            {loadingChat && messages.length === 0 ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                  >
                    <div className="h-12 w-48 rounded-2xl bg-white/70 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm font-medium text-slate-600">{t("admin.whatsapp.noInboundYet")}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{t("admin.whatsapp.noInboundHint")}</p>
              </div>
            ) : (
              messages.map((m) => {
                const outbound = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        outbound
                          ? "bg-[#dcf8c6] border border-[#c8e6b8] text-slate-800 rounded-br-md"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {m.type !== "text" && renderMediaChip(m.type)}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      <div className={`mt-1 flex items-center gap-2 text-[10px] ${outbound ? "justify-end" : ""}`}>
                        <span className="text-slate-400">{formatTime(m.createdAt, locale)}</span>
                        {outbound && m.sentByName && (
                          <span className="text-slate-500 flex items-center gap-0.5">
                            <User size={10} /> {m.sentByName}
                          </span>
                        )}
                        {outbound && (
                          <span
                            className={
                              m.status === "failed"
                                ? "text-rose-600 font-semibold"
                                : m.status === "read"
                                  ? "text-blue-600"
                                  : "text-slate-500"
                            }
                            title={m.errorDetail || undefined}
                          >
                            {statusIcon(m.status)}
                            {m.status === "failed" && ` ${t("admin.whatsapp.status.failed")}`}
                          </span>
                        )}
                      </div>
                      {outbound && m.status === "failed" && m.errorDetail && (
                        <p className="text-[10px] text-rose-600 mt-1">{m.errorDetail}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4 space-y-3">
            {buildWhatsAppUrl(selected.waPhoneDisplay, "") && (
              <a
                href={buildWhatsAppUrl(selected.waPhoneDisplay, "")!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#128C7E] hover:text-[#0f6b5c]"
              >
                <ExternalLink size={12} />
                {t("admin.whatsapp.openPersonalWhatsApp")}
              </a>
            )}
            {!selected.within24hWindow ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <p className="font-semibold">{t("admin.whatsapp.outside24h")}</p>
                <p className="text-xs mt-1 text-amber-800">{t("admin.whatsapp.outside24hHint")}</p>
              </div>
            ) : (
              <>
                {sendError && (
                  <p className="text-xs text-rose-600 mb-2">{sendError}</p>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={t("admin.whatsapp.composerPlaceholder")}
                    rows={2}
                    className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !composer.trim()}
                    className="inline-flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageCircle size={24} className="text-[#25D366]" />
          {t("admin.whatsapp.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.whatsapp.subtitle")}</p>
        {deepLinkError && (
          <p className="text-sm text-amber-700 mt-2">{deepLinkError}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid md:grid-cols-[320px_1fr] min-h-[70vh]">
        {listPanel}
        {chatPanel}
      </div>
    </div>
  );
}
