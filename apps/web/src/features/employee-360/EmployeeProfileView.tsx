"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDirectOrIndirect } from "@/components/formatters/workforce";
import type { CareerJourneyEvent, Employee360Row, EmployeeDevelopmentPortfolio, EmployeeIdpStatus, EmployeePppHistory, EmployeeStepOverview, EmployeeSuccessionPortfolio, EmployeeTalentPortfolio } from "./employee-360.types";
import { CareerJourneyPanel } from "./CareerJourneyPanel";
import { EmployeeIdpStatusPanel } from "./EmployeeIdpStatusPanel";
import { EmployeePppHistoryPanel } from "./EmployeePppHistoryPanel";
import { EmployeeStepOverviewPanel } from "./EmployeeStepOverviewPanel";
import { EmployeeTalentPortfolioPanel } from "./EmployeeTalentPortfolioPanel";
import { EmployeeDevelopmentPortfolioPanel } from "./EmployeeDevelopmentPortfolioPanel";
import { EmployeeSuccessionPortfolioPanel } from "./EmployeeSuccessionPortfolioPanel";
import { jobDescriptionsClient } from "@/features/hrbp-point/jd-management.http";
import type { JobDescription } from "@/features/hrbp-point/jd-management.types";
import { updateEmployeeJobDescription } from "./job-description.http";
import { formatEmployeeDate } from "./employee-date";
import "./employee-profile.css";

function display(value: string | null): string {
  return value?.trim() || "";
}

function initials(name: string | null, fallback: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const value = parts.slice(0, 2).map((part) => part[0]).join("");
  return (value || fallback.slice(0, 2)).toUpperCase();
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div className="employee-profile__detail"><dt>{label}</dt><dd>{display(value)}</dd></div>;
}

