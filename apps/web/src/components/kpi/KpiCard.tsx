import "./kpi-card.css";

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  comparisonLabel?: string;
  comparisonItems?: Array<{
    label: string;
    value: string;
  }>;
  breakdown?: Array<{
    label: string;
    value: string;
  }>;
  trendValue?: string;
  trendDirection?: "up" | "down" | "neutral";
  trendTone?: "favorable" | "adverse" | "neutral";
  icon: string;
  iconColor?: "blue" | "green" | "orange" | "red" | "purple";
}

interface KpiCardProps {
  metric: KpiMetric;
  sourceLabel?: string;
  contextLabel?: string;
}

export function KpiCard({ metric, sourceLabel, contextLabel }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${metric.iconColor ?? "blue"}${sourceLabel ? " kpi-card--with-source" : ""}`}>
      {sourceLabel && <span className="kpi-card__source">{sourceLabel}</span>}
      {contextLabel && <span className="kpi-card__context">{contextLabel}</span>}
      <div className="kpi-card__body">
        <div className={`kpi-card__icon kpi-card__icon--${metric.iconColor ?? "blue"}`}>
          <i className={`a-icon ${metric.icon}`} aria-hidden="true" />
        </div>
        <div className="kpi-card__content">
          <span className="kpi-card__title">{metric.title}</span>
          {metric.breakdown ? (
            <div className="kpi-card__breakdown">
              {metric.breakdown.map((item) => (
                <div className="kpi-card__breakdown-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="kpi-card__value">{metric.value}</div>
          )}
        </div>
      </div>

      {metric.comparisonItems && metric.comparisonItems.length > 0 ? (
        <div className="kpi-card__comparisons">
          {metric.comparisonItems.map((item) => (
            <div className="kpi-card__comparison-item" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : (metric.comparisonLabel || metric.trendValue) && (
        <div className="kpi-card__trend">
          <span className="kpi-card__comparison">{metric.comparisonLabel}</span>
          {metric.trendValue && metric.trendDirection && metric.trendTone && (
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
          )}
        </div>
      )}
    </article>
  );
}
