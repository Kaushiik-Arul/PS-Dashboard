"use client";

import { useId, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";
import "./overview-charts.css";

function positionChartTooltip(event: ReactPointerEvent<HTMLElement>) {
  const horizontalOffset = event.clientX > window.innerWidth - 288 ? -272 : 16;
  const verticalOffset = event.clientY > window.innerHeight - 96 ? -72 : 16;

  event.currentTarget.style.setProperty("--chart-tooltip-x", `${event.clientX + horizontalOffset}px`);
  event.currentTarget.style.setProperty("--chart-tooltip-y", `${event.clientY + verticalOffset}px`);
}

export interface ChartDatum {
  label: string;
  value: number;
  displayValue?: string;
}

interface ChartCardProps {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
  onDownload?: () => void;
}

export function ChartCard({
  title,
  description,
  className = "",
  children,
  onDownload,
}: ChartCardProps) {
  const { role } = useAuth();
  const canDownload = hasPermission(role, "exportCharts");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  const menuId = useId();

  return (
    <article className={`chart-card ${className}`.trim()}>
      <header className="chart-card__header">

        {/* Title + description */}
        <div>
          <h2 className="chart-card__title">{title}</h2>

          {isDescriptionVisible && (
            <p className="chart-card__description">
              {description}
            </p>
          )}
        </div>

        {/* Header actions */}
        <div className="chart-card__actions">

          {/* Three-dot menu */}
          <div
            className="chart-card__menu-control"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsMenuOpen(false);
              }
            }}
          >
            <button
              className="a-button a-button--integrated chart-card__menu-trigger"
              type="button"
              aria-label={`Options for ${title}`}
              aria-expanded={isMenuOpen}
              aria-controls={menuId}
              aria-haspopup="menu"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <i
                className="a-icon a-button__icon boschicon-bosch-ic-options"
                aria-hidden="true"
              />
            </button>

            {isMenuOpen && (
              <div
                className="a-box chart-card__menu"
                id={menuId}
                role="menu"
              >
                <button
                  className="a-button a-button--integrated -small"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsDescriptionVisible((visible) => !visible);
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="a-button__label">
                    {isDescriptionVisible
                      ? "Hide context"
                      : "Show context"}
                  </span>
                </button>
              </div>
            )}
          </div>
                    {/* Download */}
          {onDownload && canDownload && (
            <button
              className="a-button a-button--integrated chart-card__download"
              type="button"
              aria-label={`Download ${title}`}
              title="Download Excel"
              onClick={onDownload}
            >
              <i
                className="a-icon a-button__icon boschicon-bosch-ic-download"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </header>

      {/* Chart */}
      <div className="chart-card__body">
        {children}
      </div>
    </article>
  );
}

export function HorizontalBarChart({ data }: { data: ChartDatum[] }) {
  const maximum = Math.max(...data.map((item) => item.value));

  return (
    <div className="horizontal-chart" role="group" aria-label="Horizontal bar chart">
      {data.map((item, index) => {
        const relativePercentage = maximum > 0 ? (item.value / maximum) * 100 : 0;
        const detail = `${item.label}: ${item.displayValue ?? item.value.toLocaleString()}. ${relativePercentage.toFixed(1)}% of the chart scale.`;

        return <div className="horizontal-chart__row chart-data-point" key={item.label} tabIndex={0} data-tooltip={detail} aria-label={detail} onPointerMove={positionChartTooltip}>
          <span className="horizontal-chart__label">{item.label}</span>
          <div className="horizontal-chart__track">
            <span className="horizontal-chart__bar" style={{ backgroundColor: `var(--data-visualization-${index % 2 === 0 ? 1 : 2})`, width: `${relativePercentage}%` }} />
          </div>
          <strong className="horizontal-chart__value">{item.displayValue ?? item.value.toLocaleString()}</strong>
        </div>;
      })}
    </div>
  );
}

interface DonutDatum extends ChartDatum {
  color: string;
}

