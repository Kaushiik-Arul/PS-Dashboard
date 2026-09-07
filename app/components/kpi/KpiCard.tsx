import "./kpi-card.css";

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  comparisonLabel: string;
  trendValue: string;
  trendDirection: "up" | "down" | "neutral";
  trendTone: "favorable" | "adverse" | "neutral";
  icon: string;
  iconColor?: "blue" | "green" | "orange" | "red" | "purple";
}

interface KpiCardProps {
  metric: KpiMetric;
}

export function KpiCard({ metric }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${metric.iconColor ?? "blue"}`}>
      <div className="kpi-card__body">
        <div className={`kpi-card__icon kpi-card__icon--${metric.iconColor ?? "blue"}`}>
          <i className={`a-icon ${metric.icon}`} aria-hidden="true" />
        </div>
        <div className="kpi-card__content">
          <span className="kpi-card__title">{metric.title}</span>
          <div className="kpi-card__value">{metric.value}</div>
        </div>
      </div>

      <div className="kpi-card__trend">
        <span className="kpi-card__comparison">{metric.comparisonLabel}</span>
        <span
          className={`kpi-card__trend-value kpi-card__trend-value--${metric.trendTone}`}
          aria-label={`${metric.trendDirection}, ${metric.trendValue}`}
        >
          {metric.trendDirection === "up" && (
            <i className="a-icon boschicon-bosch-ic-arrow-up" aria-hidden="true" />
          )}
          {metric.trendDirection === "down" && (
            <i className="a-icon boschicon-bosch-ic-arrow-down" aria-hidden="true" />
          )}
          {metric.trendDirection === "neutral" && (
            <i className="a-icon boschicon-bosch-ic-minus" aria-hidden="true" />
          )}
          {metric.trendValue}
        </span>
      </div>
    </article>
  );
}
