'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { MultiSelectFilter } from '@/components/filters/MultiSelectFilter';
import type { OrgStructureRow } from './org-structure.types';
import '@/components/filters/overview-filters.css';
import './org-structure.css';

type TreeNode = { row: OrgStructureRow; parentId: string | null; children: TreeNode[] };
type OrgHierarchy = { roots: TreeNode[]; unlinked: TreeNode[]; expandableIds: string[]; nodes: Map<string, TreeNode> };
type OpenFilter = 'careerLevel' | 'grade' | 'function' | 'layer' | 'status' | null;

const statusOptions = ['Active', 'Inactive'];

const normalizedTitle = (value: string) => value.trim().toLocaleLowerCase();

function sortRows(first: OrgStructureRow, second: OrgStructureRow) {
  if (first.orderBy !== second.orderBy) {
    if (first.orderBy === null) return 1;
    if (second.orderBy === null) return -1;
    return first.orderBy - second.orderBy;
  }
  return first.roleTitle.localeCompare(second.roleTitle, undefined, { sensitivity: 'base' });
}

function buildHierarchy(rows: OrgStructureRow[]): OrgHierarchy {
  const sortedRows = [...rows].sort(sortRows);
  const nodes = new Map(sortedRows.map((row) => [row.id, { row, parentId: null, children: [] } satisfies TreeNode]));
  const titleOwners = new Map<string, OrgStructureRow>();
  for (const row of sortedRows) {
    const title = normalizedTitle(row.roleTitle);
    if (title && !titleOwners.has(title)) titleOwners.set(title, row);
  }

  const candidateParents = new Map<string, string>();
  for (const row of sortedRows) {
    const parent = titleOwners.get(normalizedTitle(row.reportingTo));
    if (parent) candidateParents.set(row.id, parent.id);
  }

  const cycleIds = new Set<string>();
  const processedIds = new Set<string>();
  for (const row of sortedRows) {
    if (processedIds.has(row.id)) continue;
    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: string | undefined = row.id;
    while (current && !processedIds.has(current) && !positions.has(current)) {
      positions.set(current, path.length);
      path.push(current);
      current = candidateParents.get(current);
    }
    if (current && positions.has(current)) {
      path.slice(positions.get(current)).forEach((id) => cycleIds.add(id));
    }
    path.forEach((id) => processedIds.add(id));
  }

  const roots: TreeNode[] = [];
  const unlinked: TreeNode[] = [];
  for (const row of sortedRows) {
    const node = nodes.get(row.id)!;
    const parentId = candidateParents.get(row.id);
    if (!row.reportingTo.trim()) {
      roots.push(node);
    } else if (!parentId || cycleIds.has(row.id)) {
      unlinked.push(node);
    } else {
      node.parentId = parentId;
      nodes.get(parentId)!.children.push(node);
    }
  }

  for (const node of nodes.values()) node.children.sort((first, second) => sortRows(first.row, second.row));
  return {
    roots,
    unlinked,
    expandableIds: [...nodes.values()].filter((node) => node.children.length > 0).map((node) => node.row.id),
    nodes,
  };
}

function includesSearch(row: OrgStructureRow, search: string) {
  if (!search) return true;
  return [row.roleTitle, row.reportingTo, row.jdId, row.careerLevel, row.layer, row.grade, row.function]
    .some((value) => value.toLocaleLowerCase().includes(search));
}

function dynamicOptions(values: string[]) {
  return [...new Set(values.map((value) => value.trim()))]
    .sort((first, second) => {
      if (!first) return 1;
      if (!second) return -1;
      return first.localeCompare(second, undefined, { sensitivity: 'base', numeric: true });
    });
}

function gradeValues(value: string) {
  const values = value.split(',').map((grade) => grade.trim()).filter(Boolean);
  return values.length > 0 ? values : [''];
}