export function DonutChart({ data, total }: { data: DonutDatum[]; total: string }) {
  const sum = data.reduce((accumulator, item) => accumulator + item.value, 0);
  const segments = data.map((item, index) => {
    const precedingTotal = data
      .slice(0, index)
      .reduce((accumulator, precedingItem) => accumulator + precedingItem.value, 0);
    const start = sum > 0 ? (precedingTotal / sum) * 100 : 0;
    const end = sum > 0 ? ((precedingTotal + item.value) / sum) * 100 : 0;
    const separator = data.length > 1 ? Math.min(0.18, (end - start) / 4) : 0;
    return `var(--background) ${start}% ${start + separator}%, ${item.color} ${start + separator}% ${end - separator}%, var(--background) ${end - separator}% ${end}%`;
  });

  return (
    <div className={`donut-chart${data.length > 3 ? " donut-chart--dense" : ""}`}>
      <div
        className="donut-chart__graphic chart-data-point"
        style={{ background: `conic-gradient(${segments.join(", ")})` }}
        role="img"
        tabIndex={0}
        data-tooltip={data.map((item) => `${item.label}: ${item.displayValue ?? item.value}`).join(", ")}
        aria-label={data.map((item) => `${item.label}: ${item.displayValue ?? item.value}`).join(", ")}
        onPointerMove={positionChartTooltip}
      >
        <div className="donut-chart__center">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <ul className="chart-legend">
        {data.map((item) => {
          const percentage = sum > 0 ? (item.value / sum) * 100 : 0;
          const detail = `${item.label}: ${item.displayValue ?? item.value.toLocaleString()}. ${percentage.toFixed(1)}% of total.`;

          return (
            <li className="chart-data-point" key={item.label} tabIndex={0} data-tooltip={detail} aria-label={detail} onPointerMove={positionChartTooltip}>
              <span className="chart-legend__marker" style={{ backgroundColor: item.color }} />
              <span className="chart-legend__label">{item.label}</span>
              <strong className="chart-legend__value">{item.displayValue ?? item.value}</strong>
              <div className="chart-legend__track" role="img" aria-label={`${percentage.toFixed(1)}% of total`}>
                <span style={{ backgroundColor: item.color, width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VerticalBarChart({ data, tone = "blue" }: { data: ChartDatum[]; tone?: "blue" | "turquoise" }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const maximum = Math.max(...data.map((item) => item.value));
  const axisMaximum = maximum > 0 ? maximum * 1.1 : 1;

  return (
    <div className={`vertical-chart vertical-chart--${tone}`} role="group" aria-label="Vertical bar chart">
      {data.map((item, index) => {
        const relativePercentage = (item.value / axisMaximum) * 100;
        const detail = `${item.label}: ${item.displayValue ?? item.value.toLocaleString()}. ${relativePercentage.toFixed(1)}% of the largest category.`;
        const isSelected = selectedIndex === index;
        const isDimmed = selectedIndex !== null && !isSelected;

        return <button
          className={`vertical-chart__item chart-data-point${isSelected ? " -selected" : ""}${isDimmed ? " -dimmed" : ""}`}
          key={item.label}
          type="button"
          data-tooltip={detail}
          aria-label={`${detail} ${isSelected ? "Close details" : "Show details"}.`}
          aria-pressed={isSelected}
          onClick={() => setSelectedIndex((current) => current === index ? null : index)}
          onPointerMove={positionChartTooltip}
        >
          <strong>{item.displayValue ?? item.value.toLocaleString()}</strong>
          <div className="vertical-chart__track">
            <span style={{ backgroundColor: `var(--data-visualization-${tone === "blue" ? (index % 2 === 0 ? 1 : 2) : (index % 2 === 0 ? 5 : 6)})`, height: `${relativePercentage}%` }} />
          </div>
          <span>{item.label}</span>
          {isSelected && (
            <span className="vertical-chart__popover" role="status">
              <strong>{item.label}</strong>
              <span>{item.displayValue ?? item.value.toLocaleString()}</span>
            </span>
          )}
        </button>;
      })}
    </div>
  );
}

interface RiskRow {
  functionName: string;
  oneYear: number;
  threeYears: number;
  fiveYears: number;
}

export function RetirementRiskTable({ rows }: { rows: RiskRow[] }) {
  const totals = rows.reduce(
    (summary, row) => ({
      oneYear: summary.oneYear + row.oneYear,
      threeYears: summary.threeYears + row.threeYears,
      fiveYears: summary.fiveYears + row.fiveYears,
    }),
    { oneYear: 0, threeYears: 0, fiveYears: 0 },
  );
  const maximumRisk = Math.max(...rows.flatMap((row) => [row.oneYear, row.threeYears, row.fiveYears]), 1);

  const renderHeatCell = (functionName: string, horizon: string, value: number) => {
    const relativeIntensity = value === 0 ? 0 : (value / maximumRisk) * 100;
    const heatIntensity = value === 0 ? 0 : 12 + relativeIntensity * 0.78;
    const detail = `${functionName}: ${value} employees reach retirement eligibility within ${horizon}. ${relativeIntensity.toFixed(0)}% of the highest displayed value.`;

    return (
      <td
        className={`chart-data-point risk-table__heat-cell${value === 0 ? " -zero" : ""}${heatIntensity >= 62 ? " -strong" : ""}`}
        tabIndex={0}
        data-tooltip={detail}
        aria-label={detail}
        onPointerMove={positionChartTooltip}
        style={{ "--heat-intensity": `${heatIntensity}%` } as CSSProperties}
      >
        {value}
      </td>
    );
  };

  return (
    <div className="risk-panel">
      <div className="risk-summary" aria-label="Retirement risk totals">
        <div className="chart-data-point" tabIndex={0} data-tooltip={`${totals.oneYear} employees reach retirement eligibility within 1 year.`} aria-label={`${totals.oneYear} employees reach retirement eligibility within 1 year.`} onPointerMove={positionChartTooltip}><span>Within 1 year</span><strong>{totals.oneYear}</strong></div>
        <div className="chart-data-point" tabIndex={0} data-tooltip={`${totals.threeYears} employees reach retirement eligibility within 3 years.`} aria-label={`${totals.threeYears} employees reach retirement eligibility within 3 years.`} onPointerMove={positionChartTooltip}><span>Within 3 years</span><strong>{totals.threeYears}</strong></div>
        <div className="chart-data-point" tabIndex={0} data-tooltip={`${totals.fiveYears} employees reach retirement eligibility within 5 years.`} aria-label={`${totals.fiveYears} employees reach retirement eligibility within 5 years.`} onPointerMove={positionChartTooltip}><span>Within 5 years</span><strong>{totals.fiveYears}</strong></div>
      </div>
      <div className="risk-heatmap">
        <div className="risk-heatmap__legend" aria-label="Risk concentration legend">
          <span>Lower</span>
          <i aria-hidden="true" />
          <span>Higher</span>
        </div>
        <div className="risk-table-scroll">
          <table className="risk-table">
            <thead><tr><th>Function</th><th>&lt; 1 yr</th><th>&lt; 3 yrs</th><th>&lt; 5 yrs</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.functionName}>
                  <th scope="row">{row.functionName}</th>
                  {renderHeatCell(row.functionName, "1 year", row.oneYear)}
                  {renderHeatCell(row.functionName, "3 years", row.threeYears)}
                  {renderHeatCell(row.functionName, "5 years", row.fiveYears)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MovementChart({ data, period }: { data: ChartDatum[]; period: string }) {
  const maximum = Math.max(...data.map((item) => item.value), 0);
  const movementTotal = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="movement-chart" role="group" aria-label={`${period} workforce movement`}>
      <span className="movement-chart__period">{period}</span>
      <div className="movement-chart__summary">
        {data.map((item, index) => {
          const percentage = movementTotal > 0 ? (item.value / movementTotal) * 100 : 0;
          const detail = `${item.label}: ${item.displayValue ?? item.value.toLocaleString()} employees, ${percentage.toFixed(1)}% of the displayed workforce groups.`;
          const className = `-series-${(index % 3) + 1}`;

          return <div className="movement-chart__metric chart-data-point" key={item.label} tabIndex={0} data-tooltip={detail} aria-label={detail} onPointerMove={positionChartTooltip}>
            <div className="movement-chart__metric-label">
              <span><i className={className} />{item.label}</span>
              <strong>{item.displayValue ?? item.value.toLocaleString()}</strong>
            </div>
            <div className="movement-chart__track">
              <span className={className} style={{ width: `${maximum > 0 ? (item.value / maximum) * 100 : 0}%` }} />
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
