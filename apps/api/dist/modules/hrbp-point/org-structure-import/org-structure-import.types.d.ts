export declare const requiredOrgStructureColumns: readonly ["role_title", "reporting_to", "jd_id", "career_level", "layer", "order_by", "is_active"];
export declare const optionalOrgStructureColumns: readonly ["grade", "function"];
export declare const orgStructureColumns: readonly ["role_title", "reporting_to", "jd_id", "career_level", "layer", "order_by", "is_active", "grade", "function"];
export type OrgStructureColumn = (typeof orgStructureColumns)[number];
export type OrgStructureValues = Record<OrgStructureColumn, string>;
export type OrgStructurePreviewRow = {
    rowNumber: number;
    values: OrgStructureValues;
};
export type OrgStructureFile = {
    originalname: string;
    buffer: Buffer;
};
