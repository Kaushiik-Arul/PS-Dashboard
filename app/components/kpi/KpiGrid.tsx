import type { ReactNode } from "react";
import "./kpi-grid.css";

interface KpiGridProps {
  children: ReactNode;
}

export function KpiGrid({ children }: KpiGridProps) {
  return <div className="kpi-grid">{children}</div>;
}
