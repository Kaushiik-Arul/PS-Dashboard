"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { getCsrfToken } from "@/auth/csrf";
import type { UserRole } from "@/auth/roles";

const roleLabels: Record<UserRole, string> = {
  hrbp: "HR Business Partner",
  admin: "Administrator",
  range_head: "Range Head",
  department_head: "Department Head",
  sub_department_head: "Sub-department Head",
};

export function UserProfile({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const { role, user, refreshSession } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    const csrfToken = getCsrfToken();
    setIsSigningOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    }).catch(() => null);
    await refreshSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="app-shell__user-profile">
      <div className="app-shell__user-profile-avatar" aria-hidden="true">
        <i className="a-icon boschicon-bosch-ic-user" />
      </div>

      {!isCollapsed && (
        <div className="app-shell__user-profile-info">
          <span className="app-shell__user-profile-name">
            {user?.displayName ?? "Signed out"}
          </span>
          <span className="app-shell__user-profile-role">
            {role ? roleLabels[role] : "Authentication required"}
          </span>
        </div>
      )}
      {user && !isCollapsed && (
        <button
          type="button"
          className="a-button a-button--integrated"
          aria-label="Sign out"
          title="Sign out"
          disabled={isSigningOut}
          onClick={() => void signOut()}
        >
          <i className="a-icon a-button__icon boschicon-bosch-ic-logout" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
