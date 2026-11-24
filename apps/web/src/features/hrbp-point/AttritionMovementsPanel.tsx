'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AttritionMovementItem,
  AttritionMovementQuery,
  AttritionMovementsClient,
  AttritionMovementsPage,
  AttritionMovementView,
  ConfirmPendingCandidateInput,
  PendingAttritionCandidate,
} from './attrition-movements.types';
import { PsExitImportButton } from './PsExitImportButton';

const pageSizes = [10, 25, 50] as const;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const initialQuery: AttritionMovementQuery = { view: 'all', search: '', year: null, month: null, page: 1, pageSize: 25 };
const emptyPage: AttritionMovementsPage = { items: [], total: 0, counts: { all: 0, psAttrition: 0, withinPs: 0, pending: 0, withinPsBreakdown: { plantToPlant: 0, plantToCorp: 0, corpToPlant: 0, corpToCorp: 0 } }, availablePeriods: [], ...initialQuery };

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

function CandidateDrawer({ candidate, loading, saving, error, onClose, onConfirm }: {
  candidate: PendingAttritionCandidate | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (input: ConfirmPendingCandidateInput) => Promise<void>;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const [form, setForm] = useState<ConfirmPendingCandidateInput>({ exitLwd: '', movementType: 'resignation', exitReason: '', notes: '' });
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    closeButton.current?.focus();
    document.addEventListener('keydown', containFocus);
    return () => { document.removeEventListener('keydown', containFocus); previousFocus?.focus(); };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (candidate) await onConfirm(form);
  };

  return <div className="attrition-confirmation-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) onClose(); }}>
    <aside ref={drawer} className="attrition-confirmation-drawer" role="dialog" aria-modal="true" aria-labelledby="attrition-confirmation-title" aria-busy={loading || saving}>
      <header className="attrition-confirmation-drawer__header"><div><span>Pending departure</span><h2 id="attrition-confirmation-title">Confirm attrition</h2></div><button ref={closeButton} className="a-button a-button--integrated" type="button" title="Close" aria-label="Close confirmation drawer" disabled={saving} onClick={onClose}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header>
      {loading && <p className="attrition-confirmation-drawer__status" role="status">Loading latest candidate details...</p>}
      {!loading && candidate && <form className="attrition-confirmation-form" onSubmit={(event) => void submit(event)}>
        <section className="attrition-confirmation-summary" aria-label="Candidate details"><dl><div><dt>Pers.No</dt><dd>{candidate.persNo}</dd></div><div><dt>Employee Name</dt><dd>{candidate.employeeName || 'Not available'}</dd></div><div><dt>Detected period</dt><dd>{formatMonth(candidate.detectedMonth)}</dd></div><div><dt>Source</dt><dd>{readable(candidate.source)}</dd></div><div><dt>Previous Area</dt><dd>{candidate.previousOrganisationalAreaPa || 'Not available'}</dd></div><div><dt>Previous Org Unit</dt><dd>{candidate.previousOrganizationalUnit || 'Not available'}</dd></div><div><dt>Previous Range</dt><dd>{candidate.previousRange || 'Not available'}</dd></div><div><dt>Previous Range Type</dt><dd>{readable(candidate.previousRangeType)}</dd></div></dl></section>
        <div className="attrition-confirmation-form__fields"><label><span>Last working day (LWD)</span><input type="date" required max={today} value={form.exitLwd} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, exitLwd: event.target.value }))} /></label><label><span>Movement type</span><select required value={form.movementType} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, movementType: event.target.value as ConfirmPendingCandidateInput['movementType'] }))}><option value="resignation">Resignation</option><option value="retirement">Retirement</option><option value="transfer">Transfer out of PS / RBIN</option></select></label><label><span>Exit reason</span><input type="text" required value={form.exitReason} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, exitReason: event.target.value }))} /></label><label><span>Notes <small>Optional</small></span><textarea maxLength={1000} rows={4} value={form.notes} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /><small>{form.notes.length}/1000</small></label></div>
        {error && <p className="attrition-confirmation-drawer__error" role="alert">{error}</p>}
        <footer className="attrition-confirmation-drawer__footer"><button className="a-button a-button--secondary" type="button" disabled={saving} onClick={onClose}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={saving}><span className="a-button__label">{saving ? 'Confirming...' : 'Confirm attrition'}</span></button></footer>
      </form>}
      {!loading && !candidate && error && <p className="attrition-confirmation-drawer__error" role="alert">{error}</p>}
    </aside>
  </div>;
}

