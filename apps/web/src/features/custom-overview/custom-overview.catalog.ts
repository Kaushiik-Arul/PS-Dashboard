import type { CustomOverviewWidgetDefinition } from "./custom-overview.types";

const kpi = (id: CustomOverviewWidgetDefinition["id"], title: string, source: CustomOverviewWidgetDefinition["source"]): CustomOverviewWidgetDefinition => ({ id, title, source, kind: "KPI" });
const chart = (id: CustomOverviewWidgetDefinition["id"], title: string, source: CustomOverviewWidgetDefinition["source"]): CustomOverviewWidgetDefinition => ({ id, title, source, kind: "Chart" });

export const customOverviewWidgets: readonly CustomOverviewWidgetDefinition[] = [
  kpi("demographics.kpi.total-hc", "Total HC", "Demographics"),
  kpi("demographics.kpi.direct-hc", "Direct HC", "Demographics"),
  kpi("demographics.kpi.indirect-hc", "Indirect HC", "Demographics"),
  kpi("demographics.kpi.female-pct", "Female %", "Demographics"),
  kpi("demographics.kpi.avg-age", "Average age", "Demographics"),
  kpi("demographics.kpi.avg-tenure", "Average tenure", "Demographics"),
  kpi("demographics.kpi.ret-3yrs", "Retirement < 3 years", "Demographics"),
  kpi("demographics.kpi.maternity", "Maternity", "Demographics"),
  kpi("demographics.kpi.sabbatical", "Sabbatical", "Demographics"),
  kpi("demographics.kpi.crl", "CRL", "Demographics"),
  chart("demographics.chart.headcount-by-level", "Headcount by Level", "Demographics"),
  chart("demographics.chart.gender-distribution", "Gender distribution", "Demographics"),
  chart("demographics.chart.headcount-by-function", "Headcount by function", "Demographics"),
  chart("demographics.chart.headcount-by-location", "Headcount by location", "Demographics"),
  chart("demographics.chart.age-profile", "Age Profile", "Demographics"),
  chart("demographics.chart.tenure-profile", "Tenure Profile", "Demographics"),
  chart("demographics.chart.workforce-status", "Workforce Status", "Demographics"),
  chart("demographics.chart.retirement-analysis", "Retirement Analysis", "Demographics"),
  kpi("succession.kpi.total-positions", "Total positions", "Succession Planning"),
  kpi("succession.kpi.successor-1-ready-now", "Successor 1 - Ready now", "Succession Planning"),
  kpi("succession.kpi.successor-1-ready-one-two", "Successor 1 - Ready in 1-2 years", "Succession Planning"),
  kpi("succession.kpi.successor-1-ready-three-four", "Successor 1 - Ready in 3-4 years", "Succession Planning"),
  kpi("succession.kpi.successor-1-ready-later", "Successor 1 - Ready later", "Succession Planning"),
  kpi("succession.kpi.successor-2-ready-now", "Successor 2 - Ready now", "Succession Planning"),
  kpi("succession.kpi.successor-2-ready-one-two", "Successor 2 - Ready in 1-2 years", "Succession Planning"),
  kpi("succession.kpi.successor-2-ready-three-four", "Successor 2 - Ready in 3-4 years", "Succession Planning"),
  kpi("succession.kpi.successor-2-ready-later", "Successor 2 - Ready later", "Succession Planning"),
  chart("succession.chart.positions-by-criticality", "Positions by Criticality", "Succession Planning"),
  chart("succession.chart.incumbent-change-expected", "Incumbent change expected", "Succession Planning"),
];

export const customOverviewWidgetMap = new Map(customOverviewWidgets.map((widget) => [widget.id, widget]));
