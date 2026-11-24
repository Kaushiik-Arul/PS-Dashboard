import Link from "next/link";
import "../hrbp-point/hrbp-operations-guide.css";

type KpiGuide = {
  kpi: string;
  source: string;
  how: string;
  scope: string;
};

const automatic: KpiGuide[] = [
  {
    kpi: "Direct M&SS, Total M&SS",
    source: "PS Namelist (live import, or the monthly history table for older months)",
    how: "Employee counts of the data month, taken from the namelist rows.",
    scope: "PS-IN uses everyone in scope. PS Corp leaves out BidP, NaP, JaP and GanP.",
  },
  {
    kpi: "Indirect M&SS",
    source: "PS Namelist",
    how: "Indirect employees, including those in BidP, NaP, JaP and GanP.",
    scope: "PS-IN.",
  },
  {
    kpi: "Expat",
    source: "PS Namelist",
    how: "Employees whose employee group is INBOUND. Shown as count (x.x%), the count divided by the headcount of the same month.",
    scope: "PS Corp excludes BidP, NaP, JaP and GanP from both count and headcount.",
  },
  {
    kpi: "SUL, Women in SLx",
    source: "PS Namelist",
    how: "Employees in levels GROUP1, GROUP2, SL2, SL3 and SL4. Women in SLx counts the women among them.",
    scope: "As per table (PS-IN or PS Corp).",
  },
  {
    kpi: "Women in overall M&SS",
    source: "PS Namelist",
    how: "Women in M&SS, with the M&SS total as the denominator.",
    scope: "As per table.",
  },
  {
    kpi: "Internal transfer",
    source: "PS Namelist",
    how: "Employees whose value is exactly INTERNAL.",
    scope: "As per table.",
  },
  {
    kpi: "Attrition",
    source: "Attrition tracking events (not the namelist rows)",
    how: "Resignation plus retirement events from 1 Jan to the end of the data month. Shown as count (x.x%) over the namelist headcount of the data month. A month with no events shows 0.",
    scope: "PS Corp excludes BidP, NaP, JaP and GanP.",
  },
  {
    kpi: "Job Rotation (t/o Transfer within Bosch)",
    source: "Attrition tracking events",
    how: "Events of type out of PS and out of RBIN, plus out of PS and within RBIN, from 1 Jan to the end of the data month. Shown as count (x.x%).",
    scope: "As per table.",
  },
  {
    kpi: "Transfer within plant / within Corp",
    source: "Attrition tracking events (within PS)",
    how: "Year-to-date counts only, with no total and no percentage. PS-IN shows Plant → Corp and Corp → Plant. PS Corp shows only Corp → Corp.",
    scope: "Different per table, as described.",
  },
];

const uploads: KpiGuide[] = [
  {
    kpi: "PUL, Corp PUL, Indirect/Direct/Total M&SS",
    source: "PUL upload: PS Corp Performance Dashboard PUL KPI workbook, summary sheet",
    how: "Reads the PSIN Corp row in the YTD MM.YY column of the data month (for example YTD 10.26 for October). The previous month column is filled only if it is empty.",
    scope: "Upload with the PUL button. Nothing is stored; values persist when the draft is saved.",
  },
  {
    kpi: "PCd Direct HC, Permanent, Temporary",
    source: "PUL upload: Consolidation sheet, block INPS Personnel Capacity (state)",
    how: "Reads the Direct, Permanent and Temporary rows in the YTD MM.YY column of the data month.",
    scope: "PS-IN rows only.",
  },
  {
    kpi: "Gender Diversity Hiring",
    source: "Gender Hiring upload: sheet with Actual Date of Joining, Gender and Specific Org unit",
    how: "Joiners from 1 Jan to the column month. Cell shows F: n (x.x%), female ÷ (female + male). If several sheets match, the one with the most women is used.",
    scope: "PS-IN uses all joiners. PS Corp uses joiners whose org unit maps to a range other than BidP, NaP, JaP and GanP. Use Counted in in the preview to decide the unmapped ones.",
  },
  {
    kpi: "Hiring performance (Lead Time)",
    source: "Gender Hiring upload: Lead Time to Offer column",
    how: "Whole-day average of Lead Time to Offer for all genders joined from 1 Jan to the column month. An empty value counts as 0.",
    scope: "PS-IN over all rows. PS Corp over the Corp-eligible rows.",
  },
];

