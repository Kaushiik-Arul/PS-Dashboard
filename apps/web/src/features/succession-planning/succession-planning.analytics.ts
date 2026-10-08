import type { ChartDatum } from "@/components/charts/OverviewCharts";
import type { SuccessionPlanningRecord } from "./succession-planning.types";

export const readinessOrder = [
  "Ready now",
  "Ready in 1-2 years",
  "Ready in 2-3 years",
  "Ready in 3-4 years",
  "Ready later / TBD",
] as const;

export type Readiness = (typeof readinessOrder)[number];
export type SuccessorNumber = 1 | 2;

export function readinessCategory(value: string): Readiness | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("now")) return "Ready now";
  if (/1\s*-\s*2/.test(normalized)) return "Ready in 1-2 years";
  if (/2\s*-\s*3/.test(normalized)) return "Ready in 2-3 years";
  if (/3\s*-\s*4/.test(normalized)) return "Ready in 3-4 years";
  return "Ready later / TBD";
}

export function percentage(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}% of positions` : "No positions";
}

function employeeCount(value: string) {
  return value.match(/\d+/g)?.length ?? 0;
}

function chartValue(label: string, value: number, total: number): ChartDatum {
  return {
    label,
    value,
    displayValue: `${value.toLocaleString("en-US")} (${total ? ((value / total) * 100).toFixed(1) : "0.0"}%)`,
  };
}

export function summarizeSuccessionPlanning(rows: SuccessionPlanningRecord[]) {
  const successor1Readiness = new Map<Readiness, number>(readinessOrder.map((label) => [label, 0]));
  const successor2Readiness = new Map<Readiness, number>(readinessOrder.map((label) => [label, 0]));
  const criticalities = new Map<string, number>();

  for (const row of rows) {
    const criticality = row.priority.trim() || "Not specified";
    criticalities.set(criticality, (criticalities.get(criticality) ?? 0) + 1);

    const successors = [
      [row.successor1_pers_no, row.successor1_readiness, successor1Readiness],
      [row.successor2_pers_no, row.successor2_readiness, successor2Readiness],
    ] as const;
    for (const [employeeNumbers, readinessValue, readiness] of successors) {
      const count = employeeCount(employeeNumbers);
      const category = readinessCategory(readinessValue);
      if (!count || !category) continue;
      readiness.set(category, (readiness.get(category) ?? 0) + count);
    }
  }

  const totalPositions = rows.length;
  const years = new Map<string, number>();
  for (const row of rows) {
    const value = row.incumbent_change_year.trim();
    if (!value) continue;
    years.set(value, (years.get(value) ?? 0) + 1);
  }

  return {
    totalPositions,
    successor1Readiness,
    successor2Readiness,
    criticalityChart: [...criticalities.entries()]
      .filter(([, value]) => value > 0)
      .map(([label, value], index) => ({
        ...chartValue(label, value, totalPositions),
        color: `var(--data-visualization-${(index % 6) + 1})`,
      })),
    yearChart: [...years.entries()]
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([label, value]) => ({ label, value })),
  };
}
