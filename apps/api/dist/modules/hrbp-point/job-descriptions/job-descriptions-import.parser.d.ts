import type { JobDescriptionInput } from './job-descriptions.types';
export declare function parseJobDescriptionsCsv(file: {
    originalname: string;
    buffer: Buffer;
}): JobDescriptionInput[];
