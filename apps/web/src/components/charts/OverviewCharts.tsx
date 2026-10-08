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

type IndiaLocation = {
  name: string;
  latitude: number;
  longitude: number;
  markerOffsetX?: number;
  markerOffsetY?: number;
};

const indiaLocations: Record<string, IndiaLocation> = {
  BAN: { name: "Bengaluru", latitude: 12.972, longitude: 77.595, markerOffsetX: 1.25, markerOffsetY: -1.5 },
  BANGALORE: { name: "Bengaluru", latitude: 12.972, longitude: 77.595, markerOffsetX: 1.25, markerOffsetY: -1.5 },
  BENGALURU: { name: "Bengaluru", latitude: 12.972, longitude: 77.595, markerOffsetX: 1.25, markerOffsetY: -1.5 },
  BID: { name: "Bidadi", latitude: 12.797, longitude: 77.386, markerOffsetX: -1.25, markerOffsetY: 1.5 },
  BIDADI: { name: "Bidadi", latitude: 12.797, longitude: 77.386, markerOffsetX: -1.25, markerOffsetY: 1.5 },
  CHENNAI: { name: "Chennai", latitude: 13.083, longitude: 80.271 },
  CHI: { name: "Chennai", latitude: 13.083, longitude: 80.271 },
  GAN: { name: "Gangaikondan", latitude: 8.86, longitude: 77.68 },
  GANGAIKONDAN: { name: "Gangaikondan", latitude: 8.86, longitude: 77.68 },
  GU: { name: "Gurugram", latitude: 28.46, longitude: 77.027 },
  GURGAON: { name: "Gurugram", latitude: 28.46, longitude: 77.027 },
  GURUGRAM: { name: "Gurugram", latitude: 28.46, longitude: 77.027 },
  JA: { name: "Jaipur", latitude: 26.912, longitude: 75.787 },
  JAIPUR: { name: "Jaipur", latitude: 26.912, longitude: 75.787 },
  NA: { name: "Nashik", latitude: 19.998, longitude: 73.79 },
  NASHIK: { name: "Nashik", latitude: 19.998, longitude: 73.79 },
  PU: { name: "Pune", latitude: 18.52, longitude: 73.857 },
  PUNE: { name: "Pune", latitude: 18.52, longitude: 73.857 },
};

const indiaLocationShortLabels: Record<string, string> = {
  Bengaluru: "BAN",
  Bidadi: "BID",
  Chennai: "CHI",
  Gangaikondan: "GAN",
  Gurugram: "GU",
  Jaipur: "JA",
  Nashik: "NA",
  Pune: "PU",
};

