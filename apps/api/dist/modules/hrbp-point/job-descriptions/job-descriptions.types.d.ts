export type JobDescription = {
    id: string;
    jdId: string;
    roleTitle: string;
    updatedAt: string;
};
export type JobDescriptionPage = {
    items: JobDescription[];
    total: number;
    page: number;
    pageSize: number;
    search: string;
};
export type JobDescriptionInput = {
    jdId: string;
    roleTitle: string;
};
