"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/src/auth/AuthProvider";
import { hasPermission } from "@/src/auth/permissions";

export default function HrbpPointPage() {
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
