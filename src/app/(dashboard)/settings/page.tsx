"use client";

// src/app/(dashboard)/settings/page.tsx
// Account settings — change password, change email (requested features)

import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield, Mail, Lock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account security and preferences.</p>
      </div>
      <ChangePasswordForm />
      <ChangeEmailForm />
      <SecurityInfo />
    </div>
  );
}

// ─── CHANGE PASSWORD ───────────────────────────────────────
function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { label: "At least 8 characters", ok: newPass.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(newPass) },
    { label: "One number", ok: /[0-9]/.test(newPass) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(newPass) },
    { label: "Passwords match", ok: newPass === confirm && confirm.length > 0 },
  ];
  const allValid = rules.every((r) => r.ok) && current.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to change password"); return; }
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => setSuccess(false), 4000);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <Card icon={<Lock size={18} className="text-emerald-600" />} title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">Password changed successfully! All other sessions have been logged out.</Alert>}

        <PasswordField label="Current password" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
        <PasswordField label="New password" value={newPass} onChange={setNewPass} show={showNew} onToggle={() => setShowNew(!showNew)} />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />

        {newPass && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <CheckCircle2 size={13} className={r.ok ? "text-emerald-500" : "text-slate-300"} />
                <span className={`text-xs ${r.ok ? "text-emerald-700" : "text-slate-500"}`}>{r.label}</span>
              </div>
            ))}
          </div>
        )}

        <button type="submit" disabled={loading || !allValid} className="w-full btn-primary">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Changing password...</> : "Change password"}
        </button>
      </form>
    </Card>
  );
}

// ─── CHANGE EMAIL ──────────────────────────────────────────
function ChangeEmailForm() {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to request email change"); return; }
      setSuccess(true);
      setNewEmail(""); setPassword("");
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <Card icon={<Mail size={18} className="text-blue-600" />} title="Change Email Address">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {success && (
          <Alert type="success">
            Verification email sent! Check both your old and new email to confirm the change.
          </Alert>
        )}
        {!success && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New email address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="inp"
              />
            </div>
            <PasswordField label="Confirm your current password" value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(!showPass)} />
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
              We will send a verification link to both your <strong>old</strong> and <strong>new</strong> email address.
              The change only takes effect after you confirm both.
            </p>
            <button type="submit" disabled={loading || !newEmail || !password} className="w-full btn-primary">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Sending verification...</> : "Request email change"}
            </button>
          </>
        )}
      </form>
    </Card>
  );
}

// ─── SECURITY INFO ─────────────────────────────────────────
function SecurityInfo() {
  return (
    <Card icon={<Shield size={18} className="text-violet-600" />} title="Security & Compliance">
      <div className="space-y-3">
        {[
          { label: "Data encryption", value: "AES-256-GCM — all health data encrypted at rest" },
          { label: "Session timeout", value: "15 minutes of inactivity (HIPAA requirement)" },
          { label: "Account lockout", value: "After 5 failed login attempts — 30 minute lockout" },
          { label: "Compliance", value: "HIPAA (US) and GDPR (EU) compliant" },
          { label: "Audit logs", value: "All access to your health data is logged" },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
            <span className="text-xs text-slate-500 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────
function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="inp pr-11"
          required
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center">{icon}</div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Alert({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  const s = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${s}`}>
      {type === "error" ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
      {children}
    </div>
  );
}

// Inline styles
const _styles = `
  <style>
    .inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1e293b; outline: none; }
    .inp:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
    .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #10b981; color: white; border: none; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary:not(:disabled):hover { background: #059669; }
  </style>
`;
