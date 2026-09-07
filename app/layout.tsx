import type { Metadata } from "next";

import "@bosch/frontend.kit-npm/styles/frontend-kit-foundations.css";
import "@bosch/frontend.kit-npm/styles/frontend-kit-icons.css";
import "@bosch/frontend.kit-npm/bosch/semantic/index.css";
import "@bosch/frontend.kit-npm/bosch/semantic/fonts.css";
import "@bosch/frontend.kit-npm/bosch/components/components.css";
import "@bosch/frontend.kit-npm/bosch/gradations/gradations.css";
import "@bosch/frontend.kit-npm/bosch/backgrounds/light-mode-primary-schemes.css";
import "@bosch/frontend.kit-npm/bosch/backgrounds/light-mode-primary-nested-schemes.css";
import "@bosch/frontend.kit-npm/bosch/backgrounds/light-mode-secondary-schemes.css";
import "@bosch/frontend.kit-npm/bosch/backgrounds/light-mode-contrast-schemes.css";
import "@bosch/frontend.kit-npm/bosch/backgrounds/light-mode-contrast-nested-schemes.css";
import "@bosch/frontend.kit-npm/atoms/button.css";
import "@bosch/frontend.kit-npm/atoms/box.css";
import "@bosch/frontend.kit-npm/atoms/dropdown.css";
import "@bosch/frontend.kit-npm/atoms/icon.css";
import "@bosch/frontend.kit-npm/atoms/menuItem.css";
import "@bosch/frontend.kit-npm/molecules/menuGroup.css";
import "@bosch/frontend.kit-npm/molecules/sideNavigation.css";
import "@bosch/frontend.kit-npm/organisms/minimalHeader.css";
import "./globals.css";

import { AppShell } from "./components/AppShell";

export const metadata: Metadata = {
  title: "Power Solutions",
  description: "HRBP data management and workforce dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="-light-mode">
      <body className="-secondary">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}