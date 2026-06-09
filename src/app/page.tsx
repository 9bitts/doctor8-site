// src/app/page.tsx
// Root page — redirects to registration (role choice screen)
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/register");
}