export function AttritionMovementsPanel({ client }: { client: AttritionMovementsClient }) {
  const requestId = useRef(0);
  const [result, setResult] = useState(emptyPage);
  const [searchInput, setSearchInput] = useState('');
  const [busy, setBusy] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [drawerCandidate, setDrawerCandidate] = useState<PendingAttritionCandidate | null>(null);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError] = useState('');
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

  useEffect(() => {
    if (!drawerCandidateId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !drawerSaving) {
        setDrawerCandidateId(null);
        setDrawerCandidate(null);
        setDrawerError('');
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [drawerCandidateId, drawerSaving]);

  const selectView = (view: AttritionMovementView) => void load({ ...result, view, page: 1 });
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void load({ ...result, search: searchInput.trim(), page: 1 }); };
  const closeDrawer = () => {
    if (!drawerSaving) {
      setDrawerCandidateId(null);
      setDrawerCandidate(null);
      setDrawerError('');
    }
  };
  const openCandidate = async (candidateId: string) => {
    setDrawerCandidateId(candidateId);
    setDrawerCandidate(null);
    setDrawerError('');
    setDrawerLoading(true);
    try {
      setDrawerCandidate(await client.getPendingCandidate(candidateId));
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : 'The pending departure details could not be loaded.');
    } finally {
      setDrawerLoading(false);
    }
  };
  const confirmCandidate = async (input: ConfirmPendingCandidateInput) => {
    if (!drawerCandidateId) return;
    setDrawerSaving(true);
    setDrawerError('');
    try {
      await client.confirmPendingCandidate(drawerCandidateId, input);
      setDrawerCandidateId(null);
      setDrawerCandidate(null);
      await load({ ...result, page: 1 });
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : 'The pending departure could not be confirmed.');
    } finally {
      setDrawerSaving(false);
    }
  };
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
  const exportConfirmedHistory = async () => {
    setExportBusy(true); setMessage('');
    try {
      const exported = await client.exportConfirmedHistory();
      setMessage(`${exported.fileName} downloaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Confirmed attrition history could not be exported.');
    } finally {
      setExportBusy(false);
    }
  };
  const tabs: { value: AttritionMovementView; label: string; count: number }[] = [
    { value: 'all', label: 'All records', count: result.counts.all },
    { value: 'ps_attrition', label: 'PS attrition', count: result.counts.psAttrition },
    { value: 'within_ps', label: 'Within-PS transfers', count: result.counts.withinPs },
    { value: 'pending', label: 'Pending departures', count: result.counts.pending },
  ];
  const breakdown = result.counts.withinPsBreakdown;
  const withinBreakdown: [string, number][] = [
    ['Plant → Plant', breakdown.plantToPlant],
    ['Plant → Corp', breakdown.plantToCorp],
    ['Corp → Plant', breakdown.corpToPlant],
    ['Corp → Corp', breakdown.corpToCorp],
  ];

  return <section className="attrition-movements-panel" aria-labelledby="attrition-movements-title">    <header className="hrbp-page__heading"><div><p className="hrbp-section__eyebrow">Workforce movement review</p><h2 id="attrition-movements-title">Attrition movements</h2><p>Review finalized PS movements and unresolved departures across reporting periods.</p></div><div className="attrition-movements-actions"><button className="a-button a-button--secondary -small" type="button" aria-label="Export confirmed attrition history" disabled={exportBusy} onClick={() => void exportConfirmedHistory()}><i className="a-icon a-button__icon boschicon-bosch-ic-download" aria-hidden="true" /><span className="a-button__label">{exportBusy ? 'Preparing...' : 'Export history'}</span></button><PsExitImportButton onCommitted={() => load({ ...result, page: 1 })} /></div></header>
    <div className="data-table-card attrition-movements-table">
      <nav className="attrition-movement-tabs" aria-label="Attrition movement views">{tabs.map((tab) => <button key={tab.value} type="button" className={result.view === tab.value ? 'is-active' : ''} aria-current={result.view === tab.value ? 'page' : undefined} disabled={busy} onClick={() => selectView(tab.value)}><span>{tab.label}</span><strong>{tab.count}</strong>{tab.value === 'within_ps' && <small className="attrition-movement-breakdown">{withinBreakdown.map(([label, count]) => <span key={label}>{label}<b>{count}</b></span>)}</small>}</button>)}</nav>
      <div className="attrition-movements-toolbar">
        <form className="attrition-movements-search" role="search" onSubmit={submitSearch}><label><span className="visually-hidden">Search attrition movements</span><input type="search" maxLength={100} value={searchInput} placeholder="Search employee or assignment" onChange={(event) => setSearchInput(event.target.value)} /></label><button className="a-button a-button--primary -small" type="submit" disabled={busy} aria-label="Search attrition movements"><i className="a-icon a-button__icon boschicon-bosch-ic-search" aria-hidden="true" /></button></form>
        <div className="attrition-movements-filters"><label><span>Year</span><select value={result.year ?? ''} disabled={busy} onChange={(event) => void load({ ...result, year: event.target.value ? Number(event.target.value) : null, page: 1 })}><option value="">All years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span>Month</span><select value={result.month ?? ''} disabled={busy} onChange={(event) => void load({ ...result, month: event.target.value ? Number(event.target.value) : null, page: 1 })}><option value="">All months</option>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label></div>
      </div>
      {message && <p className="attrition-movements-message" role="alert">{message}</p>}
      <div className="data-table-scroll attrition-movements-scroll"><table className="data-table attrition-movements-grid"><thead><tr className="data-table__column-header"><th scope="col">Period</th><th scope="col">Pers.No / Employee Name</th><th scope="col">Movement</th><th scope="col">Previous assignment</th><th scope="col">Current assignment</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{result.items.length ? result.items.map((item) => <tr key={`${item.recordType}-${item.id}`}><td><span className="attrition-period">{formatMonth(item.month)}</span></td><td><span className="attrition-employee"><strong className="attrition-pers-no">{item.persNo}</strong><small>{item.employeeName || 'Not available'}</small></span></td><td><span className={`attrition-category attrition-category--${item.category}`}>{categoryLabel(item)}</span><small>{item.exitLwd ? `LWD ${item.exitLwd} · ${item.exitReason ?? readable(item.source)}` : item.withinPsType ? readable(item.withinPsType) : item.transferType ? readable(item.transferType) : 'Missing from monthly RBIN'}</small></td><td><Assignment area={item.oldOrganisationalAreaPa} unit={item.oldOrganizationalUnit} range={item.oldRange} rangeType={item.oldRangeType} /></td><td><Assignment area={item.newOrganisationalAreaPa} unit={item.newOrganizationalUnit} range={item.newRange} rangeType={item.newRangeType} missing={item.recordType === 'candidate'} /></td><td><span className={`attrition-status attrition-status--${item.status}`}>{readable(item.status)}</span></td><td>{item.recordType === 'candidate' && item.status === 'pending' && <div className="hrbp-table__actions"><button className="a-button a-button--integrated -small" type="button" title="Confirm attrition" aria-label={`Confirm pending departure ${item.persNo}`} disabled={busy} onClick={() => void openCandidate(item.id)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" title="Dismiss false positive" aria-label={`Dismiss pending departure ${item.persNo} as a false positive`} disabled={busy} onClick={() => void dismissCandidate(item)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></div>}</td></tr>) : <tr><td className="hrbp-table__empty" colSpan={7}>{busy ? 'Loading attrition movements...' : 'No attrition movements match these filters.'}</td></tr>}</tbody></table></div>
      <footer className="attrition-movements-pagination"><label><span>Rows</span><select value={result.pageSize} disabled={busy} onChange={(event) => void load({ ...result, pageSize: Number(event.target.value), page: 1 })}>{pageSizes.map((size) => <option key={size}>{size}</option>)}</select></label><span className="attrition-movements-pagination__summary">{firstRecord}-{lastRecord} of {result.total}</span><div><button className="a-button a-button--integrated -small" type="button" aria-label="Previous attrition movement page" disabled={busy || result.page === 1} onClick={() => void load({ ...result, page: result.page - 1 })}><i className="a-icon a-button__icon boschicon-bosch-ic-back-left" aria-hidden="true" /></button><span>Page {result.page} of {pageCount}</span><button className="a-button a-button--integrated -small" type="button" aria-label="Next attrition movement page" disabled={busy || result.page >= pageCount} onClick={() => void load({ ...result, page: result.page + 1 })}><i className="a-icon a-button__icon boschicon-bosch-ic-forward-right" aria-hidden="true" /></button></div></footer>
    </div>
    {drawerCandidateId && <CandidateDrawer candidate={drawerCandidate} loading={drawerLoading} saving={drawerSaving} error={drawerError} onClose={closeDrawer} onConfirm={confirmCandidate} />}
  </section>;
}