const indiaMapPath = `M68.17 23.62L68.36 23.97L68.75 23.97L68.81 24.31L70.03 24.17L71.12 24.40L70.66 25.70L70.10 25.94L70.17 26.55L69.51 26.74L69.59 27.18L70.37 28.01L70.87 27.71L71.90 27.96L72.39 28.77L72.95 29.03L73.40 29.95L73.97 30.20L73.93 30.49L74.70 31.07L74.61 31.89L75.37 32.23L74.68 32.49L74.71 32.84L73.63 33.09L73.40 34.38L74.13 35.12L73.18 35.86L72.51 35.90L73.06 36.70L74.69 37.10L75.42 36.96L77.52 35.49L79.34 35.99L80.05 35.42L80.41 35.48L79.40 34.00L78.89 33.97L78.94 33.38L79.41 33.19L79.55 32.68L78.97 32.34L78.74 32.70L78.40 32.53L78.78 31.99L78.78 31.31L79.10 31.45L79.43 31.02L81.03 30.25L80.37 29.75L80.08 28.82L81.88 27.86L82.71 27.72L82.74 27.50
L84.15 27.52L85.21 26.76L88.01 26.36L88.12 27.92L88.64 28.12L88.89 27.86L88.75 27.14L89.13 26.81L92.06 26.85L92.12 27.29L91.65 27.48L91.64 27.76L92.46 27.79L94.63 29.30L95.26 29.07L96.05 29.38L96.63 28.73L96.41 28.51L96.71 28.61L97.40 28.01L96.89 27.61L97.14 27.09L96.70 27.37L96.23 27.28L95.15 26.62L95.19 26.07L94.63 25.40L94.71 24.94L94.16 23.85L93.33 24.08L93.39 23.13L93.13 23.04L93.20 22.26L92.91 21.94L92.70 22.16L92.60 21.98L92.28 23.72L91.96 23.73L91.62 22.94L91.16 23.61L91.37 24.11L92.16 24.42L92.43 25.03L89.84 25.29L89.68 26.24L89.36 26.01L89.09 26.40L88.67 26.26L88.40 26.63L88.52 26.36L88.11 25.82L89.01 25.26L88.44 25.21L88.01 24.67
L88.74 24.28L88.56 23.65L89.00 23.22L89.10 21.64L88.72 21.68L88.64 22.08L88.25 21.56L88.02 22.22L88.19 22.10L87.80 21.70L86.91 21.34L86.87 20.78L87.07 20.72L86.37 19.95L85.04 19.39L84.13 18.31L82.31 17.04L82.30 16.56L81.27 16.29L80.94 15.71L80.68 15.89L80.26 15.67L80.05 15.07L80.35 13.28L79.76 11.67L79.88 10.31L79.29 10.26L78.90 9.49L79.19 9.28L78.27 9.02L78.07 8.37L77.55 8.07L76.55 8.90L75.87 11.12L75.20 12.00L74.52 14.24L73.46 16.05L72.86 18.69L73.07 19.02L72.99 19.19L72.81 18.89L72.89 19.52L72.66 19.83L72.93 20.76L72.60 21.30L72.93 21.68L72.54 21.66L72.75 21.97L72.51 21.98L72.91 22.26L72.33 22.31L72.11 21.20L70.82 20.69L68.94 22.31
L70.17 22.54L70.45 22.97L69.20 22.84L68.43 23.51L68.81 23.88Z M93.66 7.12L93.85 7.24L93.96 7.01L93.84 6.76Z M92.38 10.78L92.62 10.76L92.50 10.51Z M92.52 11.84L92.70 12.24L92.80 11.90L92.72 11.47Z M92.69 12.60L92.82 12.89L92.99 12.71L92.89 12.31Z M92.79 13.01L92.93 13.53L93.10 13.33Z`;

const indiaMapBounds = { left: 67.5, top: 4.3, width: 30.5, height: 32.2 };

function projectIndiaLocation(location: IndiaLocation) {
  return {
    x: ((location.longitude - indiaMapBounds.left) / indiaMapBounds.width) * 100 + (location.markerOffsetX ?? 0),
    y: ((42 - location.latitude - indiaMapBounds.top) / indiaMapBounds.height) * 100 + (location.markerOffsetY ?? 0),
  };
}

