"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";

import { BoschLogo } from "./BoschLogo";
import { UserProfile } from "./UserProfile";
import { useEffect, useState, type ReactNode } from "react";

const navigationItems = [
  { href: "/", label: "Demographics", icon: "boschicon-bosch-ic-home" },
  {
    href: "/employee-360",
    label: "Employee 360",
    icon: "boschicon-bosch-ic-user",
  },
  {
    href: "/talent-pipeline",
    label: "Talent Pipeline",
    icon: "boschicon-bosch-ic-people",
  },
  {
    href: "/succession-planning",
    label: "Succession Planning",
    icon: "boschicon-bosch-ic-target",
  },
  {
    href: "/attrition",
    label: "Attrition",
    icon: "boschicon-bosch-ic-exit",
  },
  {
    href: "/hrbp-point",
    label: "HRBP Point",
    icon: "boschicon-bosch-ic-chart-bar",
  },
  {
    href: "/access-point",
    label: "Access Point",
    icon: "boschicon-bosch-ic-keys-user-access",
  },
];

function isCurrentRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, isLoading } = useAuth();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const isAuthRoute = pathname === "/login" || pathname === "/change-password";

  useEffect(() => {
    if (isAuthRoute || isLoading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    } else if (user.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [isAuthRoute, isLoading, pathname, router, user]);

  if (isAuthRoute) return children;

  if (isLoading) {
    return <main className="auth-loading">Checking your session...</main>;
  }

  if (!user) {
    return <main className="auth-loading">Redirecting to sign in...</main>;
  }

  if (user.mustChangePassword) {
    return <main className="auth-loading">Password change required...</main>;
  }
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (item.href === "/employee-360") {
      return hasPermission(role, "viewEmployee360");
    }

    if (item.href === "/talent-pipeline") {
      return hasPermission(role, "viewTalentPipeline");
    }

    if (item.href === "/hrbp-point") {
      return hasPermission(role, "viewHrbpPoint");
    }

    if (item.href === "/succession-planning") {
      return hasPermission(role, "successionPlanningPoint");
    }

    if (item.href === "/attrition") {
      return hasPermission(role, "attritionPoint");
    }

    if (item.href === "/access-point") {
      return hasPermission(role, "manageAccessPoint");
    }

    return true;
  });
  const activeItem =
    visibleNavigationItems.find((item) => isCurrentRoute(pathname, item.href)) ??
    visibleNavigationItems[0];

  return (
    <>
      <a className="app-shell__skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="o-minimal-header -primary">
        <div className="o-minimal-header__supergraphic" />
        <div className="o-minimal-header__top">
          <div className="o-minimal-header__burger">
            <button
              type="button"
              className="a-button a-button--integrated"
              aria-label="Open side navigation"
              aria-expanded={isNavigationOpen}
              onClick={() => setIsNavigationOpen(true)}
            >
              <i className="a-icon a-button__icon ui-ic-menu" aria-hidden="true" />
            </button>
          </div>
          <div className="o-minimal-header__title">{activeItem.label}</div>
          <div className="app-shell__header-actions">
            <Link
              href="/"
              className="o-minimal-header__logo app-shell__bosch-logo"
              aria-label="Bosch home"
            >
              <BoschLogo />
            </Link>
          </div>
        </div>
      </header>

      <nav
        className={`m-side-navigation -contrast${isNavigationOpen ? " -open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="m-side-navigation__header">
          <div className="m-side-navigation__header__label -size-l-bold">
            Power Solution
          </div>
          <button
            type="button"
            className="a-button a-button--integrated m-side-navigation__header__trigger -open"
            aria-label="Open side navigation"
            onClick={() => setIsNavigationOpen(true)}
          >
            <i
              className="a-icon a-button__icon boschicon-bosch-ic-list-view-mobile"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="a-button a-button--integrated m-side-navigation__header__trigger -close"
            aria-label="Close side navigation"
            onClick={() => setIsNavigationOpen(false)}
          >
            <i
              className="a-icon a-button__icon boschicon-bosch-ic-close"
              aria-hidden="true"
            />
          </button>
        </div>

        <ul className="m-menu-group" role="menubar" aria-orientation="vertical">
          {visibleNavigationItems.map((item) => {
            const isActive = isCurrentRoute(pathname, item.href);

            return (
              <li
                key={item.href}
                className={`a-menu-item${isActive ? " -selected" : ""}`}
                role="none"
              >
                <div className="a-menu-item__wrapper">
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="a-menu-item__link"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsNavigationOpen(false)}
                  >
                    <i className={`a-icon ${item.icon}`} aria-hidden="true" />
                    <span className="a-menu-item__label">{item.label}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <UserProfile isCollapsed={!isNavigationOpen} />
      </nav>

      <div
        id="main-content"
        tabIndex={-1}
        className={`app-shell__content${isNavigationOpen ? " app-shell__content--navigation-open" : ""}`}
      >
        {children}
      </div>
    </>
  );
}