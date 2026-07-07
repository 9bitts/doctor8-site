"use client";

import type { ReactNode } from "react";
import type { NavIconKey, PlatformNavEntry } from "@/lib/platform-nav-registry";
import {
  LayoutDashboard, FileText, Pill, Calendar, MessageSquare,
  UserCog, ClipboardList, Users, Inbox, Layers, CreditCard,
  BookOpen, Radio, TrendingUp, MapPin, ShoppingBag, Brain, BarChart3,
  Shield, Briefcase, FileSpreadsheet, Receipt, Package, Megaphone, Sparkles, Heart, Leaf, FlaskConical, Flower2, Plug, ScrollText, PieChart, Settings, Stethoscope, Building2, Video,
} from "lucide-react";

export interface DashboardNavItem extends PlatformNavEntry {
  icon: ReactNode;
}

const ICONS: Record<NavIconKey, ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  FileText: <FileText size={18} />,
  Pill: <Pill size={18} />,
  ShoppingBag: <ShoppingBag size={18} />,
  Sparkles: <Sparkles size={18} />,
  Stethoscope: <Stethoscope size={18} />,
  FlaskConical: <FlaskConical size={18} />,
  Flower2: <Flower2 size={18} />,
  Calendar: <Calendar size={18} />,
  Users: <Users size={18} />,
  Leaf: <Leaf size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  BookOpen: <BookOpen size={18} />,
  MessageSquare: <MessageSquare size={18} />,
  Radio: <Radio size={18} />,
  Heart: <Heart size={18} />,
  MapPin: <MapPin size={18} />,
  Settings: <Settings size={18} />,
  UserCog: <UserCog size={18} />,
  Brain: <Brain size={18} />,
  Inbox: <Inbox size={18} />,
  Layers: <Layers size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  BarChart3: <BarChart3 size={18} />,
  Shield: <Shield size={18} />,
  Briefcase: <Briefcase size={18} />,
  FileSpreadsheet: <FileSpreadsheet size={18} />,
  Receipt: <Receipt size={18} />,
  Package: <Package size={18} />,
  Megaphone: <Megaphone size={18} />,
  Building2: <Building2 size={18} />,
  CreditCard: <CreditCard size={18} />,
  Plug: <Plug size={18} />,
  ScrollText: <ScrollText size={18} />,
  PieChart: <PieChart size={18} />,
  Video: <Video size={18} />,
};

export function withNavIcons(entries: PlatformNavEntry[]): DashboardNavItem[] {
  return entries.map((entry) => ({
    ...entry,
    icon: ICONS[entry.iconKey] ?? ICONS.LayoutDashboard,
  }));
}
