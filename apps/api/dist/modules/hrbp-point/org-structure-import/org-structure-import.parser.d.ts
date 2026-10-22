import { type OrgStructureFile, type OrgStructurePreviewRow } from './org-structure-import.types';
export declare function parseOrgStructureFile(file: OrgStructureFile): Promise<OrgStructurePreviewRow[]>;