export function EmployeeProfileView({
  employee,
  returnTo,
  careerJourney,
  pppHistory,
  stepOverview,
  idpStatus,
  talentPortfolio,
  developmentPortfolio,
  successionPortfolio,
  canEditCareerJourney,
}: {
  employee: Employee360Row;
  returnTo: string;
  careerJourney: CareerJourneyEvent[];
  pppHistory: EmployeePppHistory[];
  stepOverview: EmployeeStepOverview;
  idpStatus: EmployeeIdpStatus;
  talentPortfolio: EmployeeTalentPortfolio;
  developmentPortfolio: EmployeeDevelopmentPortfolio | null;
  successionPortfolio: EmployeeSuccessionPortfolio;
  canEditCareerJourney: boolean;
}) {
  const router = useRouter();
  const jdDialogRef = useRef<HTMLDialogElement>(null);
  const [currentJdId, setCurrentJdId] = useState(employee.jdId ?? "");
  const [currentJdName, setCurrentJdName] = useState(employee.jdName);
  const [draftJdId, setDraftJdId] = useState(employee.jdId ?? "");
  const [jdOptions, setJdOptions] = useState<JobDescription[]>([]);
  const [jdSuffix, setJdSuffix] = useState("");
  const [jdSearching, setJdSearching] = useState(false);
  const [jdEffectiveDate, setJdEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [jdBusy, setJdBusy] = useState(false);
  const [jdMessage, setJdMessage] = useState("");
  const employeeName = employee.personnelNumber ?? `Employee ${employee.persNo}`;

  useEffect(() => {
    if (jdSuffix.length !== 3) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void jobDescriptionsClient.findBySuffix(jdSuffix).then((items) => {
        if (cancelled) return;
        setJdOptions(items);
        if (items.length === 1) setDraftJdId(items[0].jdId);
        setJdMessage(items.length > 100 ? "Too many matches. Contact the JD master administrator." : "");
      }).catch((error) => {
        if (!cancelled) setJdMessage(error instanceof Error ? error.message : "JD search failed.");
      }).finally(() => { if (!cancelled) setJdSearching(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [jdSuffix]);

  const selectedJd = jdOptions.find((item) => item.jdId === draftJdId);

  const openJdEditor = () => {
    setDraftJdId(currentJdId);
    setJdSuffix("");
    setJdSearching(false);
    setJdOptions(currentJdId ? [{ id: currentJdId, jdId: currentJdId, roleTitle: currentJdName ?? "Current assignment", updatedAt: "" }] : []);
    setJdMessage("");
    jdDialogRef.current?.showModal();
  };
  const saveJd = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedJd || jdSearching || jdOptions.length > 100) return;
    setJdBusy(true); setJdMessage("");
    try {
      const result = await updateEmployeeJobDescription(employee.persNo, draftJdId, jdEffectiveDate);
      setCurrentJdId(result.jdId); setCurrentJdName(result.jdName); jdDialogRef.current?.close();
      if (result.changed) router.refresh();
    } catch (error) { setJdMessage(error instanceof Error ? error.message : "Job description could not be updated."); }
    finally { setJdBusy(false); }
  };

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
          <section className="employee-profile__jd-section" aria-labelledby="employee-profile-jd-title">
            <header>
              <i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" />
              <h2 id="employee-profile-jd-title">Job description</h2>
              {canEditCareerJourney && <button className="a-button a-button--integrated -small employee-profile__jd-edit" type="button" title="Edit job description" aria-label="Edit job description" onClick={() => void openJdEditor()}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>}
            </header>
            <dl>
              <Detail label="JD ID" value={currentJdId || null} />
              <Detail label="JD Name" value={currentJdName} />
            </dl>
          </section>
        </section>

        <section className="employee-profile__overview-section">
          <header><i className="a-icon boschicon-bosch-ic-calendar" aria-hidden="true" /><h2>Career information</h2></header>
          <dl>
            <Detail label="Date of joining" value={formatEmployeeDate(employee.joiningDate)} />
            <Detail label="Technical entry date" value={formatEmployeeDate(employee.technicalEntryDate)} />
            <Detail label="Entry for retirement" value={formatEmployeeDate(employee.entryForRetirement)} />
            <Detail label="Birth date" value={formatEmployeeDate(employee.birthDate)} />
            <Detail label="Designation" value={employee.designationText} />
            <Detail label="Gender key" value={employee.gender} />
          </dl>
        </section>
      </section>

      <CareerJourneyPanel persNo={employee.persNo} initialEvents={careerJourney} canEdit={canEditCareerJourney} />

      <div className="employee-profile__grid">
        <EmployeeTalentPortfolioPanel portfolio={talentPortfolio} />
        <EmployeeDevelopmentPortfolioPanel portfolio={developmentPortfolio} />
        <EmployeeStepOverviewPanel persNo={employee.persNo} overview={stepOverview} canEdit={canEditCareerJourney} />
        <EmployeePppHistoryPanel history={pppHistory} />
        <EmployeeSuccessionPortfolioPanel portfolio={successionPortfolio} />
        <EmployeeIdpStatusPanel persNo={employee.persNo} initialStatus={idpStatus} canEdit={canEditCareerJourney} />
      </div>

      <dialog className="career-journey__dialog career-journey__dialog--confirm" ref={jdDialogRef}>
        <form onSubmit={saveJd}>
          <header><div><span>Current assignment</span><h2>Edit job description</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close" onClick={() => jdDialogRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
          <div className="career-journey__form">
            <label><span>Search JD ID (last 3 digits)</span><input type="search" inputMode="numeric" pattern="[0-9]{3}" maxLength={3} placeholder="e.g. 209" value={jdSuffix} disabled={jdBusy} onChange={(event) => {
              setJdSuffix(event.target.value.replace(/\D/g, "").slice(0, 3));
              setDraftJdId(""); setJdOptions([]); setJdMessage("");
              setJdSearching(event.target.value.replace(/\D/g, "").length === 3);
            }} /></label>
            <label><span>Job description</span><select required value={draftJdId} disabled={jdBusy || jdSearching || jdOptions.length > 100} onChange={(event) => setDraftJdId(event.target.value)}><option value="">{jdSearching ? "Searching..." : "Select a matching JD"}</option>{jdOptions.slice(0, 100).map((item) => <option key={item.id} value={item.jdId}>{item.jdId} · {item.roleTitle}</option>)}</select></label>
            <label><span>Role name</span><input readOnly value={selectedJd?.roleTitle ?? ""} placeholder="Select a JD to see its role" /></label>
            <label><span>Effective date</span><input type="date" required value={jdEffectiveDate} disabled={jdBusy} onChange={(event) => setJdEffectiveDate(event.target.value)} /></label>
            {jdSuffix.length === 3 && !jdSearching && !jdOptions.length && !jdMessage && <p className="career-journey__hint">No JD ID ends in {jdSuffix}.</p>}
            {jdMessage && <p className="career-journey__error" role="alert">{jdMessage}</p>}
          </div>
          <footer><button className="a-button a-button--secondary" type="button" disabled={jdBusy} onClick={() => jdDialogRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={jdBusy || jdSearching || !selectedJd || jdOptions.length > 100}><span className="a-button__label">{jdBusy ? "Saving..." : "Save assignment"}</span></button></footer>
        </form>
      </dialog>
    </main>
  );
}
