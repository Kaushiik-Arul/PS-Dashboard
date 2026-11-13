'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AttritionMovementItem, AttritionMovementQuery, AttritionMovementsClient, AttritionMovementsPage, AttritionMovementView } from './attrition-movements.types';
import { PsExitImportButton } from './PsExitImportButton';

const pageSizes = [10, 25, 50] as const;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const initialQuery: AttritionMovementQuery = { view: 'all', search: '', year: null, month: null, page: 1, pageSize: 25 };
const emptyPage: AttritionMovementsPage = { items: [], total: 0, counts: { all: 0, psAttrition: 0, withinPs: 0, pending: 0 }, availablePeriods: [], ...initialQuery };

function readable(value: string | null): string {
  if (!value) return 'Not available';
  return value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatMonth(value: string): string {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function categoryLabel(item: AttritionMovementItem): string {
  if (item.eventType === 'resignation') return 'Resignation';
  if (item.eventType === 'retirement') return 'Retirement';
  if (item.transferType === 'out_of_ps_out_of_rbin') return 'Out-of-PS transfer';
  if (item.category === 'ps_attrition') return 'PS attrition';
  if (item.category === 'within_ps') return 'Within PS';
  if (item.status === 'pending') return item.source === 'ps_exit' ? 'Pending - PS Exit' : 'Pending - RBIN';
  return 'Departure candidate';
}

function Assignment({ area, unit, range, rangeType, missing = false }: { area: string | null; unit: string | null; range: string | null; rangeType: string | null; missing?: boolean }) {
  if (missing) return <span className="attrition-assignment__missing">Not present in detected month</span>;
  return <span className="attrition-assignment"><strong>{unit || 'Unit not available'}</strong><span>{area || 'Area not available'}</span><span>{range || 'Range not available'}{rangeType ? ` · ${readable(rangeType)}` : ''}</span></span>;
}

export function AttritionMovementsPanel({ client }: { client: AttritionMovementsClient }) {
  const requestId = useRef(0);
  const [result, setResult] = useState(emptyPage);
  const [searchInput, setSearchInput] = useState('');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const firstRecord = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastRecord = Math.min(result.total, result.page * result.pageSize);
  const years = [...new Set(result.availablePeriods.map((period) => Number(period.slice(0, 4))))];

  const load = async (query: AttritionMovementQuery) => {
    const currentRequest = ++requestId.current;
    setBusy(true); setMessage('');
    try {
      const next = await client.list(query);
      if (currentRequest === requestId.current) setResult(next);
    } catch (error) {
      if (currentRequest === requestId.current) setMessage(error instanceof Error ? error.message : 'Attrition movements could not be loaded.');
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  };

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let cancelled = false;
    void client.list(initialQuery).then((page) => { if (!cancelled && currentRequest === requestId.current) setResult(page); }).catch((error: unknown) => { if (!cancelled && currentRequest === requestId.current) setMessage(error instanceof Error ? error.message : 'Attrition movements could not be loaded.'); }).finally(() => { if (!cancelled && currentRequest === requestId.current) setBusy(false); });
    return () => { cancelled = true; };
  }, [client]);

  const selectView = (view: AttritionMovementView) => void load({ ...result, view, page: 1 });
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void load({ ...result, search: searchInput.trim(), page: 1 }); };
  const dismissCandidate = async (item: AttritionMovementItem) => {
    if (!window.confirm(`Remove ${item.persNo} from pending departures as a false positive?`)) return;
    setBusy(true); setMessage('');
    try {
      await client.dismissCandidate(item.id);
      await load({ ...result, page: 1 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The pending departure could not be dismissed.');
      setBusy(false);
    }
  };
  const tabs: { value: AttritionMovementView; label: string; count: number }[] = [
    { value: 'all', label: 'All records', count: result.counts.all },
    { value: 'ps_attrition', label: 'PS attrition', count: result.counts.psAttrition },
    { value: 'within_ps', label: 'Within-PS transfers', count: result.counts.withinPs },
    { value: 'pending', label: 'Pending departures', count: result.counts.pending },
  ];

  return <section className="attrition-movements-panel" aria-labelledby="attrition-movements-title">
    <header className="hrbp-page__heading"><div><p className="hrbp-section__eyebrow">Workforce movement review</p><h2 id="attrition-movements-title">Attrition movements</h2><p>Review finalized PS movements and unresolved departures across reporting periods.</p></div><PsExitImportButton onCommitted={() => load({ ...result, page: 1 })} /></header>
    <div className="data-table-card attrition-movements-table">
      <nav className="attrition-movement-tabs" aria-label="Attrition movement views">{tabs.map((tab) => <button key={tab.value} type="button" className={result.view === tab.value ? 'is-active' : ''} aria-current={result.view === tab.value ? 'page' : undefined} disabled={busy} onClick={() => selectView(tab.value)}><span>{tab.label}</span><strong>{tab.count}</strong></button>)}</nav>
      <div className="attrition-movements-toolbar">
        <form className="attrition-movements-search" role="search" onSubmit={submitSearch}><label><span className="visually-hidden">Search attrition movements</span><input type="search" maxLength={100} value={searchInput} placeholder="Search employee or assignment" onChange={(event) => setSearchInput(event.target.value)} /></label><button className="a-button a-button--primary -small" type="submit" disabled={busy} aria-label="Search attrition movements"><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button></form>
        <div className="attrition-movements-filters"><label><span>Year</span><select value={result.year ?? ''} disabled={busy} onChange={(event) => void load({ ...result, year: event.target.value ? Number(event.target.value) : null, page: 1 })}><option value="">All years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span>Month</span><select value={result.month ?? ''} disabled={busy} onChange={(event) => void load({ ...result, month: event.target.value ? Number(event.target.value) : null, page: 1 })}><option value="">All months</option>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label></div>
      </div>
      {message && <p className="attrition-movements-message" role="alert">{message}</p>}
      <div className="data-table-scroll attrition-movements-scroll"><table className="data-table attrition-movements-grid"><thead><tr className="data-table__column-header"><th scope="col">Period</th><th scope="col">Pers.No</th><th scope="col">Movement</th><th scope="col">Previous assignment</th><th scope="col">Current assignment</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{result.items.length ? result.items.map((item) => <tr key={`${item.recordType}-${item.id}`}><td><span className="attrition-period">{formatMonth(item.month)}</span></td><td><strong className="attrition-pers-no">{item.persNo}</strong></td><td><span className={`attrition-category attrition-category--${item.category}`}>{categoryLabel(item)}</span><small>{item.exitLwd ? `LWD ${item.exitLwd} · ${item.exitReason ?? readable(item.source)}` : item.withinPsType ? readable(item.withinPsType) : item.transferType ? readable(item.transferType) : 'Missing from monthly RBIN'}</small></td><td><Assignment area={item.oldOrganisationalAreaPa} unit={item.oldOrganizationalUnit} range={item.oldRange} rangeType={item.oldRangeType} /></td><td><Assignment area={item.newOrganisationalAreaPa} unit={item.newOrganizationalUnit} range={item.newRange} rangeType={item.newRangeType} missing={item.recordType === 'candidate'} /></td><td><span className={`attrition-status attrition-status--${item.status}`}>{readable(item.status)}</span></td><td>{item.recordType === 'candidate' && item.status === 'pending' && <button className="a-button a-button--integrated -small" type="button" title="Dismiss false positive" aria-label={`Dismiss pending departure ${item.persNo} as a false positive`} disabled={busy} onClick={() => void dismissCandidate(item)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>}</td></tr>) : <tr><td className="hrbp-table__empty" colSpan={7}>{busy ? 'Loading attrition movements...' : 'No attrition movements match these filters.'}</td></tr>}</tbody></table></div>
      <footer className="attrition-movements-pagination"><label><span>Rows</span><select value={result.pageSize} disabled={busy} onChange={(event) => void load({ ...result, pageSize: Number(event.target.value), page: 1 })}>{pageSizes.map((size) => <option key={size}>{size}</option>)}</select></label><span className="attrition-movements-pagination__summary">{firstRecord}-{lastRecord} of {result.total}</span><div><button className="a-button a-button--integrated -small" type="button" aria-label="Previous attrition movement page" disabled={busy || result.page === 1} onClick={() => void load({ ...result, page: result.page - 1 })}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {result.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next attrition movement page" disabled={busy || result.page >= pageCount} onClick={() => void load({ ...result, page: result.page + 1 })}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div></footer>
    </div>
  </section>;
}