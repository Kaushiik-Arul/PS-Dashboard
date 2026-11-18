import Link from "next/link";
import "./hrbp-operations-guide.css";

type ImportGuide = {
  workflow: string;
  location: string;
  cadence: string;
  effect: string;
  retention: string;
};

const imports: ImportGuide[] = [
  {
    workflow: "PS Namelist updation",
    location: "HRBP Point > PS data maintenance",
    cadence: "Monthly, after the reporting period closes. The default is the previous calendar month.",
    effect: "Validates and replaces the live employee namelist. Finalization also calculates joins, exits, and Organizational Unit or Range movements.",
    retention: "Live month plus the two newest detailed historical months (three row-level months total). Older detail is reduced to checksummed Overview JSON.",
  },
  {
    workflow: "RBIN Namelist cleaning",
    location: "HRBP Point > RBIN to PS process",
    cadence: "Monthly, when the RBIN workbook arrives; complete it before the PS Namelist import.",
    effect: "Applies mappings and employee exceptions, compares RBIN with the current PS Namelist, and produces a cleaned XLSX. It never updates the PS employee namelist.",
    retention: "Import metadata, drafts, staging rows, and export audits are permanent. Raw finalized row history keeps the newest import for each of the latest two reporting months. The clean snapshot table holds the latest finalized result.",
  },
  {
    workflow: "RBIN Org Unit mappings",
    location: "HRBP Point > RBIN mapping maintenance",
    cadence: "As needed, before cleaning when an Organizational Unit, Range, or Function mapping changes.",
    effect: "Controls the Range and Function values applied during RBIN transformation.",
    retention: "Current mapping rules remain until edited or deleted.",
  },
  {
    workflow: "RBIN employee exceptions",
    location: "HRBP Point > Employee exceptions",
    cadence: "As needed, before finalizing a cleaned RBIN dataset.",
    effect: "Applies employee-specific corrections that take precedence over general mapping rules.",
    retention: "Current exception rules remain until edited or deleted.",
  },
  {
    workflow: "Monthly headcount",
    location: "HRBP Point > Monthly headcount import",
    cadence: "Monthly, once the source workbook for the reporting month is final.",
    effect: "Calculates total, Range, Organizational Unit, and combined monthly headcount aggregates.",
    retention: "Import audit and all calculated monthly aggregates are permanent. Uncommitted previews expire after 24 hours.",
  },
  {
    workflow: "Job Description master",
    location: "HRBP Point > Job description management",
    cadence: "As needed when role definitions change.",
    effect: "Adds or updates the JD catalog used by employee assignments.",
    retention: "Current master records remain until updated or deleted.",
  },
  {
    workflow: "Employee JD assignments",
    location: "HRBP Point > Job description management",
    cadence: "Monthly or whenever employee-to-JD assignments change.",
    effect: "Replaces employee JD assignments for the selected reporting month; unassigned employees are allowed.",
    retention: "The latest assignment remains current. Import audits and dated JD movement records preserve change history.",
  },
  {
    workflow: "Active STEP",
    location: "HRBP Point > Talent landscape",
    cadence: "As needed when a new approved STEP workbook is issued.",
    effect: "Replaces the current Active STEP register after preview and confirmation.",
    retention: "Current replacement register; the previous current set is superseded.",
  },
  {
    workflow: "Available Talent",
    location: "HRBP Point > Talent landscape",
    cadence: "As needed when the source register changes.",
    effect: "Replaces the current Available Talent register.",
    retention: "Current replacement register; dashboard snapshots may preserve reported monthly metrics separately.",
  },
  {
    workflow: "Nomination Status",
    location: "HRBP Point > Talent landscape",
    cadence: "As needed after nomination decisions change.",
    effect: "Replaces the current nomination status register.",
    retention: "Current replacement register; dashboard snapshots may preserve reported monthly metrics separately.",
  },
  {
    workflow: "Talent Pool",
    location: "HRBP Point > Talent landscape",
    cadence: "As needed when pool membership or validity changes.",
    effect: "Replaces the current Talent Pool register.",
    retention: "Current replacement register; dashboard snapshots may preserve reported monthly metrics separately.",
  },
  {
    workflow: "Development Pool",
    location: "HRBP Point > Talent landscape",
    cadence: "As needed when pool membership or validity changes.",
    effect: "Replaces the current Development Pool register.",
    retention: "Current replacement register; dashboard snapshots may preserve reported monthly metrics separately.",
  },
  {
    workflow: "PPP history",
    location: "HRBP Point > Employee history",
    cadence: "Annually, or when the approved Performance, Position, Person, and TCL history is refreshed.",
    effect: "Replaces employee PPP history for the current year and two preceding years.",
    retention: "Rolling three years.",
  },
  {
    workflow: "Succession Planning",
    location: "HRBP Point > Succession planning",
    cadence: "As needed after the approved succession plan changes.",
    effect: "Replaces position-level incumbent and successor records.",
    retention: "Current replacement register; dashboard snapshots may preserve reported monthly metrics separately.",
  },
  {
    workflow: "Attrition records",
    location: "HRBP Point > Attrition",
    cadence: "As needed when the approved separation source is refreshed.",
    effect: "Validates and replaces the attrition source register.",
    retention: "Current replacement register.",
  },
  {
    workflow: "PS Exit",
    location: "HRBP Point > Attrition movements",
    cadence: "Monthly after the PS Exit file is available, and again if corrected source data is issued.",
    effect: "Classifies exits and reconciles them with movement records for the selected period.",
    retention: "Import audit and reconciled movement history are retained for review and export.",
  },
  {
    workflow: "Employee leave status (manual)",
    location: "HRBP Point > Employee status",
    cadence: "As needed when a dated leave status starts, changes, or ends.",
    effect: "Maintains employee status periods used by workforce reporting. This is a form workflow, not a file import.",
    retention: "Dated status records remain until an HRBP edits or deletes them.",
  },
  {
    workflow: "Org Structure",
    location: "HRBP Point > Organization",
    cadence: "As needed when the approved reporting hierarchy changes.",
    effect: "Replaces role-to-role reporting relationships after preview and confirmation.",
    retention: "Committed hierarchy remains current until replaced. Uncommitted preview rows expire after 24 hours.",
  },
];

