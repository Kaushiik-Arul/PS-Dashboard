import Link from "next/link";
import type {
  TalentPipelineQueryFilters,
  TalentPipelineView,
} from "./talent-pipeline.types";
import "./talent-pipeline.css";

const tabs: Array<{
  view: TalentPipelineView;
  label: string;
  icon: string;
}> = [
  { view: "talent-pool", label: "Talent pool", icon: "boschicon-bosch-ic-user" },
  { view: "development-pool", label: "Development pool", icon: "boschicon-bosch-ic-chart-line" },
];

export function TalentLandscapeTabs({
  view,
  query = {},
}: {
  view: TalentPipelineView;
  query?: TalentPipelineQueryFilters;
}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  });

  return (
    <nav className="talent-pipeline-tabs" aria-label="Talent Landscape views">
      {tabs.map((tab) => {
        const path = `/talent-pipeline/${tab.view}`;
        const href = params.size ? `${path}?${params}` : path;
        return (
          <Link
            key={tab.view}
            className="talent-pipeline-tabs__link"
            href={href}
            aria-current={view === tab.view ? "page" : undefined}
          >
            <i className={`a-icon ${tab.icon}`} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
