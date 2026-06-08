"use client";

// src/app/(dashboard)/layout.tsx
// Shared layout for all dashboard pages — patient and professional
// Reads the logged-in user's role from the session so the menu adapts automatically.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, FileText, Pill, Calendar, MessageSquare,
  User, Settings, LogOut, Menu, X, Bell, ChevronRight,
  Stethoscope, ClipboardList, Users, BarChart3
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Patient
  { href: "/patient", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["PATIENT"] },
  { href: "/patient/history", label: "Medical History", icon: <FileText size={18} />, roles: ["PATIENT"] },
  { href: "/patient/medications", label: "Medications", icon: <Pill size={18} />, roles: ["PATIENT"] },
  { href: "/patient/appointments", label: "Appointments", icon: <Calendar size={18} />, roles: ["PATIENT"] },
  { href: "/patient/documents", label: "Documents", icon: <ClipboardList size={18} />, roles: ["PATIENT"] },
  { href: "/patient/messages", label: "Messages", icon: <MessageSquare size={18} />, roles: ["PATIENT"] },

  // Professional
  { href: "/professional", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/patients", label: "Patients", icon: <Users size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/appointments", label: "Appointments", icon: <Calendar size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/prescriptions", label: "Prescriptions", icon: <Stethoscope size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/messages", label: "Messages", icon: <MessageSquare size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/settings/availability", label: "Availability", icon: <Calendar size={18} />, roles: ["PROFESSIONAL"] },

  // Shared
  { href: "/settings", label: "Settings", icon: <Settings size={18} />, roles: ["PATIENT", "PROFESSIONAL", "ADMIN"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Read the real logged-in user from the session
  const [role, setRole] = useState<string>("PATIENT");
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role) setRole(session.user.role);
        if (session?.user?.name) {
          setUserName(session.user.name);
        } else if (session?.user?.email) {
          setUserName(session.user.email.split("@")[0]);
        }
      } catch {
        // keep defaults
      }
    }
    loadSession();
  }, []);

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const roleLabel = role === "PROFESSIONAL" ? "Professional" : role === "ADMIN" ? "Admin" : "Patient";

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
          <Link href="/" className="text-2xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <User size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu size={22} />
          </button>

          {/* Page title (filled by children via context in real app) */}
          <div className="lg:hidden">
            <span className="text-lg font-bold text-slate-900">
              Doctor<span className="text-emerald-500">8</span>
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-slate-400 hover:text-slate-600 transition p-2 rounded-xl hover:bg-slate-100">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
