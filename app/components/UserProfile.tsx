"use client";

import { useRouter } from "next/navigation";

export function UserProfile({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const router = useRouter();

  return (
    <div className="app-shell__user-profile">
      <div className="app-shell__user-profile-avatar" aria-hidden="true">
        <i className="a-icon boschicon-bosch-ic-user" />
      </div>

      {!isCollapsed && (
        <div className="app-shell__user-profile-info">
          <span className="app-shell__user-profile-name">John Doe</span>
          <span className="app-shell__user-profile-role">HR Business Partner</span>
        </div>
      )}

      {!isCollapsed && (
        <button
          type="button"
          className="app-shell__user-profile-settings"
          aria-label="Settings"
          onClick={() => router.push("/settings")}
        >
          <i className="a-icon boschicon-bosch-ic-settings" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