const exports = [
  {
    workflow: "PS Namelist XLSX",
    location: "HRBP Point > PS Namelist updation > Export",
    timing: "After finalization, or whenever an available reporting month and selected columns are needed.",
    detail: "Exports a retained live or detailed historical month. Export audit metadata is retained; the generated workbook is downloaded to the user.",
  },
  {
    workflow: "Cleaned RBIN XLSX",
    location: "HRBP Point > RBIN cleaning > Saved datasets",
    timing: "After a dataset is finalized and all blocking issues are resolved.",
    detail: "Exports the cleaned staging values. Export actor, timestamp, file name, row count, and SHA-256 hash are retained permanently; the workbook itself is downloaded.",
  },
  {
    workflow: "Attrition movement history XLSX",
    location: "HRBP Point > Attrition movements > Export history",
    timing: "As needed for confirmed movement reporting.",
    detail: "Exports confirmed attrition movement history from the permanent tracking records.",
  },
];

export function HrbpOperationsGuide() {
  return (
    <main className="hrbp-operations-guide">
      <header className="hrbp-guide-header">
        <Link className="hrbp-guide-back" href="/hrbp-point">
          <i className="a-icon boschicon-bosch-ic-back-left" aria-hidden="true" />
          <span>HRBP Point</span>
        </Link>
        <div className="hrbp-guide-header__content">
          <div>
          <p className="hrbp-guide-eyebrow">Operations reference</p>
          <h1>Import and export operations guide</h1>
          <p>Use this reference to schedule source updates, find each workflow, and understand what the application retains.</p>
          </div>
          <nav className="hrbp-guide-nav" aria-label="Operations guide sections">
            <a href="#monthly-sequence-title">Monthly cycle</a>
            <a href="#imports-title">Imports</a>
            <a href="#exports-title">Exports</a>
            <a href="#retention-title">Retention</a>
          </nav>
        </div>
      </header>

      <aside className="hrbp-guide-notice" aria-label="Cadence note">
        <i className="a-icon boschicon-bosch-ic-info-i" aria-hidden="true" />
        <div><strong>Cadence note</strong><p>No workflow currently requires a weekly import. Monthly workflows are identified below; all others are annual, rolling, or completed when an approved source changes.</p></div>
      </aside>

      <section className="hrbp-guide-section" aria-labelledby="monthly-sequence-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Recommended order</p>
          <h2 id="monthly-sequence-title">Monthly operating sequence</h2>
        </div>
        <ol className="hrbp-guide-sequence">
          <li><span>1</span><div><strong>Prepare rules</strong><p>Update RBIN mappings and employee exceptions when source codes or known employee corrections have changed.</p></div></li>
          <li><span>2</span><div><strong>Clean RBIN</strong><p>Upload, resolve issues, finalize, and export the cleaned RBIN dataset. This step does not update PS Namelist.</p></div></li>
          <li><span>3</span><div><strong>Finalize PS Namelist</strong><p>Import the approved PS source for the reporting month and review calculated workforce movements.</p></div></li>
          <li><span>4</span><div><strong>Load monthly measures</strong><p>Import monthly headcount and any employee JD assignments or talent registers refreshed for the period.</p></div></li>
          <li><span>5</span><div><strong>Reconcile exits</strong><p>Upload the PS Exit source, resolve pending departures, and export confirmed attrition history when required.</p></div></li>
        </ol>
      </section>

      <section className="hrbp-guide-section" aria-labelledby="imports-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Source data</p>
          <h2 id="imports-title">Imports and maintenance schedule</h2>
          <p>Cadence means the minimum operational trigger, not a restriction. Corrected approved files can be re-imported when the workflow supports replacement.</p>
        </div>
        <div className="hrbp-guide-table-wrap">
          <table className="hrbp-guide-table">
            <thead><tr><th scope="col">Workflow</th><th scope="col">Where</th><th scope="col">When</th><th scope="col">What it updates</th><th scope="col">Storage and retention</th></tr></thead>
            <tbody>{imports.map((item) => <tr key={item.workflow}><th scope="row">{item.workflow}</th><td>{item.location}</td><td>{item.cadence}</td><td>{item.effect}</td><td>{item.retention}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="hrbp-guide-section" aria-labelledby="exports-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Outputs</p>
          <h2 id="exports-title">Exports</h2>
        </div>
        <div className="hrbp-guide-table-wrap">
          <table className="hrbp-guide-table hrbp-guide-table--exports">
            <thead><tr><th scope="col">Export</th><th scope="col">Where</th><th scope="col">When</th><th scope="col">Output and audit</th></tr></thead>
            <tbody>{exports.map((item) => <tr key={item.workflow}><th scope="row">{item.workflow}</th><td>{item.location}</td><td>{item.timing}</td><td>{item.detail}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="hrbp-guide-section" aria-labelledby="retention-title">
        <div className="hrbp-guide-section__heading">
          <p className="hrbp-guide-eyebrow">Key distinction</p>
          <h2 id="retention-title">PS and RBIN retention at a glance</h2>
        </div>
        <dl className="hrbp-guide-retention">
          <div><dt>PS Namelist rows</dt><dd><strong>3 months detailed</strong><span>One live month plus two historical months. Older detail becomes checksummed Overview JSON.</span></dd></div>
          <div><dt>RBIN raw finalized rows</dt><dd><strong>2 reporting months</strong><span>The newest finalized import for each of the latest two months; older finalized row payloads are removed.</span></dd></div>
          <div><dt>RBIN clean snapshot</dt><dd><strong>Latest finalized result</strong><span>The current clean snapshot is replaced by the next finalization and does not update PS Namelist.</span></dd></div>
          <div><dt>RBIN staging and audit</dt><dd><strong>Permanent</strong><span>Drafts, staging batches and rows, import metadata, and export audit records remain available.</span></dd></div>
        </dl>
      </section>
    </main>
  );
}
