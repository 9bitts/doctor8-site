"use client";

// src/app/(dashboard)/patient/messages/page.tsx
// Chat interface — same component used by patients and professionals

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Search, Loader2, MessageSquare, ArrowLeft } from "lucide-react";

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

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<string>("");
  const pollRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages();
      startPolling();
    }
    return () => stopPolling();
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/messages");
      const d = await res.json();
      setConversations(d.conversations || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(since?: string) {
    if (!activeConv) return;
    const url = `/api/messages?with=${activeConv.userId}${since ? `&since=${since}` : ""}`;
    const res = await fetch(url);
    const d = await res.json();
    const msgs: Message[] = d.messages || [];

    if (since && msgs.length > 0) {
      setMessages((prev) => [...prev, ...msgs]);
    } else if (!since) {
      setMessages(msgs);
    }

    if (msgs.length > 0) {
      lastMessageTime.current = msgs[msgs.length - 1].createdAt;
    }
  }

  function startPolling() {
    pollRef.current = setInterval(() => {
      if (lastMessageTime.current) {
        fetchMessages(lastMessageTime.current);
      }
    }, 4000); // Poll every 4 seconds
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

    // Optimistic update
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
      const msg = await res.json();

      // Replace temp message with real one
      setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? msg : m));
      lastMessageTime.current = msg.createdAt;

      // Update conversation list
      fetchConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  }

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex gap-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Sidebar — conversation list */}
      <div className={`w-full sm:w-80 border-r border-slate-200 flex flex-col shrink-0 ${activeConv ? "hidden sm:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 mb-3">Messages</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No conversations yet</p>
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
          {/* Chat header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 bg-white">
            <button onClick={() => setActiveConv(null)} className="sm:hidden text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {activeConv.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{activeConv.name}</p>
              <p className="text-xs text-emerald-500">🔒 End-to-end encrypted</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">No messages yet. Say hello!</p>
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="px-4 py-4 bg-white border-t border-slate-200 flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
              placeholder="Type a message... (Enter to send)"
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
            <p className="text-slate-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
