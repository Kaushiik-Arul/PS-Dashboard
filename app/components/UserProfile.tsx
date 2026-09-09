"use client";

import { useAuth } from "@/src/auth/AuthProvider";
import type { UserRole } from "@/src/auth/roles";

const roleLabels: Record<UserRole, string> = {
  hrbp: "HR Business Partner",
  "Range Head": "Range Head",
  manager: "Manager",
  employee: "Employee",
  admin: "Administrator",
};

export function UserProfile({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const { role } = useAuth();

  return (
    <div className="app-shell__user-profile">
      <div className="app-shell__user-profile-avatar" aria-hidden="true">
        <i className="a-icon boschicon-bosch-ic-user" />
      </div>

      {!isCollapsed && (
        <div className="app-shell__user-profile-info">
          <span className="app-shell__user-profile-name">John Doe</span>
          <span className="app-shell__user-profile-role">{roleLabels[role]}</span>
        </div>
      )}
    </div>
  );
}
