import Link from "next/link";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import type { Employee360Row } from "./employee-360.types";
import type { CareerJourneyEvent, EmployeePppHistory } from "./employee-360.types";
import { CareerJourneyPanel } from "./CareerJourneyPanel";
import { EmployeePppHistoryPanel } from "./EmployeePppHistoryPanel";
import "./employee-profile.css";

function display(value: string | null): string {
  return value?.trim() || "Not available";
}

function initials(name: string | null, fallback: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const value = parts.slice(0, 2).map((part) => part[0]).join("");
  return (value || fallback.slice(0, 2)).toUpperCase();
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div className="employee-profile__detail"><dt>{label}</dt><dd>{display(value)}</dd></div>;
}

function EmptyPanel({ title, icon }: { title: string; icon: string }) {
  return (
    <section className="employee-profile__panel employee-profile__panel--empty">
      <header><i className={`a-icon ${icon}`} aria-hidden="true" /><h2>{title}</h2></header>
      <p>No records available.</p>
    </section>
  );
}

export function EmployeeProfileView({
  employee,
  returnTo,
  careerJourney,
  pppHistory,
  canEditCareerJourney,
}: {
  employee: Employee360Row;
  returnTo: string;
  careerJourney: CareerJourneyEvent[];
  pppHistory: EmployeePppHistory[];
  canEditCareerJourney: boolean;
}) {
  const employeeName = employee.personnelNumber ?? `Employee ${employee.persNo}`;

  return (
    <main className="employee-profile">
      <nav className="employee-profile__breadcrumb" aria-label="Breadcrumb">
        <ol className="m-breadcrumbs">
          <li>
            <div className="a-link -icon">
              <Link href={returnTo}>
                <span>Employee 360 </span>
                <span>
                  <i className="a-icon ui-ic-nosafe-lr-forward-small" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </li>
          <li className="employee-profile__breadcrumb-current" aria-current="page">
            <span>{employeeName}</span>
          </li>
        </ol>
      </nav>

      <section className="employee-profile__overview" aria-labelledby="employee-profile-name">
        <div className="employee-profile__identity">
          <div className="employee-profile__avatar" aria-hidden="true">
            {initials(employee.personnelNumber, employee.persNo)}
          </div>
          <div>
            <h1 id="employee-profile-name">{employeeName}</h1>
            <p>{display(employee.designationText)}</p>
            <span className="employee-profile__status">Employee</span>
          </div>
          <dl>
            <Detail label="Pers. No." value={employee.persNo} />
            <Detail label="NT ID" value={employee.ntId} />
            <Detail label="Global ID" value={employee.globalId} />
            <Detail label="Email official" value={employee.officialEmail} />
          </dl>
        </div>

        <div className="employee-profile__organization">
          <h2>Current organization details</h2>
          <dl>
            <Detail label="PS group" value={employee.psGroup} />
            <Detail label="Range" value={employee.range} />
            <Detail label="Organizational unit" value={employee.orgUnit} />
            <Detail label="Location" value={employee.location} />
            <Detail label="Function" value={employee.functionName} />
            <Detail label="Cost center" value={employee.costCenter} />
            <Detail label="Employee group" value={employee.employeeGroup} />
            <Detail label="Direct / indirect" value={formatDirectOrIndirect(employee.directOrIndirect)} />
          </dl>
        </div>

        <section className="employee-profile__overview-section">
          <header><i className="a-icon boschicon-bosch-ic-user" aria-hidden="true" /><h2>HR partnership</h2></header>
          <dl>
            <Detail label="Global ID of HRBP" value={employee.hrbpGlobalId} />
            <Detail label="Global ID of HRBP2" value={employee.hrbp2GlobalId} />
          </dl>
        </section>

        <section className="employee-profile__overview-section">
          <header><i className="a-icon boschicon-bosch-ic-calendar" aria-hidden="true" /><h2>Career information</h2></header>
          <dl>
            <Detail label="Date of joining" value={employee.joiningDate} />
            <Detail label="Technical entry date" value={employee.technicalEntryDate} />
            <Detail label="Entry for retirement" value={employee.entryForRetirement} />
            <Detail label="Birth date" value={employee.birthDate} />
            <Detail label="Designation" value={employee.designationText} />
            <Detail label="Gender key" value={employee.gender} />
          </dl>
        </section>
      </section>

      <CareerJourneyPanel persNo={employee.persNo} initialEvents={careerJourney} canEdit={canEditCareerJourney} />

      <div className="employee-profile__grid">
        <EmptyPanel title="Talent portfolio" icon="boschicon-bosch-ic-target" />
        <EmptyPanel title="STEP overview" icon="boschicon-bosch-ic-hierarchy" />
        <EmptyPanel title="Succession portfolio" icon="boschicon-bosch-ic-people" />
        <EmployeePppHistoryPanel history={pppHistory} />
        <EmptyPanel title="IDP status" icon="boschicon-bosch-ic-document" />
      </div>
    </main>
  );
}