function normalizeLocation(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

interface ChartCardProps {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
  onDownload?: () => void;
  sourceLabel?: string;
}

export function ChartCard({
  title,
  description,
  className = "",
  children,
  onDownload,
  sourceLabel,
}: ChartCardProps) {
  const { role } = useAuth();
  const canDownload = hasPermission(role, "exportCharts");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  const menuId = useId();

  return (
    <article className={`chart-card${sourceLabel ? " chart-card--with-source" : ""} ${className}`.trim()}>
      <header className="chart-card__header">

        {/* Title + description */}
        <div>
          {sourceLabel && <span className="chart-card__source">{sourceLabel}</span>}
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

export function HorizontalBarChart({
  data,
  maximum: maximumProp,
}: {
  data: ChartDatum[];
  maximum?: number;
}) {
  const maximum = maximumProp ?? Math.max(...data.map((item) => item.value));

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

export function JoinedFunnelChart({ data }: { data: ChartDatum[] }) {
  const maximum = Math.max(...data.map((item) => item.value), 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="joined-funnel-chart" role="group" aria-label="Centered headcount funnel chart">
      {data.map((item) => {
        const width = maximum > 0 ? (item.value / maximum) * 100 : 0;
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const detail = `${item.label}: ${item.value.toLocaleString("en-US")} employees (${percentage.toFixed(1)}%).`;

        return (
          <div
            className="joined-funnel-chart__row chart-data-point"
            key={item.label}
            tabIndex={0}
            data-tooltip={detail}
            aria-label={detail}
            onPointerMove={positionChartTooltip}
          >
            <span className="joined-funnel-chart__label">{item.label}</span>
            <div
              className="joined-funnel-chart__plot"
              style={{ "--funnel-width": `${width}%` } as CSSProperties}
            >
              <span className="joined-funnel-chart__axis" aria-hidden="true" />
              <span className="joined-funnel-chart__bar" aria-hidden="true" />
            </div>
            <strong className="joined-funnel-chart__value">{item.displayValue ?? item.value.toLocaleString("en-US")}</strong>
          </div>
        );
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

export function IndiaLocationMap({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maximum = Math.max(...data.map((item) => item.value), 0);
  const mappedLocations = data.flatMap((item, index) => {
    const location = indiaLocations[normalizeLocation(item.label)];
    return location ? [{ item, location, index }] : [];
  });

  return (
    <div className="india-location-map">
      <div className="india-location-map__canvas" role="group" aria-label="Employee locations in India">
        <svg className="india-location-map__outline" viewBox="67.5 4.3 30.5 32.2" role="img" aria-label="Map of India">
          <g transform="translate(0 42) scale(1 -1)">
            <path className="india-location-map__geography" d={indiaMapPath} />
            <path d="M68.18 23.6 68.38 23.97 68.86 24.21 69.59 24.29 70.03 24.17 70.57 24.42 70.81 24.22 71.1 24.69 70.89 25.15 70.67 25.4 70.67 25.68 70.27 25.71 70.1 25.94 70.17 26.55 69.51 26.74 69.59 27.18 70.02 27.56 70.37 28.01 70.56 28.02 70.76 27.72 71.9 27.96 72.4 28.78 72.95 29.03 73.28 29.57 73.4 29.95 73.97 30.2 73.88 30.36 74.32 30.85 74.69 31.13 74.51 31.13 74.65 31.45 74.49 31.72 74.93 32.07 75.26 32.1 75.33 32.33 75.03 32.5 74.68 32.49 74.71 32.84 74.51 32.75 74.32 33.03 74 33.24 74.16 33.34 73.98 33.64 74.26 34.01 73.9 34.05 73.94 34.34 73.77 34.33 73.97 34.69 74.31 34.78 75.27 34.64 75.37 34.54 75.79 34.51 76.49 34.8 76.64 34.73 76.79 34.95 77.12 35.05 76.75 35.64 77.38 35.47 78.14 35.49 78 35.24 78.24 34.88 78.29 34.62 78.71 34.53 79.04 34.33 78.66 34.03 78.83 33.43 79.17 33.17 79.16 33.02 79.46 32.71 79.42 32.53 78.97 32.34 78.75 32.69 78.4 32.53 78.77 31.93 78.88 31.29 79.14 31.43 79.31 31.15 79.6 31.01 79.75 31.01 80.25 30.72 80.21 30.59 80.61 30.45 80.88 30.13 80.49 29.8 80.25 29.45 80.32 29.3 80.07 28.84 80.52 28.58 81.21 28.36 81.32 28.2 81.9 27.85 82.07 27.92 82.47 27.68 82.71 27.72 82.74 27.5 83.39 27.48 83.86 27.35 84.11 27.52 84.62 27.34 84.64 27.05 85.19 26.87 85.33 26.74 85.62 26.87 85.86 26.57 86.03 26.67 86.73 26.43 87.07 26.59 87.34 26.35 88.1 26.54 88.19 26.75 88.01 27.21 88.21 27.94 88.63 28.12 88.84 28.01 88.76 27.57 88.92 27.33 88.75 27.14 89.13 26.81 89.38 26.86 89.86 26.7 90.42 26.9 90.69 26.77 91.69 26.81 92.12 26.9 92.02 27.48 91.65 27.49 91.66 27.83 91.87 27.72 92.24 27.89 92.32 27.8 92.73 27.99 92.68 28.15 92.92 28.2 93.52 28.67 93.71 28.66 94.37 29.03 94.28 29.11 94.69 29.32 94.81 29.17 95.3 29.14 95.81 29.35 96.14 29.34 96.63 28.74 96.61 28.61 97.36 28.2 97.4 28.01 96.9 27.62 97.16 27.14 96.89 27.18 96.78 27.36 96.02 27.18 95.44 26.7 95.23 26.68 95.06 26.45 95.15 26.01 95.04 25.74 94.68 25.46 94.71 24.93 94.26 24.16 94.16 23.85 93.76 24.01 93.33 24.05 93.44 23.69 93.33 23.05 93.14 23.05 93.09 22.71 93.16 22.19 93.01 22 92.61 22.12 92.51 22.74 92.37 22.97 92.4 23.24 92.27 23.73 92.07 23.65 91.76 23.31 91.81 23.06 91.62 22.94 91.51 23.18 91.35 23.1 91.16 23.66 91.38 24.11 91.75 24.24 91.92 24.15 91.97 24.38 92.22 24.5 92.25 24.91 92.42 25.03 92.05 25.19 91.64 25.12 91.2 25.2 90.44 25.15 89.81 25.37 89.85 25.47 89.84 25.97 89.72 26.17 89.39 26.01 89.14 26.32 88.79 26.31 88.49 26.46 88.18 26.15 88.09 25.91 88.55 25.52 88.83 25.49 88.95 25.18 88.44 25.2 88.34 24.87 88.23 24.96 88.01 24.67 88.5 24.32 88.69 24.32 88.74 23.93 88.59 23.87 88.58 23.61 88.76 23.45 88.73 23.24 88.99 23.22 88.86 22.94 89.07 22.2 88.6 21.99 88.25 21.82 88.2 22.17 87.76 21.7 87.49 21.62 86.98 21.41 86.83 21.11 86.99 20.67 86.75 20.5 86.72 20.29 86.41 20 85.45 19.67 85.46 19.9 85.22 19.74 85.41 19.65 84.72 19.11 84.77 19.08 84.12 18.3 83.57 18.01 83.16 17.56 82.48 17.21 82.26 16.89 82.31 16.58 81.73 16.31 81.25 16.32 81.14 15.98 80.82 15.72 80.67 15.91 80.26 15.68 80.05 15.09 80.18 14.52 80.12 14.24 80.27 13.56 80.35 13.32 80.16 12.48 79.87 12.04 79.84 11.96 79.79 11.79 79.75 11.58 79.85 10.28 79.4 10.33 78.9 9.47 79.05 9.31 78.42 9.12 78.17 8.88 78.05 8.37 77.55 8.08 77.1 8.3 76.53 8.96 76.32 9.47 76.28 9.81 75.85 11.07 75.54 11.69 75.21 12.01 74.86 12.76 74.61 13.87 74.32 14.52 74.09 14.9 74.01 15.01 73.7 15.72 73.49 15.99 73.31 16.54 73.25 17.29 72.94 18.23 72.86 18.7 73 19.01 72.81 18.98 72.8 19.53 72.66 19.93 72.74 20.14 72.82 20.37 72.86 20.47 72.95 20.77 72.61 21.26 72.69 21.54 72.93 21.69 72.54 21.67 72.62 21.97 72.49 22.33 72.13 21.98 72.3 21.65 72.11 21.21 71.46 20.89 71.01 20.74 70.75 20.72 70.34 20.93 69.12 22.06 68.94 22.32 69.18 22.35 69.24 22.25 69.73 22.47 70.18 22.56 70.4 22.95 69.81 22.85 69.71 22.75 69.2 22.85 68.65 23.16 68.42 23.45 68.65 23.8Z" />
            <circle cx="72.93" cy="10" r="0.11" />
            <circle cx="72.64" cy="10.56" r="0.08" />
            <path d="M92.52 10.54 92.57 10.58 92.52 10.9 92.38 10.78Z M92.72 11.5 92.86 12.24 92.74 12.81 92.53 11.85Z M92.81 12.9 93.04 13.08 93.05 13.38 92.85 13.35Z M93.69 7.19 93.79 6.9 93.87 7.2Z" />
          </g>
        </svg>

        {mappedLocations.map(({ item, location, index }) => {
          const position = projectIndiaLocation(location);
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const markerSize = 1.625 + (maximum > 0 ? Math.sqrt(item.value / maximum) : 0) * 0.375;
          const detail = `${location.name} (${item.label}): ${item.value.toLocaleString("en-US")} employees (${percentage.toFixed(1)}%).`;

          return (
            <button
              className="india-location-map__marker chart-data-point"
              key={item.label}
              type="button"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                "--location-marker-size": `${markerSize}rem`,
                "--location-marker-color": `var(--data-visualization-${(index % 6) + 1})`,
              } as CSSProperties}
              data-tooltip={detail}
              aria-label={detail}
              onPointerMove={positionChartTooltip}
            >
              <span aria-hidden="true">{indiaLocationShortLabels[location.name]}</span>
            </button>
          );
        })}
      </div>

      <ul className="india-location-map__legend" aria-label="Location headcount">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <li key={item.label}>
              <span
                className="india-location-map__legend-marker"
                style={{ backgroundColor: `var(--data-visualization-${(index % 6) + 1})` }}
                aria-hidden="true"
              />
              <span>{indiaLocations[normalizeLocation(item.label)]?.name ?? item.label}</span>
              <strong>{item.value.toLocaleString("en-US")} ({percentage.toFixed(1)}%)</strong>
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
