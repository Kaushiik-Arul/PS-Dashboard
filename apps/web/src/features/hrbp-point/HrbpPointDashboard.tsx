"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";

export function HrbpPointDashboard() {
  const { role } = useAuth();

  if (!hasPermission(role, "viewHrbpPoint")) {
    redirect("/");
  }

  return (
    <main className="placeholder-page">
      <h1>HRBP Point</h1>
      <p>HRBP Point analysis will appear here.</p>
    </main>
  );
}