export function OrgStructureView() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<OrgStructureRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<string[]>(['Active']);
  const [careerLevels, setCareerLevels] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [layers, setLayers] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/hrbp-point/org-structure', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(body?.message ?? 'Could not load the org structure.');
        }
        return response.json() as Promise<OrgStructureRow[]>;
      })
      .then((result) => {
        setRows(result);
        setCareerLevels(dynamicOptions(result.map((row) => row.careerLevel)));
        setGrades(dynamicOptions(result.flatMap((row) => gradeValues(row.grade))));
        setFunctions(dynamicOptions(result.map((row) => row.function)));
        setLayers(dynamicOptions(result.map((row) => row.layer)));
        setExpanded(new Set());
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load the org structure.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!openFilter) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setOpenFilter(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [openFilter]);

  const careerLevelOptions = dynamicOptions(rows.map((row) => row.careerLevel));
  const gradeOptions = dynamicOptions(rows.flatMap((row) => gradeValues(row.grade)));
  const functionOptions = dynamicOptions(rows.map((row) => row.function));
  const layerOptions = dynamicOptions(rows.map((row) => row.layer));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchesStatus = (row: OrgStructureRow) => {
    return statuses.includes(row.isActive ? 'Active' : 'Inactive');
  };
  const hierarchy = buildHierarchy(rows);
  const eligibleIds = new Set(rows.filter((row) => matchesStatus(row)
    && careerLevels.includes(row.careerLevel.trim())
    && gradeValues(row.grade).some((grade) => grades.includes(grade))
    && functions.includes(row.function.trim())
    && layers.includes(row.layer.trim())).map((row) => row.id));
  const matchingIds = new Set(rows.filter((row) => eligibleIds.has(row.id)
    && includesSearch(row, normalizedSearch)).map((row) => row.id));
  if (normalizedSearch) {
    const addDescendants = (node: TreeNode) => {
      for (const child of node.children) {
        if (eligibleIds.has(child.row.id)) matchingIds.add(child.row.id);
        addDescendants(child);
      }
    };
    [...matchingIds].forEach((id) => addDescendants(hierarchy.nodes.get(id)!));
  }
  const visibleIds = new Set(matchingIds);
  for (const id of matchingIds) {
    let parentId = hierarchy.nodes.get(id)?.parentId ?? null;
    while (parentId && !visibleIds.has(parentId)) {
      visibleIds.add(parentId);
      parentId = hierarchy.nodes.get(parentId)?.parentId ?? null;
    }
  }
  const matchingRows = matchingIds.size;

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number, unlinked = false) => {
    if (!visibleIds.has(node.row.id)) return null;
    const visibleChildren = node.children.filter((child) => visibleIds.has(child.row.id));
    const isExpanded = Boolean(normalizedSearch) || expanded.has(node.row.id);
    const role = node.row;
    const rowClass = [role.isActive ? '' : 'is-inactive', matchingIds.has(role.id) ? '' : 'is-context', unlinked ? 'is-unlinked' : ''].filter(Boolean).join(' ');
    return <Fragment key={role.id}>
      <tr className={rowClass}>
        <td data-label="Role Title">
          <div className="org-tree__role" style={{ '--tree-depth': depth } as CSSProperties}>
            {visibleChildren.length > 0 ? <button type="button" className="org-tree__toggle" onClick={() => toggle(role.id)} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${role.roleTitle || 'untitled role'}`} aria-expanded={isExpanded}>
              <i className={`a-icon ${isExpanded ? 'boschicon-bosch-ic-up' : 'boschicon-bosch-ic-down'}`} aria-hidden="true" />
            </button> : <span className="org-tree__spacer" />}
            <span><strong>{role.roleTitle || 'Untitled role'}</strong><small>{role.reportingTo ? `Reports to ${role.reportingTo}` : 'Top-level role'}</small></span>
          </div>
        </td>
        <td data-label="JD ID">{role.jdId || '-'}</td>
        <td data-label="Career Level">{role.careerLevel || '-'}</td>
        <td data-label="Grade">{role.grade || '-'}</td>
        <td data-label="Function">{role.function || '-'}</td>
        <td data-label="Layer">{role.layer || '-'}</td>
        <td data-label="Order">{role.orderBy ?? '-'}</td>
        <td data-label="Status"><span className={`org-tree__status ${role.isActive ? 'is-active' : 'is-inactive'}`}>{role.isActive ? 'Active' : 'Inactive'}</span></td>
      </tr>
      {isExpanded && visibleChildren.map((child) => renderNode(child, depth + 1, unlinked))}
    </Fragment>;
  };

  if (loading) return <main className="dashboard-state dashboard-state--loading"><i className="a-icon boschicon-bosch-ic-refresh" aria-hidden="true" /><h1>Org Structure</h1><p>Loading reporting relationships...</p></main>;
  if (error) return <main className="dashboard-state"><i className="a-icon boschicon-bosch-ic-alert-error" aria-hidden="true" /><h1>Org Structure</h1><p>{error}</p></main>;

  return <main className="org-structure-page">
    <header className="org-structure-page__header">
      <div><p className="org-structure-page__eyebrow">Organization</p><h1>Org Structure</h1><p>Explore role-to-role reporting relationships and position details.</p></div>
      <div className="org-structure-page__count"><strong>{rows.length}</strong><span>roles</span></div>
    </header>

    <section className="org-tree" aria-labelledby="org-tree-title">
      <div className="org-tree__toolbar" ref={toolbarRef}>
        <label className="org-tree__search"><i className="a-icon boschicon-bosch-ic-search" aria-hidden="true" /><span className="visually-hidden">Search roles</span><input type="search" value={search} placeholder="Search Role Title, Reporting To, or JD ID..." onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="org-tree__filters">
          <MultiSelectFilter id="org-structure-career-level" label="Career Level" options={careerLevelOptions} value={careerLevels} isOpen={openFilter === 'careerLevel'} onToggle={() => setOpenFilter((current) => current === 'careerLevel' ? null : 'careerLevel')} onClose={() => setOpenFilter(null)} onChange={setCareerLevels} formatOption={(value) => value || 'Not specified'} />
          <MultiSelectFilter id="org-structure-grade" label="Grade" options={gradeOptions} value={grades} isOpen={openFilter === 'grade'} onToggle={() => setOpenFilter((current) => current === 'grade' ? null : 'grade')} onClose={() => setOpenFilter(null)} onChange={setGrades} formatOption={(value) => value || 'Not specified'} />
          <MultiSelectFilter id="org-structure-function" label="Function" options={functionOptions} value={functions} isOpen={openFilter === 'function'} onToggle={() => setOpenFilter((current) => current === 'function' ? null : 'function')} onClose={() => setOpenFilter(null)} onChange={setFunctions} formatOption={(value) => value || 'Not specified'} />
          <MultiSelectFilter id="org-structure-layer" label="Layer" options={layerOptions} value={layers} isOpen={openFilter === 'layer'} onToggle={() => setOpenFilter((current) => current === 'layer' ? null : 'layer')} onClose={() => setOpenFilter(null)} onChange={setLayers} formatOption={(value) => value || 'Not specified'} />
          <MultiSelectFilter id="org-structure-status" label="Status" options={statusOptions} value={statuses} isOpen={openFilter === 'status'} onToggle={() => setOpenFilter((current) => current === 'status' ? null : 'status')} onClose={() => setOpenFilter(null)} onChange={setStatuses} />
        </div>
        <div className="org-tree__commands">
          <button type="button" className="a-button a-button--secondary -small" onClick={() => setExpanded(new Set(hierarchy.expandableIds))}><span className="a-button__label">Expand all</span></button>
          <button type="button" className="a-button a-button--secondary -small" onClick={() => setExpanded(new Set())}><span className="a-button__label">Collapse all</span></button>
        </div>
      </div>

      <div className="org-tree__meta"><h2 id="org-tree-title">Reporting hierarchy</h2><span>{matchingRows} matching roles</span></div>
      {!rows.length ? <div className="org-tree__empty"><h2>No org structure imported</h2><p>Import the current workbook from HRBP Point to populate this page.</p></div>
        : matchingRows === 0 ? <div className="org-tree__empty"><h2>No matching roles</h2><p>Adjust the search or active-status filter.</p></div>
        : <>
          {hierarchy.roots.some((node) => visibleIds.has(node.row.id)) && <div className="org-tree__table-wrap"><table className="org-tree__table"><thead><tr><th>Role Title / Reporting To</th><th>JD ID</th><th>Career Level</th><th>Grade</th><th>Function</th><th>Layer</th><th>Order</th><th>Status</th></tr></thead><tbody>{hierarchy.roots.map((node) => renderNode(node, 0))}</tbody></table></div>}
          {hierarchy.unlinked.some((node) => visibleIds.has(node.row.id)) && <section className="org-tree__unlinked" aria-labelledby="org-tree-unlinked-title">
            <div><h2 id="org-tree-unlinked-title">Unlinked roles</h2><p>These branches reference a missing reporting role or contain a cyclic reporting relationship.</p></div>
            <div className="org-tree__table-wrap"><table className="org-tree__table"><thead><tr><th>Role Title / Reporting To</th><th>JD ID</th><th>Career Level</th><th>Grade</th><th>Function</th><th>Layer</th><th>Order</th><th>Status</th></tr></thead><tbody>{hierarchy.unlinked.map((node) => renderNode(node, 0, true))}</tbody></table></div>
          </section>}
        </>}
    </section>
  </main>;
}