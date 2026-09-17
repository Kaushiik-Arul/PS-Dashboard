"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";
import type { UserRole } from "@/auth/roles";

import { UserProfile } from "./UserProfile";
import { useState, type ReactNode } from "react";

const navigationItems = [
  { href: "/", label: "Overview", icon: "boschicon-bosch-ic-home" },
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
    href: "/hrbp-point",
    label: "HRBP Point",
    icon: "boschicon-bosch-ic-chart-bar",
  },
];

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "hrbp", label: "HRBP" },
  { value: "Range Head", label: "Range Head" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin" },
];

function isCurrentRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, setRole } = useAuth();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (item.href === "/hrbp-point") {
      return hasPermission(role, "viewHrbpPoint");
    }

    if (item.href === "/succession-planning") {
      return hasPermission(role, "successionPlanningPoint");
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
            <select
              className="app-shell__role-select"
              aria-label="Simulated role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Link
              href="/"
              className="o-minimal-header__logo app-shell__bosch-logo"
              aria-label="Bosch home"
            >
              <svg
                viewBox="50 70 460 90"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="#ed0007"
                  d="M248.8,110.3a13.766,13.766,0,0,0,8.8-13c0-11.7-8.3-17.5-19.7-17.5H208v63.6h32.5c10,0,19.8-7,19.8-17.7C260.3,113,248.8,110.4,248.8,110.3ZM223.6,93h11.6a5.669,5.669,0,0,1,6,6,5.927,5.927,0,0,1-6.3,5.8H223.6V93Zm11.7,37.1H223.6V117.6H235c5.7,0,8.4,2.5,8.4,6.2C243.4,128.4,240,130.1,235.3,130.1Z"
                />
                <path
                  fill="#ed0007"
                  d="M294.7,78.2c-18.4,0-29.2,14.7-29.2,33.3,0,18.7,10.8,33.3,29.2,33.3,18.5,0,29.2-14.6,29.2-33.3C323.9,92.9,313.2,78.2,294.7,78.2Zm0,51.4c-9,0-13.5-8.1-13.5-18.1s4.5-18,13.5-18,13.6,8.1,13.6,18C308.3,121.6,303.7,129.6,294.7,129.6Z"
                />
                <path
                  fill="#ed0007"
                  d="M357.8,104.8l-2.2-.5c-5.4-1.1-9.7-2.5-9.7-6.4,0-4.2,4.1-5.9,7.7-5.9a17.894,17.894,0,0,1,13,5.9l9.9-9.8c-4.5-5.1-11.8-10-23.2-10-13.4,0-23.6,7.5-23.6,20,0,11.4,8.2,17,18.2,19.1l2.2.5c8.3,1.7,11.4,3,11.4,7,0,3.8-3.4,6.3-8.6,6.3-6.2,0-11.8-2.7-16.1-8.2l-10.1,10c5.6,6.7,12.7,11.9,26.4,11.9,11.9,0,24.6-6.8,24.6-20.7C377.9,109.5,366.9,106.7,357.8,104.8Z"
                />
                <path
                  fill="#ed0007"
                  d="M413.3,129.6c-7,0-14.3-5.8-14.3-18.5,0-11.3,6.8-17.6,13.9-17.6,5.6,0,8.9,2.6,11.5,7.1l12.8-8.5c-6.4-9.7-14-13.8-24.5-13.8-19.2,0-29.6,14.9-29.6,32.9,0,18.9,11.5,33.7,29.4,33.7,12.6,0,18.6-4.4,25.1-13.8l-12.9-8.7C422.1,126.6,419.3,129.6,413.3,129.6Z"
                />
                <polygon
                  fill="#ed0007"
                  points="479.9 79.8 479.9 103.2 460.6 103.2 460.6 79.8 443.9 79.8 443.9 143.4 460.6 143.4 460.6 118.3 479.9 118.3 479.9 143.4 496.6 143.4 496.6 79.8 479.9 79.8"
                />
                <path d="M111.8,63.6A48.2,48.2,0,1,0,160,111.8,48.226,48.226,0,0,0,111.8,63.6Zm0,91.9a43.7,43.7,0,1,1,43.7-43.7A43.745,43.745,0,0,1,111.8,155.5Z" />
                <path d="M131.7,81.7h-3.3V98.2H95.3V81.7H91.9a36.063,36.063,0,0,0,0,60.2h3.4V125.4h33.1v16.5h3.3a36.063,36.063,0,0,0,0-60.2Zm-41,53.7a31.572,31.572,0,0,1,0-47.2Zm37.7-14.6H95.3V102.7h33.1Zm4.5,14.5v-10h0V98.2h0v-10a31.66,31.66,0,0,1,0,47.1Z" />
              </svg>
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