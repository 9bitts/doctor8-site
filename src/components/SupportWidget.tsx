"use client";

// src/components/SupportWidget.tsx
// AI-powered support chat widget — floating button on all pages
// Uses Anthropic Claude (claude-haiku) to answer Doctor8 questions

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How do I book a consultation?",
  "How does Doctor8 work?",
  "How do I share my medical history?",
  "How do I register as a professional?",
];

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I am the Doctor8 assistant. How can I help you today?",
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setShowSuggestions(false);
    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.message || data.error || "Sorry, I could not process that. Please try again.",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
          style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}
        >
          <div className="bg-gradient-to-r from-slate-800 to-emerald-700 px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <Bot size={16} className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Doctor8 Support</p>
              <p className="text-emerald-300 text-xs">AI assistant · Always available</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition p-1">
              <Minimize2 size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-emerald-100" : "bg-slate-100"}`}>
                  {msg.role === "assistant" ? <Bot size={14} className="text-emerald-600" /> : <User size={14} className="text-slate-600" />}
                </div>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "assistant" ? "bg-slate-100 text-slate-800 rounded-tl-sm" : "bg-emerald-500 text-white rounded-tr-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-emerald-600" />
                </div>
                <div className="bg-slate-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && messages.length <= 1 && !loading && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
              <p className="text-xs text-slate-400 mb-2 font-medium">Suggested questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-xs bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-slate-600 px-2.5 py-1.5 rounded-full transition">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-white border-t border-slate-100 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-xl transition">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Open support chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />}
      </button>
    </>
  );
}