const manual = [
  "Actual 2025 is always manual.",
  "Any calculated cell can be overridden by the HRBP while the report is a draft. The override wins until it is cleared or the report is finalized.",
  "Custom columns and manual values are shared across the organization.",
];

function KpiTable({ rows }: { rows: KpiGuide[] }) {
  return (
    <div className="hrbp-guide-table-wrap">
      <table className="hrbp-guide-table">
        <thead><tr><th scope="col">KPI</th><th scope="col">Data source</th><th scope="col">How it is calculated</th><th scope="col">Scope and notes</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.kpi}>
              <th scope="row">{row.kpi}</th>
              <td>{row.source}</td>
              <td>{row.how}</td>
              <td>{row.scope}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MrmOperationsGuide() {
  return (
    <main className="hrbp-operations-guide">
      <header className="hrbp-guide-header">
        <Link className="hrbp-guide-back" href="/mrm">
          <i className="a-icon boschicon-bosch-ic-back-left" aria-hidden="true" />
          Back to MRM
        </Link>
        <div className="hrbp-guide-header__content">
          <div>
            <p className="hrbp-guide-eyebrow">Operations reference</p>
            <h1>MRM operations guide</h1>
            <p>Which KPI uses which data, and how the value is worked out.</p>
          </div>
          <nav className="hrbp-guide-nav" aria-label="Operations guide sections">
            <a href="#months">Months</a>
            <a href="#automatic">Automatic KPIs</a>
            <a href="#uploads">Excel uploads</a>
            <a href="#manual">Manual values</a>
          </nav>
        </div>
      </header>

      <section className="hrbp-guide-section" id="months" aria-labelledby="months-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Before you start</p>
          <h2 id="months-title">Reporting month and data month</h2>
          <p>The reporting month is the month of the meeting. Its data month is the previous month. The report shows two columns: the data month and the month before it (the October data month, reported in November, shows Sep and Oct). Year-to-date KPIs run from 1 January to the end of the data month.</p>
        </div>
        <div className="hrbp-guide-table-wrap">
          <table className="hrbp-guide-table">
            <thead><tr><th scope="col">Namelist source</th><th scope="col">When it is used</th></tr></thead>
            <tbody>
              <tr><th scope="row">Live namelist</th><td>When the latest confirmed live import is for exactly the data month.</td></tr>
              <tr><th scope="row">Monthly namelist history</th><td>Otherwise, the stored month with the same reporting month. Only three months are kept at row level.</td></tr>
              <tr><th scope="row">Missing month</th><td>Unavailable, not zero.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="hrbp-guide-section" id="automatic" aria-labelledby="automatic-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">No upload needed</p>
          <h2 id="automatic-title">Automatic KPIs</h2>
          <p>These fill themselves from the PS Namelist and attrition tracking. Access scope of the viewer is applied on read.</p>
        </div>
        <KpiTable rows={automatic} />
      </section>

      <section className="hrbp-guide-section" id="uploads" aria-labelledby="uploads-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">HRBP only</p>
          <h2 id="uploads-title">Excel uploads</h2>
          <p>Uploads only fill cells in the browser. No data is stored or audited; save the draft to keep the values.</p>
        </div>
        <KpiTable rows={uploads} />
      </section>

      <section className="hrbp-guide-section" id="manual" aria-labelledby="manual-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Your input</p>
          <h2 id="manual-title">Manual values and overrides</h2>
        </div>
        <ul>
          {manual.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  );
}
